import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import { useAuth } from '@clerk/clerk-react';
import { env } from '../env';
import type { ReactNode } from 'react';
import type { Tournie } from '../db';
import type {
  UserData,
  TournieData,
  Update_Tournie,
  Insert_Tournie,
} from '../api';
import { Result, tryAsync } from './util';

const client = new QueryClient();
const API_BASE_URL = env.VITE_API_URL ?? '';

function ApiUrl(strings: TemplateStringsArray, ...args: string[]) {
  let path = API_BASE_URL;
  while (path.endsWith('/')) path = path.substring(0, path.length - 1);
  path += '/api';
  for (let i = 0; i < strings.length; ++i) {
    const s = strings[i];
    path += s;
    if (i >= args.length) continue;
    path += encodeURIComponent(args[i]);
  }
  return path;
}

export default function Provider({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={client} children={children} />
  );
}

const useTournies = () => {
  const { getToken } = useAuth();

  return useQuery({
    queryKey: ['user:tournies'],
    queryFn: async () => {

      const token = await getToken();

      const res = await fetch(ApiUrl`/tournies`, {
        method: 'GET',
        credentials: 'include',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const data: { message: string; errors?: string[] } = await res.json();
        return { ok: false as const, ...data };
      }

      const data: { list: Array<{ id: Tournie['id']; name: string }>, count: number } = await res.json();
      return { ok: true as const, ...data };
    },
  });
}

const useTournieById = (id: string) => useQuery({
  queryKey: ['tournie', id],
  queryFn: async () => {
    const res = await fetch(ApiUrl`/tournie/${id}`);
    if (!res.ok) {
      const json: { message: string; } = await res.json();
      return { ok: false as const, message: json.message };
    }

    const json: { tournie: TournieData } = await res.json();
    return { ok: true as const, tournie: json.tournie };
  },
});

const useTournieByUserAndName = (opt: { username: string; name: string; }) => useQuery({
  queryKey: ['tournie:user:name', opt.username, opt.name],
  queryFn: async (): Promise<{ ok: false, message: string } | { ok: true, tournie: TournieData }> => {
    const pathname = ApiUrl`/tournie-from-names/${opt.username}/${opt.name}`;
    const res = await fetch(pathname);
    if (!res.ok) {
      const json: { message: string; } = await res.json();
      return { ok: false as const, message: json.message };
    }

    const json: { tournie: TournieData } = await res.json();
    return { ok: true as const, tournie: json.tournie };
  },
});

type UsedQuery<T> = { isLoading: true } | { isLoading: false; isError: true; error: Error } | { isLoading: false, isError: false; data: T };

function useUserDataByAuth(): UsedQuery<{ ok: false; message: string } | { ok: true, user: UserData }> {
  const auth = useAuth();

  const query = useQuery({
    queryKey: ['user:data', 'auth:clerk'],
    queryFn: async () => {
      const clerk_id = auth.userId;
      if (!clerk_id) return { ok: false as const, message: 'Not authed' };
      const res = await fetch(ApiUrl`/user?clerkId=${clerk_id}`);

      if (!res.ok) {
        const json: { message: string; } = await res.json();
        return { ok: false as const, message: json.message };
      }

      const json: { user: UserData } = await res.json();
      return { ok: true as const, user: json.user };
    },
  });

  if (!auth.isLoaded || (query.isLoading && !query.data)) return { isLoading: true } as const;
  if (query.isError) return { isLoading: false, isError: true, error: query.error } as const;
  return { isLoading: false, isError: false, data: query.data! } as const;
}

const useUserDataById = (id: string) => useQuery({
  queryKey: ['user:data', id],
  queryFn: async () => {
    if (!id) return { message: 'No user id provided', ok: false as const };
    const res = await fetch(ApiUrl`/user?id=${id}`);

    if (!res.ok) {
      const json: { message: string; } = await res.json();
      return { ok: false as const, message: json.message };
    }

    const json: { user: UserData } = await res.json();
    return { ok: true as const, user: json.user };
  },
}) as UsedQuery<{ ok: false; message: string } | { ok: true, user: UserData }>;

const useUserDataByUsername = (username: string) => useQuery({
  queryKey: ['user:data', username],
  queryFn: async () => {
    if (!username) return { message: 'No username provided', ok: false as const };
    const res = await fetch(ApiUrl`/user?username=${username}`);

    if (!res.ok) {
      const json: { message: string; } = await res.json();
      return { ok: false as const, message: json.message };
    }

    const json: { user: UserData } = await res.json();
    return { ok: true as const, user: json.user };
  },
}) as UsedQuery<{ ok: false; message: string } | { ok: true, user: UserData }>;

async function updateTournie(opt: { id: string, tournie: Update_Tournie }) {
  const res = await fetch(ApiUrl`/tournie/${opt.id}`, { method: 'POST', body: JSON.stringify(opt.tournie) });
  const json = await res.json();
  if (!res.ok) return { ok: false, message: json.message as string } as const;
  return { ok: true, updated: json.updated as Tournie };
}

async function createTournie(opt: { getToken: () => Promise<string>; data: Insert_Tournie }): Promise<Result<Tournie['id'], string>> {
  const token_result = await tryAsync(opt.getToken);
  if (!token_result.ok) return Result.Err(token_result.error.message);
  const fetch_result = await tryAsync(() => fetch(ApiUrl`/tournie`, { method: 'POST', body: JSON.stringify({ data: opt.data }) }));
  if (!fetch_result.ok) return Result.Err(fetch_result.error.message);
  const res = fetch_result.value;
  const json = await res.json();
  if (!res.ok) return Result.Err(json.message as string);
  return Result.Ok(json.id as Tournie['id']);
}

export const api = {
  query: {
    useTournies,
    useTournieById,
    useTournieByUserAndName,
    useUserDataByAuth,
    useUserDataById,
    useUserDataByUsername,
  },

  mut: {
    updateTournie,
    createTournie,
  },
} as const;

