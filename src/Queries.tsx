import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import type { Tournie } from '../db';

const client = new QueryClient();

export default function Provider({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={client} children={children} />
  );
}

export const useTournies = () => useQuery({
  queryKey: ['user:tournies'],
  queryFn: async () => {
    const res = await fetch('/api/tournies', { method: 'GET' });
    if (!res.ok) {
      const data: { message: string; errors?: string[] } = await res.json();
      return { ok: false as const, ...data };
    }
    const data: { list: Array<{ id: Tournie['id']; name: string }>, count: number } = await res.json();
    return { ok: true as const, ...data };
  },
});

