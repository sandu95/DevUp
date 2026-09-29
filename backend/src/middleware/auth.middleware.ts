import type { NextFunction, Request, Response } from "express"
import jwt from "jsonwebtoken"

interface JwtPayload {
  userId: number
  role: "STUDENT" | "ADMIN"
}

export interface AuthRequest extends Request {
  user?: JwtPayload
}

export const authenticate = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authHeader = req.headers.authorization

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({
      message: "Authentication token is required",
    })
  }

  const token = authHeader.split(" ")[1]

  const jwtSecret = process.env.JWT_SECRET

  if (!jwtSecret) {
    return res.status(500).json({
      message: "JWT configuration is missing",
    })
  }

  try {
    const decoded = jwt.verify(token, jwtSecret) as JwtPayload

    req.user = {
      userId: decoded.userId,
      role: decoded.role,
    }

    next()
  } catch {
    return res.status(401).json({
      message: "Invalid or expired token",
    })
  }
}

export const authorize = (...allowedRoles: JwtPayload["role"][]) => {
  return (
    req: AuthRequest,
    res: Response,
    next: NextFunction
  ) => {
    if (!req.user) {
      return res.status(401).json({
        message: "Unauthorized",
      })
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        message: "Access denied",
      })
    }

    next()
  }
}

export const optionalAuthenticate = (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  const authorization = req.headers.authorization

  if (!authorization) {
    return next()
  }

  const [type, token] = authorization.split(" ")

  if (type !== "Bearer" || !token) {
    return res.status(401).json({
      message: "Invalid authorization header",
    })
  }

  try {
    const decoded = jwt.verify(
      token,
      process.env.JWT_SECRET!
    ) as {
      userId: number
      role: "STUDENT" | "ADMIN"
    }

    req.user = {
      userId: decoded.userId,
      role: decoded.role,
    }

    next()
  } catch {
    return res.status(401).json({
      message: "Invalid or expired token",
    })
  }
}