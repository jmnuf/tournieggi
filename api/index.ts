import { createClerkClient } from '@clerk/backend';
import { and, eq, } from 'drizzle-orm';
import { z } from 'zod';
import {
  type Group,
  type Tournie,
  db,
  tourniesTable,
  usersTable,
} from '../db';
import { env } from '../env';
type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };
// const trySync = <T>(fn: () => T): Result<T, Error> => {
//   try {
//     const value = fn();
//     return { ok: true, value };
//   } catch (e) {
//     if (e instanceof Error) return { ok: false, error: e };
//     return { ok: false, error: new Error('Unexpected irregular failure', { cause: e }) };
//   }
// };
const tryAsync = <T>(fn: () => Promise<T>): Promise<Result<T, Error>> =>
  fn()
    .then(value => ({ ok: true, value } as const))
    .catch(e => ({ ok: false, error: e instanceof Error ? e : new Error('Unexpected irregular failure', { cause: e }) } as const));

const clerk = createClerkClient({
  secretKey: env.CLERK_SECRET_KEY,
  publishableKey: env.VITE_CLERK_PUBLISHABLE_KEY,
});

const authenticate = async (req: Request) => {
  const status_result = await tryAsync(() => clerk.authenticateRequest(req, {
    authorizedParties: ['https://tournieggi.jmnuf.app', 'https://jmnuf.app'],
  }));
  if (!status_result.ok) return [false] as const;
  const status = status_result.value;
  if (!status.isAuthenticated) return [false] as const;
  return [status.toAuth(), status] as const;
}

const get_user_id_from_clerk_id = (clerk_id: string) =>
  db.select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.clerk_id, clerk_id))
    .then(users => users[0]?.id)

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

const server = Bun.serve({
  routes: {
    '/api/tournies': {
      GET: async (req) => {
        const result = await tryAsync<Response>(async () => {
          const [auth] = await authenticate(req);
          if (auth === false) return Response.json({ message: 'Not authed' }, { status: 401 });
          const userId = await get_user_id_from_clerk_id(auth.userId);

          const tournies = await db.select({ id: tourniesTable.id, name: tourniesTable.name })
            .from(tourniesTable)
            .where(eq(tourniesTable.ownerId, userId));

          return Response.json({ list: tournies, count: tournies.length }, { status: 200 });
        });
        if (result.ok) return result.value;
        console.error(result.error);
        return Response.json({ message: 'Failed to fetch your tournies' }, { status: 500 })
      },

      POST: async (req) => {
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
          const userId = await get_user_id_from_clerk_id(auth.userId);

          const check_result = await tryAsync(
            () =>
              db.select({ id: tourniesTable.id })
                .from(tourniesTable)
                .where(and(eq(tourniesTable.name, data.name), eq(tourniesTable.ownerId, userId)))
          );
          if (check_result.ok) {
            if (check_result.value.length > 0) {
              return Response.json({ message: 'Tournie name already in use' }, { status: 400 });
            }
          }

          const insert_result = await tryAsync(() => db.insert(tourniesTable)
            .values({
              ownerId: userId,
              name: data.name,
              groups: data.groups,
              teams: data.teams,
              knockout_games: data.knockout_games ?? [],
            }).returning({ id: tourniesTable.id }));
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
      },
    }
  },

  fetch(req) {
    const url = new URL(req.url);
    const pathname = url.pathname;
    return new Response(`Route ${pathname} not found`, {
      status: 404,
    });
  }
});
export default server.fetch;

