const SITE = 'https://www.peakcampus.co.ke'

export type BreadcrumbItem = { name: string; path: string }

/**
 * BreadcrumbList JSON-LD for a public marketing page.
 * Purely additive markup — it does not render anything visible, so the
 * existing navigation/visual design is untouched.
 */
export function breadcrumbJsonLd(items: BreadcrumbItem[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Peak Performance Tutoring',
        item: `${SITE}/`,
      },
      ...items.map((item, index) => ({
        '@type': 'ListItem',
        position: index + 2,
        name: item.name,
        item: item.path.startsWith('http') ? item.path : `${SITE}${item.path}`,
      })),
    ],
  }
}
