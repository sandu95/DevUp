export interface User {
  id: number
  name: string
  email: string
  role: "STUDENT" | "ADMIN"
}

export interface LoginResponse {
  token: string
  user: User
}