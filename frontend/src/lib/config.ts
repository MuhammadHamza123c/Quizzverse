const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000"

export function getWsUrl(path: string): string {
  const base = API_URL.replace(/^https?:\/\//, "")
  const protocol = API_URL.startsWith("https") ? "wss" : "ws"
  return `${protocol}://${base}${path}`
}

export default API_URL
