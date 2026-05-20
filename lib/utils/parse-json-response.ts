/**
 * Parse a fetch Response as JSON. Avoids SyntaxError when the server returns HTML
 * (Next.js 404/500 pages, auth redirects to HTML, etc.).
 */
export async function parseJsonResponse<T = unknown>(response: Response): Promise<T> {
  const text = await response.text()
  const trimmed = text.trim()
  if (!trimmed) {
    throw new Error(`Empty response body (HTTP ${response.status})`)
  }
  const first = trimmed[0]
  if (first !== "{" && first !== "[") {
    throw new Error(
      `Server returned non-JSON (HTTP ${response.status} ${response.statusText}). Check the URL and server logs.`,
    )
  }
  try {
    return JSON.parse(text) as T
  } catch {
    throw new Error(`Invalid JSON in response (HTTP ${response.status})`)
  }
}
