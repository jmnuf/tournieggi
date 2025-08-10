
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
