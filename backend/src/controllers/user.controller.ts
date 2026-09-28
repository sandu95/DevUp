import type { Request, Response } from "express"
import type { AuthRequest } from "../middleware/auth.middleware.js"
import { prisma } from "../lib/prisma.js"
import { getUserCount } from "../services/user.service.js"

export const getUsersStats = async (req: Request, res: Response) => {
  try {
    const userCount = await getUserCount()

    res.json({
      users: userCount,
    })
  } catch (error) {
    console.error(error)

    res.status(500).json({
      message: "Failed to fetch user statistics",
    })
  }
}

export const getCurrentUser = async (
  req: AuthRequest,
  res: Response
) => {
  try {
    if (!req.user) {
      return res.status(401).json({
        message: "Unauthorized",
      })
    }

    const user = await prisma.user.findUnique({
      where: {
        id: req.user.userId,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    })

    if (!user) {
      return res.status(404).json({
        message: "User not found",
      })
    }

    return res.json({
      user,
    })
  } catch (error) {
    console.error(error)

    return res.status(500).json({
      message: "Failed to fetch user",
    })
  }
}