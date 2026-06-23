function normalizeUrl(url: string) {
  if (!url) return ''
  if (!/^https?:\/\//i.test(url)) return `https://${url}`
  return url
}

export function getYoutubeVideoId(parsed: URL) {
  const parts = parsed.pathname.split('/').filter(Boolean)
  if (parsed.hostname.includes('youtu.be')) return parts[0] || ''
  if (['embed', 'shorts', 'live'].includes(parts[0])) return parts[1] || ''
  return parsed.searchParams.get('v') || ''
}

function extractYoutubeIdFallback(url: string) {
  const match = url.match(/^.*(?:youtu\.be\/|v\/|u\/\w\/|embed\/|shorts\/|live\/|watch\?v=|&v=)([^#&?]*).*/)
  return match && match[1] ? match[1] : ''
}

export function getVideoThumbnail(url: string) {
  if (!url) return ''
  const normalized = normalizeUrl(url)
  try {
    const parsed = new URL(normalized)
    const isYt = parsed.hostname.includes('youtube.com') || parsed.hostname.includes('youtu.be') || parsed.hostname.includes('youtube-nocookie.com')
    const id = isYt ? getYoutubeVideoId(parsed) : ''
    if (id) return `https://img.youtube.com/vi/${id}/hqdefault.jpg`
  } catch {}
  const fallbackId = extractYoutubeIdFallback(url)
  if (fallbackId) return `https://img.youtube.com/vi/${fallbackId}/hqdefault.jpg`
  return ''
}

export function getEmbeddableVideoUrl(url: string) {
  if (!url) return ''
  const normalized = normalizeUrl(url)
  try {
    const parsed = new URL(normalized)
    if (parsed.hostname.includes('youtube.com') || parsed.hostname.includes('youtu.be') || parsed.hostname.includes('youtube-nocookie.com')) {
      const id = getYoutubeVideoId(parsed)
      if (!id) return ''
      const origin = typeof window !== 'undefined' ? window.location.origin : ''
      return `https://www.youtube.com/embed/${id}?rel=0&modestbranding=1&playsinline=1${origin ? `&origin=${encodeURIComponent(origin)}` : ''}`
    }
    if (parsed.hostname.includes('vimeo.com')) {
      const id = parsed.pathname.split('/').filter(Boolean).pop()
      return id ? `https://player.vimeo.com/video/${id}?dnt=1` : ''
    }
  } catch {}
  return ''
}

export function isDirectVideoUrl(url: string) {
  return /(\.mp4|\.webm|\.mov)($|\?)/i.test(url) || url.startsWith('blob:') || url.startsWith('data:video')
}
