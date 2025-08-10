import { createClerkClient } from '@clerk/backend';
import { and, eq } from 'drizzle-orm';
import { z } from 'zod';
import {
  type User,
  type Group,
  type Tournie,
  db,
  tourniesTable,
  usersTable,
} from '../db';
import { env } from '../env';
import { asyncPipe, tryAsync, Result } from '../src/util';

const clerk = createClerkClient({
  secretKey: env.CLERK_SECRET_KEY,
  publishableKey: env.VITE_CLERK_PUBLISHABLE_KEY,
});

const get_clerk_user_by_username = (username: string) =>
  clerk.users.getUserList({ username: [username] })
    .then(page => page.data[0] as typeof page.data[number] | undefined);

const authenticate = async (req: Request) => {
  const status_result = await tryAsync(() => clerk.authenticateRequest(req, {
    authorizedParties: ['https://tournieggi.jmnuf.app', 'https://jmnuf.app', 'http://localhost:8080'],
  }));
  if (!status_result.ok) return [false] as const;
  const status = status_result.value;
  if (!status.isAuthenticated) return [false] as const;
  return [status.toAuth(), status] as const;
}

const Group_Schema = z.object({
  name: z.string(),
  teams: z.array(z.int32()),
}) satisfies { parse(v: any): Group };

const Tournie_Schema = z.object({
  name: z.string().min(1),
  teams: z.array(z.string().min(1)).nonempty().refine(arg => new Set(arg)),
  groups: z.array(Group_Schema),
  knockout_games: z.array(z.string().min(1)).optional().default([]),
}) satisfies { parse(v: any): Omit<Tournie, 'id' | 'ownerId'> };
export type Update_Tournie = z.infer<typeof Tournie_Schema>;

type Splat<T> = { [K in keyof T]: T[K] } & unknown;

type PathParams<Path extends `/${string}`, Params extends Record<string, string> = {}> = Path extends '' | '/'
  ? Splat<Params>
  : Path extends `/:${infer Name extends string}/${infer Rest extends string}`
  ? PathParams<`/${Rest}`, Params & { [K in Name]: string }>
  : Path extends `/${string}/${infer Next extends string}`
  ? PathParams<`/${Next}`, Params>
  : Path extends `/:${infer Name extends string}`
  ? Splat<Params & { [K in Name]: string }>
  : Splat<Params>;

export type IdP = PathParams<`/api/tournie/:id`>;
type Foo<Path extends `/${string}`, Molecule extends string[]> =
  Path extends '/'
  ? Molecule
  : Path extends `/:${infer Head extends string}/${infer Tail extends `${string}`}`
  ? Foo<`/${Tail}`, [Head, ...Molecule]>
  : Path extends `/${string}/${infer Tail extends `${string}`}`
  ? Foo<`/${Tail}`, Molecule>
  : Path extends `/:${infer Name extends string}`
  ? [Name, ...Molecule]
  : Molecule;
export type Bar = Foo<`/api/tournie/:id`, []>;
export type Baz = Foo<`/api/tournie/id`, []>;

type RouteHandler<Path extends `/${string}`> = (request: Request, params: PathParams<Path>) => Response | Promise<Response>;

interface Route<Path extends `/${string}`> {
  GET?: RouteHandler<Path>;
  POST?: RouteHandler<Path>;
}
type RouteBuilder<R extends Route<`/${string}`>> = {
  [K in keyof R as K extends string ? Lowercase<K> : never]-?: (fn: NonNullable<R[K]>) => RouteBuilder<R>;
} & { build(): R };

type RoutesBuilder<R extends Record<string, Route<`/${string}`>> = {}> = {
  add<Path extends `/${string}`, GenRoute extends Route<Path>>(
    path: Path,
    fn: (b: RouteBuilder<Route<Path>>) => GenRoute,
  ): RoutesBuilder<R & { [K in Path]: GenRoute }>;
  build(): Splat<R>;
};

const routes_builder = () => {
  const routes: Record<string, Route<`/${string}`>> = {};
  const builder: RoutesBuilder = {
    add<Path extends `/${string}`>(path: Path, fn: (b: RouteBuilder<Route<Path>>) => Route<Path>) {
      routes[path] = fn(route_builder<Path>());
      return builder as any;
    },
    build() {
      return routes;
    }
  };
  return builder;
};

const route_builder = <Path extends `/${string}`>() => {
  const methods = {} as Route<Path>;
  const builder: RouteBuilder<Route<Path>> = {
    get(fn) {
      methods.GET = fn;
      return builder as any;
    },
    post(fn) {
      methods.POST = fn;
      return builder as any;
    },
    build() {
      return methods;
    },
  };
  return builder;
};

export interface UserData {
  id: User['id'];
  username: string;
  image_url: string;
  tournies: Array<{ id: Tournie['id']; name: Tournie['name']; }>;
}

