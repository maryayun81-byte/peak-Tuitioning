import DOMPurify from 'isomorphic-dompurify'

/**
 * Sanitizes an HTML string to prevent XSS attacks.
 * Allows common formatting tags but strips out scripts and dangerous attributes.
 */
export function sanitizeHTML(html: string): string {
  if (!html) return ''
  
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: [
      'p', 'br', 'b', 'i', 'em', 'strong', 'a', 'ul', 'ol', 'li', 
      'span', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 
      'img', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
      'blockquote', 'code', 'pre', 'hr'
    ],
    ALLOWED_ATTR: ['href', 'target', 'src', 'alt', 'class', 'style', 'id'],
  })
}
