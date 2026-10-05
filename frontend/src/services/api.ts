export async function api<T = any>(
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

  const contentType = response.headers.get("content-type")

  if (!contentType?.includes("application/json")) {
    const text = await response.text()

    console.error("Expected JSON, received:", text)

    const error = new Error(
      "Server returned an invalid response"
    )

    ;(error as Error & { status?: number }).status = response.status

    throw error
  }

  const data = await response.json()

  if (!response.ok) {
    const error = new Error(
      data.message || "Something went wrong"
    )

    ;(error as Error & { status?: number }).status = response.status

    throw error
  }

  return data
}