export interface TournieData extends Tournie {
  owner: Pick<UserData, 'id' | 'username' | 'image_url'>;
}

async function get_user_data_by_id(id: User['id']): Promise<Result<UserData, { code: number; message: string }>> {
  const [user_result, tournies_result] = await Promise.all([
    tryAsync(() => db.select()
      .from(usersTable)
      .where(eq(usersTable.id, id as any))),
    tryAsync(() => db.select({ id: tourniesTable.id, name: tourniesTable.name })
      .from(tourniesTable)
      .where(eq(tourniesTable.ownerId, id))),
  ]);
  if (!user_result.ok) return Result.Err({ code: 500, message: user_result.error.message });
  const tbl_user = user_result.value[0];
  const clerk_result = await tryAsync(() => get_clerk_user_by_username(tbl_user.username));
  if (!clerk_result.ok) return Result.Err({ code: 500, message: clerk_result.error.message });
  const clerk_user = clerk_result.value;
  if (!clerk_user) return Result.Err({ code: 500, message: 'Username not saved in clerk service, contact support' });
  if (!tbl_user.username) {
    await tryAsync(
      () => db.update(usersTable)
        .set({ username: clerk_user.username! })
        .where(eq(usersTable.id, tbl_user.id))
    );
    tbl_user.username = clerk_user.username!;
  }

  const username = tbl_user.username;
  const image_url = clerk_user.imageUrl;
  const tournies = tournies_result.ok ? tournies_result.value : [];
  return Result.Ok({ id: tbl_user.id, username, image_url, tournies });
}

async function get_user_data_by_username(username: string): Promise<Result<UserData, { code: number; message: string }>> {
  const user_id_result = await tryAsync<User['id'] | undefined>(
    () => db.select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.username, username))
      .then(list => list[0]?.id)
  );
  if (!user_id_result.ok) return Result.Err({ code: 500, message: user_id_result.error.message });
  const user_id = user_id_result.value;
  if (user_id === undefined) return Result.Err({ code: 400, message: 'Unable to find user' });
  return await get_user_data_by_id(user_id);
}

const get_username_from_clerk_id = (id: string) =>
  asyncPipe(
    clerk.users.getUser(id),
    user => user.username!
  );

const get_user_from_clerk_id = <TKeys extends Array<keyof User>>(id: string, keys: TKeys): Promise<Splat<Pick<User, TKeys[number]>> | undefined> =>
  asyncPipe(
    get_username_from_clerk_id(id),
    (username) =>
      db.select(
        keys.reduce((acc, k) => {
          (acc as any)[k] = usersTable[k];
          return acc;
        }, {} as { [K in TKeys[number]]: (typeof usersTable)[K] })
      )
        .from(usersTable)
        .where(eq(usersTable.username, username))
        .then(list => list[0] as any),
  );

