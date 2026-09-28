import { prisma } from "../lib/prisma.js"

export const getUserCount = async () => {
  return prisma.user.count()
}