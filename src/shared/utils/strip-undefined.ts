type StripUndefined<T> = {
  [K in keyof T as undefined extends T[K] ? never : K]: T[K];
} & {
  [K in keyof T as undefined extends T[K] ? K : never]?: Exclude<T[K], undefined>;
};

// Remove as chaves com valor undefined. Necessario por causa do
// exactOptionalPropertyTypes: o Prisma nao aceita `campo: undefined`
// onde o tipo e `campo?: valor`.
export function stripUndefined<T extends Record<string, unknown>>(data: T) {
  return Object.fromEntries(
    Object.entries(data).filter(([, value]) => value !== undefined),
  ) as StripUndefined<T>;
}
