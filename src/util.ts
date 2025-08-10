export type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };
export const Result = {
  Ok<T, E>(value: T): Result<T, E> {
    return { ok: true, value };
  },
  Err<T, E>(error: E): Result<T, E> {
    return { ok: false, error };
  },
} as const;

export const trySync = <T>(fn: () => T): Result<T, Error> => {
  try {
    const value = fn();
    return { ok: true, value };
  } catch (e) {
    if (e instanceof Error) return { ok: false, error: e };
    return { ok: false, error: new Error('Unexpected irregular failure', { cause: e }) };
  }
};

export const tryAsync = async <T>(fn: () => Promise<T>): Promise<Result<T, Error>> => {
  try {
    const value = await fn();
    return Result.Ok(value);
  } catch (e) {
    if (e instanceof Error) return Result.Err(e);
    const error = new Error('Unexpected irregular failure', { cause: e });
    return Result.Err(error);;
  }
};

type AsyncPipeTo<From, To> = (arg: Awaited<From>) => To;

export async function asyncPipe<A, B>(a: A, b: (arg: Awaited<A>) => B): Promise<Awaited<B>>;
export async function asyncPipe<A, B, C>(a: A, b: AsyncPipeTo<A, B>, c: AsyncPipeTo<B, C>): Promise<Awaited<C>>;
export async function asyncPipe<A, B, C, D>(a: A, b: AsyncPipeTo<A, B>, c: AsyncPipeTo<B, C>, d: AsyncPipeTo<C, D>): Promise<Awaited<D>>;
export async function asyncPipe(a: any, ...mappers: Array<(arg0: any) => any>) {
  if (a instanceof Promise) a = await a;
  while (mappers.length) {
    const map = mappers.shift()!;
    a = map(a);
    if (a instanceof Promise) a = await a;
  }
  return a;
}
