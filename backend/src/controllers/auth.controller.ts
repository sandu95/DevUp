import type { Request, Response } from "express"
import { Prisma } from "../generated/prisma/client.js"
import { isNonEmptyString } from "../lib/validation.js"
import {
  registerUser,
  loginUser,
} from "../services/auth.service.js"

export const register = async (req: Request, res: Response) => {
  try {
    const { name, email, password } = req.body ?? {}

    if (!isNonEmptyString(name) || !isNonEmptyString(email) || !isNonEmptyString(password)) {
      return res.status(400).json({
        message: "Name, email and password are required",
      })
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ message: "A valid email address is required" })
    }
    if (password.length < 6) {
      return res.status(400).json({
        message: "Password must contain at least 6 characters",
      })
    }

    const user = await registerUser(name, email, password)

    return res.status(201).json({
      message: "User registered successfully",
      user,
    })
  } catch (error) {
    if ((error instanceof Error && error.message === "EMAIL_ALREADY_EXISTS") ||
        (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")) {
      return res.status(409).json({
        message: "Email already exists",
      })
    }

    console.error(error)

    return res.status(500).json({
      message: "Failed to register user",
    })
  }
}

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body ?? {}

    if (!isNonEmptyString(email) || !isNonEmptyString(password)) {
      return res.status(400).json({
        message: "Email and password are required",
      })
    }

    const result = await loginUser(email, password)

    return res.status(200).json({
      message: "Login successful",
      ...result,
    })
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "INVALID_CREDENTIALS"
    ) {
      return res.status(401).json({
        message: "Invalid email or password",
      })
    }

    console.error(error)

    return res.status(500).json({
      message: "Failed to login",
    })
  }
}
