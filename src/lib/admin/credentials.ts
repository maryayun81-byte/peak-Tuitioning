/**
 * Normalizes a name string for reliable comparison.
 * Rules: lowercase, trim whitespace, replace multiple spaces with single space.
 */
export function normalizeName(name: string): string {
  if (!name) return "";
  return name
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

/**
 * Tokenizes a name into individual words.
 */
export function tokenize(name: string): string[] {
  return normalizeName(name).split(" ").filter(Boolean);
}

/**
 * Calculates a similarity score between two names based on token overlap.
 * Score is matches / max(tokensA, tokensB).
 */
export function similarityScore(a: string, b: string): number {
  const normA = normalizeName(a);
  const normB = normalizeName(b);
  
  if (!normA || !normB) return 0;
  if (normA === normB) return 1.0;

  const tokensA = tokenize(normA);
  const tokensB = tokenize(normB);

  const matches = tokensA.filter(t => tokensB.includes(t));
  
  return matches.length / Math.max(tokensA.length, tokensB.length);
}

/**
 * Check for partial name inclusion.
 */
export function isPartialMatch(a: string, b: string): boolean {
  const normA = normalizeName(a);
  const normB = normalizeName(b);
  
  if (!normA || !normB) return false;
  
  return normA.includes(normB) || normB.includes(normA);
}