const routes = routes_builder()
  .add(
    '/api/tournies',
    b => b
      .get(async (req) => {
        const result = await tryAsync<Response>(async () => {
          const [auth] = await authenticate(req);
          if (auth === false) return Response.json({ message: 'Not authed' }, { status: 401 });

          const clerk_user_result = await tryAsync(() => clerk.users.getUser(auth.userId));
          if (!clerk_user_result.ok) return Response.json({ message: clerk_user_result.error.message }, { status: 500 });
          const username = clerk_user_result.value.username!;

          const db_id_result = await tryAsync(
            () =>
              db.select({ id: usersTable.id })
                .from(usersTable)
                .where(eq(usersTable.username, username))
                .then(list => list[0]?.id as User['id'] | undefined)
          );
          if (!db_id_result.ok) return Response.json({ message: db_id_result.error.message }, { status: 500 });
          const userId = db_id_result.value;
          if (!userId) return Response.json({ message: `No saved user with username ${username}` }, { status: 400 });

          const tournies = await db.select({ id: tourniesTable.id, name: tourniesTable.name })
            .from(tourniesTable)
            .where(eq(tourniesTable.ownerId, userId));

          return Response.json({ list: tournies, count: tournies.length }, { status: 200 });
        });
        if (result.ok) return result.value;
        console.error(result.error);
        return Response.json({ message: 'Failed to fetch your tournies' }, { status: 500 })
      })

      .post(async (req) => {
        const result = await tryAsync<Response>(async () => {
          const [auth] = await authenticate(req);
          const json_result = await tryAsync(() => req.json());
          if (!json_result.ok) return Response.json({ message: 'Body is not json' }, { status: 405 });
          const json = json_result.value;
          if (auth === false) return Response.json({ message: 'Not authed' }, { status: 401 });
          const parse_result = Tournie_Schema.safeParse(json);
          if (parse_result.error) {
            const e = parse_result.error;
            const flat = z.treeifyError(e);
            return Response.json({ message: 'Incorrect shape', errors: flat.errors, props: flat.properties }, { status: 400 });
          }
          const data = parse_result.data;

          const user_result = await tryAsync(
            () => get_user_from_clerk_id(auth.userId, ['id', 'username'])
          );
          if (!user_result.ok) return Response.json({ message: user_result.error.message }, { status: 500 });
          const user = user_result.value;
          if (!user) return Response.json({ message: 'No user found' }, { status: 400 });

          const check_result = await tryAsync(
            () =>
              db.select({ id: tourniesTable.id })
                .from(tourniesTable)
                .where(and(eq(tourniesTable.name, data.name), eq(tourniesTable.ownerId, user.id)))
          );
          if (check_result.ok) {
            if (check_result.value.length > 0) {
              return Response.json({ message: 'Tournie name already in use' }, { status: 400 });
            }
          }

          const insert_result = await tryAsync(
            () =>
              db.insert(tourniesTable)
                .values({
                  ownerId: user.id,
                  name: data.name,
                  groups: data.groups,
                  teams: data.teams,
                  knockout_games: data.knockout_games ?? [],
                })
                .returning({ id: tourniesTable.id })
          );
          if (!insert_result.ok) {
            return Response.json({ message: 'Failed to create tournie: ' + insert_result.error.message }, { status: 500 });
          }

          const tournie = insert_result.value[0].id;
          if (!tournie) {
            return Response.json({ message: 'Failed to create tournie' });
          }

          return Response.json({ id: tournie, message: `Created new tournie` }, { status: 500 })
        });
        if (result.ok) return result.value;
        return Response.json({ message: result.error.message }, { status: 500 })
      })
      .build()
  )

  .add(
    '/api/tournie-from-names/:username/:tournie_name',
    b => b
      .get(async (_, params) => {
        const user_result = await get_user_data_by_username(params.username);
        if (!user_result.ok) return Response.json({ message: user_result.error.message }, { status: user_result.error.code });
        const user = user_result.value;

        const t = user.tournies.find(t => t.name === params.tournie_name);
        if (!t) return Response.json({ message: `No tournie with name ${params.tournie_name} with owner ${params.username} was found` }, { status: 404 });

        const select_result = await tryAsync<Tournie>(
          () => db.select()
            .from(tourniesTable)
            .where(eq(tourniesTable.id, t.id))
            .then(list => list[0])
        );
        if (!select_result.ok) return Response.json({ message: select_result.error.message }, { status: 500 });
        const data = select_result.value;

        const tournie: TournieData = Object.assign({
          owner: {
            id: user.id,
            username: user.username,
            image_url: user.image_url,
          },
        } satisfies Omit<TournieData, keyof typeof data>, data);
        return Response.json({ tournie });
      })
      .build()
  )

  .add(
    '/api/tournie/:id',
    b => b
      .get(async (_, params) => {
        const result = await tryAsync<Tournie | undefined>(
          () =>
            db.select()
              .from(tourniesTable)
              .where(eq(tourniesTable.id, params.id as any))
              .then(values => values[0])
        );
        if (!result.ok) {
          const err = result.error;
          console.error(err);
          return Response.json({ message: err.message }, { status: 500 });
        }
        const data = result.value;
        if (!data) {
          return Response.json({ message: 'Tournie with given id does not exist' }, { status: 200 });
        }
        const user_result = await tryAsync<User | undefined>(
          () =>
            db.select()
              .from(usersTable)
              .where(eq(usersTable.id, data.ownerId))
              .then(list => list[0])
        );
        if (!user_result.ok) return Response.json({ message: user_result.error.message }, { status: 500 });
        const user = user_result.value;
        if (!user) return Response.json({ message: 'No user found with id: ' + data.ownerId }, { status: 400 });

        const tournie: TournieData = Object.assign({
          owner: {
            id: user.id,
            username: user.username,
            image_url: user.image_url,
          },
        } satisfies Omit<TournieData, keyof typeof data>, data);
        return Response.json({ tournie });
      })

      .post(async (req, params) => {
        const json_result = await tryAsync<z.infer<typeof Tournie_Schema>>(() => req.json().then(data => Tournie_Schema.parse(data)));
        if (!json_result.ok) return Response.json({ message: json_result.error.message }, { status: 400 });
        const json = json_result.value;

        const [auth] = await authenticate(req);
        if (auth === false) return Response.json({ message: 'Not authenticated' }, { status: 401 });

        const owner_id_result = await tryAsync(
          () => get_user_from_clerk_id(auth.userId, ['id']).then(t => t?.id)
        );
        if (!owner_id_result.ok) return Response.json({ message: owner_id_result.error.message }, { status: 500 });
        const ownerId = owner_id_result.value;
        if (!ownerId) return Response.json({ message: 'Invalid user auth' }, { status: 400 });

        const id = params.id;

        {
          const count_result = await tryAsync(
            () => db.$count(db.select()
              .from(tourniesTable)
              .where(and(eq(tourniesTable.id, id as Tournie['id']), eq(tourniesTable.ownerId, ownerId))))
          );
          if (!count_result.ok) return Response.json({ message: 'Failed to check if tournie exists' }, { status: 500 });
          const count = count_result.value;
          if (count == 0) return Response.json({ message: 'Tournie with given id does not exist' }, { status: 400 });
        }

        const update_result = await tryAsync<Tournie>(
          () =>
            db.update(tourniesTable)
              .set(Object.assign({ ownerId }, json))
              .returning()
              .then(list => list[0])
        );
        if (!update_result.ok) return Response.json({ message: update_result.error.message }, { status: 500 });

        const updated = update_result.value;

        return Response.json({ updated });
      })
      .build()
  )

  .add(
    '/api/tournie',
    b => b
      .post(async (req) => {
        const json_result = await tryAsync(async () => Tournie_Schema.parse(await req.json()));
        if (!json_result.ok) return Response.json({ message: json_result.error.message }, { status: 400 });
        const json = json_result.value;
        const [auth] = await authenticate(req);
        if (auth === false) return Response.json({ message: 'Not signed in' }, { status: 401 });

        const user_result = await tryAsync(() => get_user_from_clerk_id(auth.userId, ['id', 'username']));
        if (!user_result.ok) return Response.json({ message: user_result.error.message }, { status: 500 });
        const user = user_result.value;
        if (!user) return Response.json({ message: 'Authed into a user outside of the system' });
        const ownerId = user.id;
        if (!ownerId) return Response.json({ message: 'Invalid user auth' }, { status: 400 });

        const insert_result = await tryAsync<Tournie['id']>(
          () => db.insert(tourniesTable)
            .values(Object.assign({ ownerId }, json))
            .returning({ id: tourniesTable.id })
            .then(list => list[0].id)
        );
        if (!insert_result.ok) return Response.json({ message: insert_result.error.message }, { status: 500 });

        const inserted_id = insert_result.value;
        return Response.json({ id: inserted_id });
      })
      .build()
  )

  .add(
    '/api/user',
    b => b
      .get(async (req) => {
        const url = new URL(req.url);
        const query = url.searchParams;
        const username = query.get('username');
        let userId = query.get('id') as User['id'] | undefined;
        if (!userId && !username) return Response.json({ message: 'No way to search for a user' });

        if (userId) {
          const result = await get_user_data_by_id(userId);
          if (!result.ok) return Response.json({ message: result.error.message }, { status: result.error.code });
          return Response.json({ user: result.value });
        }

        if (username) {
          const result = await get_user_data_by_username(username);
          if (!result.ok) return Response.json({ message: result.error.message }, { status: result.error.code });
          return Response.json({ user: result.value });
        }

        return Response.json({ message: 'No way to search for a user' });
      })
      .build()
  )
  .build();


