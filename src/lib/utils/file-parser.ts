/**
 * Server-side File Parsing Utilities
 */

export async function extractTextFromPDF(buffer: Buffer): Promise<string> {
  try {
    // pdf-parse is a common Node library. If not installed, this will throw.
    const pdf = require('pdf-parse')
    const data = await pdf(buffer)
    return data.text
  } catch (err) {
    console.error('PDF extraction failed:', err)
    throw new Error('PDF parsing library missing or file corrupted')
  }
}

export async function extractTextFromDOCX(buffer: Buffer): Promise<string> {
  try {
    const mammoth = require('mammoth')
    const result = await mammoth.extractRawText({ buffer })
    return result.value
  } catch (err) {
    console.error('DOCX extraction failed:', err)
    throw new Error('DOCX parsing library missing or file corrupted')
  }
}
