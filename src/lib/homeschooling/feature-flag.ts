export const HOMESCHOOLING_ENABLED =
  process.env.NEXT_PUBLIC_HOMESCHOOLING_ENABLED !== 'false'

export function isHomeschoolingEnabled(): boolean {
  return HOMESCHOOLING_ENABLED
}