type HttpMethod = 'GET' | 'POST';

export default function handler(req: Request) {
  const url = new URL(req.url);
  const method = req.method.toUpperCase() as HttpMethod;
  const pathname = url.pathname;
  if (pathname in routes) {
    const uses = (routes as Record<string, Route<any>>)[pathname];
    if (method in uses) return uses[method]!(req, {} as any);
  }
  const request_pieces = pathname.split('/');
  const entropy = [] as Array<[string, number, string[]]>;
  for (const path of Object.keys(routes)) {
    const molecule = path.split('/');
    let idx = molecule.findIndex(atom => atom.startsWith(':'));
    if (idx === -1) continue;
    if (idx >= request_pieces.length) continue;
    if (!request_pieces.slice(0, idx).every((atom, i) => atom === molecule[i])) continue;
    entropy.push([path, idx, molecule]);
  }

  while (entropy.length) {
    const [path, idx, molecule] = entropy.shift()!;
    let matched: false | Record<string, string> = {};
    for (let i = idx; i < molecule.length; ++i) {
      const req_atom = request_pieces[i];
      const rot_atom = molecule[i]!;
      if (!rot_atom.startsWith(':')) {
        if (rot_atom !== req_atom) {
          matched = false;
          break;
        }
        continue;
      }
      const param_name = rot_atom.substring(1);
      matched[param_name] = decodeURIComponent(req_atom);
    }

    if (matched !== false) {
      const r = (routes as Record<string, Route<`/${string}`>>)[path];
      const h = r[method];
      if (h) return h(req, matched);
    }
  }

  if (pathname.startsWith('/api')) return Response.json({ message: `Route ${pathname} not found` }, { status: 404 });
  return new Response(`Route ${pathname} not found`, {
    status: 404,
  });
}
