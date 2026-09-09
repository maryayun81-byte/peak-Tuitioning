'use server'

import { createAdminClient } from '@/lib/supabase/server'

export interface LandingTestimonial {
  id: string
  fullName: string
  role: string
  relationshipLabel?: string
  quote: string
  rating: number
  isPublished: boolean
  source: string
  createdAt: string
}

function mapTestimonial(row: any): LandingTestimonial {
  return {
    id: String(row.id),
    fullName: String(row.full_name || ''),
    role: String(row.role || ''),
    relationshipLabel: row.relationship_label || undefined,
    quote: String(row.quote || ''),
    rating: Number(row.rating) || 5,
    isPublished: Boolean(row.is_published),
    source: String(row.source || 'landing_page'),
    createdAt: row.created_at || new Date().toISOString(),
  }
}

export async function getPublicTestimonials(limit = 10) {
  try {
    const admin = await createAdminClient()
    const { data, error } = await admin
      .from('landing_testimonials')
      .select('*')
      .eq('is_published', true)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (error) return { success: false, testimonials: [], error: error.message }
    return { success: true, testimonials: (data || []).map(mapTestimonial) }
  } catch (error: any) {
    return { success: false, testimonials: [], error: error?.message || 'Could not load testimonials.' }
  }
}

export async function submitTestimonial(input: {
  fullName: string
  role: string
  relationshipLabel?: string
  quote: string
  rating: number
}) {
  try {
    const admin = await createAdminClient()
    const { data, error } = await admin
      .from('landing_testimonials')
      .insert({
        full_name: input.fullName.trim(),
        role: input.role,
        relationship_label: input.relationshipLabel || null,
        quote: input.quote.trim(),
        rating: input.rating,
        is_published: true,
        source: 'landing_page',
      })
      .select()
      .single()

    if (error) return { success: false, error: error.message }
    return { success: true, testimonial: data ? mapTestimonial(data) : null }
  } catch (error: any) {
    return { success: false, error: error?.message || 'Failed to submit testimonial.' }
  }
}