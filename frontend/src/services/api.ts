export async function api<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const token = localStorage.getItem("token")

  const response = await fetch(`http://localhost:3000/api${endpoint}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token
        ? {
            Authorization: `Bearer ${token}`,
          }
        : {}),
      ...options.headers,
    },
  })

  if (response.status === 401) {
    localStorage.removeItem("token")
    localStorage.removeItem("user")

    window.location.href = "/login"

    throw new Error("Session expired")
  }

  const contentType = response.headers.get("content-type")

  if (!contentType?.includes("application/json")) {
    const text = await response.text()

    console.error("Expected JSON, received:", text)

    throw new Error("Server returned an invalid response")
  }

  const data = await response.json()

  if (!response.ok) {
    throw new Error(data.message || "Something went wrong")
  }

  return data
}