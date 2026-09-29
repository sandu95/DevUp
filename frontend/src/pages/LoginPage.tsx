import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { api } from "../services/api"
import { useAuth } from "../context/AuthContext"

function LoginPage() {

    const { login } = useAuth()
    const navigate = useNavigate()

    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [error, setError] = useState("")
    const [loading, setLoading] = useState(false)

    const handleSubmit = async (
        event: React.FormEvent<HTMLFormElement>
    ) => {
        event.preventDefault()

        setError("")
        setLoading(true)

        try {
            const data = await api("/auth/login", {
                method: "POST",
                body: JSON.stringify({
                    email,
                    password,
                }),
            })

            login(data.token, data.user)

            if (data.user.role === "ADMIN") {
                navigate("/admin")
            } else {
                navigate("/dashboard")
            }
            
        } catch (error) {
            setError(
                error instanceof Error
                    ? error.message
                    : "Login failed"
            )
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-100">
            <form
                onSubmit={handleSubmit}
                className="w-full max-w-md rounded-xl bg-white p-8 shadow"
            >
                <h1 className="mb-6 text-2xl font-bold">
                    Login
                </h1>

                <div className="mb-4">
                    <label className="mb-1 block text-sm font-medium">
                        Email
                    </label>

                    <input
                        type="email"
                        value={email}
                        onChange={(event) => setEmail(event.target.value)}
                        className="w-full rounded-lg border px-3 py-2"
                        required
                    />
                </div>

                <div className="mb-4">
                    <label className="mb-1 block text-sm font-medium">
                        Password
                    </label>

                    <input
                        type="password"
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        className="w-full rounded-lg border px-3 py-2"
                        required
                    />
                </div>

                {error && (
                    <p className="mb-4 text-sm text-red-600">
                        {error}
                    </p>
                )}

                <button
                    type="submit"
                    disabled={loading}
                    className="w-full rounded-lg bg-slate-900 px-4 py-2 text-white disabled:opacity-50"
                >
                    {loading ? "Logging in..." : "Login"}
                </button>
            </form>
        </div>
    )
}

export default LoginPage