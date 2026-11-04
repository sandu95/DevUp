// Prisma Int maps to PostgreSQL's signed 32-bit integer.
export const isPositiveInt = (value: unknown): value is number =>
  typeof value === "number" && Number.isInteger(value) &&
  value > 0 && value <= 2147483647
