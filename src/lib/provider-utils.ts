export async function fetchWithRetry(
  url: string,
  options: RequestInit & { retries?: number },
): Promise<Response> {
  const maxRetries = options.retries ?? 2
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000)
    try {
      const response = await fetch(url, {
        ...options,
        signal: controller.signal,
      })
      clearTimeout(timeoutId)
      if (response.status === 429 && attempt < maxRetries) {
        const delay = Math.min(1000 * Math.pow(2, attempt), 4000)
        await new Promise(r => setTimeout(r, delay))
        continue
      }
      return response
    } catch (err) {
      clearTimeout(timeoutId)
      if (attempt === maxRetries) throw err
      const delay = Math.min(1000 * Math.pow(2, attempt), 4000)
      await new Promise(r => setTimeout(r, delay))
    }
  }
  throw new Error('fetchWithRetry exhausted')
}

export async function extractError(response: Response): Promise<string> {
  try {
    const body = await response.text()
    let parsed: any
    try { parsed = JSON.parse(body) } catch { return body.slice(0, 300) }
    return parsed?.error?.message || parsed?.error || body.slice(0, 300)
  } catch {
    return `${response.status} ${response.statusText}`
  }
}
