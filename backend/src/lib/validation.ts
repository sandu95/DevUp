// Prisma Int maps to PostgreSQL's signed 32-bit integer.
export const isPositiveInt = (value: unknown): value is number =>
  typeof value === "number" && Number.isInteger(value) &&
  value > 0 && value <= 2147483647

export const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0

export const isOptionalText = (value: unknown): value is string | null | undefined =>
  value === undefined || value === null || typeof value === "string"
