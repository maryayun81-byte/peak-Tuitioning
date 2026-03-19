/**
 * Wraps a promise with a timeout. 
 * Rejects if the promise doesn't resolve within ms.
 */
export async function withTimeout<T>(promise: Promise<T>, ms: number, timeoutName = 'Promise'): Promise<T> {
  let timeoutId: NodeJS.Timeout
  
  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutId = setTimeout(() => {
      console.warn(`[Timeout] ${timeoutName} timed out after ${ms}ms`)
      reject(new Error(`${timeoutName} timed out after ${ms}ms`))
    }, ms)
  })

  try {
    const result = await Promise.race([promise, timeoutPromise])
    clearTimeout(timeoutId!)
    return result
  } catch (error) {
    clearTimeout(timeoutId!)
    throw error
  }
}
