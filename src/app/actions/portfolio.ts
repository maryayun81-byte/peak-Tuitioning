'use server'

import { createClient } from '@/lib/supabase/server'

export async function getStudentPortfolios(studentId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('cbc_portfolios')
    .select('*, items:cbc_portfolio_items(*)')
    .eq('student_id', studentId)
    .order('created_at', { ascending: false })
  
  if (error) throw error
  return data
}

export async function createPortfolio(studentId: string, title: string, description: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('cbc_portfolios')
    .insert({ student_id: studentId, title, description })
    .select()
    .single()
  
  if (error) throw error
  return data
}

export async function addPortfolioItem(portfolioId: string, title: string, imageBase64: string, notes: string) {
  const supabase = await createClient()

  // 1. Upload to Supabase Storage (Assumes 'portfolio_items' bucket exists)
  const base64Data = imageBase64.split(',')[1] || imageBase64
  const imageBuffer = Buffer.from(base64Data, 'base64')
  const fileName = `${portfolioId}/${Date.now()}.png`
  
  const { data: uploadData, error: uploadError } = await supabase
    .storage
    .from('portfolio_items')
    .upload(fileName, imageBuffer, {
      contentType: 'image/png',
      upsert: true
    })

  let imageUrl = ''
  if (!uploadError && uploadData) {
    const { data: { publicUrl } } = supabase.storage.from('portfolio_items').getPublicUrl(fileName)
    imageUrl = publicUrl
  } else {
    // Fallback if storage isn't set up
    imageUrl = imageBase64
  }

  const { data, error } = await supabase
    .from('cbc_portfolio_items')
    .insert({ portfolio_id: portfolioId, title, image_url: imageUrl, notes })
    .select()
    .single()
  
  if (error) throw error
  return data
}
