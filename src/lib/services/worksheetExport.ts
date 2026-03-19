import { PDFDocument, rgb, StandardFonts } from 'pdf-lib'
import type { WorksheetBlock } from '@/types/database'

interface PDFExportOptions {
  title?: string
  subject_name?: string
  class_name?: string
  worksheet?: WorksheetBlock[]
  passage?: string
  total_marks?: number
  // Legacy compat
  subject_id?: string
}

// Helper to wrap text manually and respect EVERY character including multiple spaces
function wrapText(text: string, maxWidth: number, font: any, fontSize: number) {
  const finalLines: string[] = []
  // Normalize and split by newlines (preserving empty ones)
  const paragraphs = (text || '').replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n')

  for (const paragraph of paragraphs) {
    if (paragraph.length === 0) {
      finalLines.push('') // Truly empty line for a linebreak
      continue
    }

    // Split by spaces but preserve them as individual tokens to avoid collapsing
    // Using a regex that captures the spaces so they are kept in the parts array
    const parts = paragraph.split(/( )/) 
    let currentLine = ''

    for (const part of parts) {
      if (part === '') continue // Handle potential empty strings from split

      const testLine = currentLine + part
      const width = font.widthOfTextAtSize(testLine, fontSize)
      
      if (width <= maxWidth) {
        currentLine = testLine
      } else {
        if (currentLine.length > 0) {
          finalLines.push(currentLine)
          // If we wrapped at a space, the next line should NOT start with that space
          // unless it's consecutive spaces. Actually, for pre-wrap, if it doesn't fit,
          // it wraps. 
          currentLine = part === ' ' ? '' : part
        } else {
          // Word itself is wider than maxWidth
          finalLines.push(part)
          currentLine = ''
        }
      }
    }
    if (currentLine.length > 0 || paragraph.length > 0) {
      finalLines.push(currentLine)
    }
  }
  return finalLines
}

function cleanHtml(html: string) {
  if (!html) return ''

  // If it's already plain text (no tags), just return it (after decoding basic entities if any)
  if (!html.includes('<') && !html.includes('>')) {
    return html.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
  }

  let text = html

  // --- Step 1: Handle <pre> / passage-node blocks specifically ---
  // Tiptap stores poem/passage content as <pre data-type="...">...raw text with \n...</pre>
  // We must NOT let a generic <br> or </p> replacement touch THIS content.
  // Strategy: decode entities inside <pre> blocks first, then replace the outer tags.
  text = text.replace(/<pre[^>]*>([\s\S]*?)<\/pre>/gi, (_, inner) => {
    // Decode HTML entities in the pre block content, then preserve newlines
    const decoded = inner
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/<br\s*\/?>/gi, '\n') // Handle any <br> inside pre too
    return decoded + '\n'
  })

  // --- Step 2: Convert remaining block-level tags to newlines ---
  text = text
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/div>/gi, '\n')
    .replace(/<\/h[1-6]>/gi, '\n')
    .replace(/<p[^>]*>/gi, '')
    .replace(/<div[^>]*>/gi, '')
    .replace(/<[^>]+>/g, '') // Strip any remaining tags

  // --- Step 3: Decode remaining HTML entities ---
  text = text
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")

  return text
}

export async function generateWorksheetPDF(opts: PDFExportOptions) {
  const pdfDoc = await PDFDocument.create()
  let page = pdfDoc.addPage([595.28, 841.89]) // A4
  const { width, height } = page.getSize()

  // Standard Fonts
  const bold    = await pdfDoc.embedFont(StandardFonts.HelveticaBold)
  const regular = await pdfDoc.embedFont(StandardFonts.Helvetica)
  const italic  = await pdfDoc.embedFont(StandardFonts.HelveticaOblique)
  
  // Serif Fonts for Literature/Passages
  const timesNormal = await pdfDoc.embedFont(StandardFonts.TimesRoman)
  const timesItalic = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic)
  const timesBold   = await pdfDoc.embedFont(StandardFonts.TimesRomanBold)

  const margin = 50
  const contentWidth = width - 2 * margin
  let y = height - 50

  // Header 
  page.drawRectangle({ x: margin, y: y + 10, width: contentWidth, height: 3, color: rgb(0.39, 0.40, 0.95) })
  y -= 10

  // Title
  const title = opts.title || 'Worksheet'
  page.drawText(title, { x: margin, y, size: 22, font: bold, color: rgb(0.1, 0.1, 0.1) })
  y -= 24

  // Subject / Class meta line
  const metaLine = [opts.subject_name, opts.class_name].filter(Boolean).join(' · ')
  if (metaLine) {
    page.drawText(metaLine, { x: margin, y, size: 10, font: regular, color: rgb(0.4, 0.4, 0.4) })
    y -= 16
  }

  // Total marks
  page.drawText(`Total Marks: ${opts.total_marks ?? 0}`, { x: margin, y, size: 10, font: regular, color: rgb(0.4, 0.4, 0.4) })
  y -= 30

  // Student info boxes
  const fields = ['Name', 'Date', 'Class']
  const boxWidth = (contentWidth - 20) / fields.length
  fields.forEach((label, i) => {
    const bx = margin + i * (boxWidth + 10)
    page.drawText(label + ':', { x: bx, y, size: 8, font: bold, color: rgb(0.5, 0.5, 0.5) })
    page.drawLine({ start: { x: bx, y: y - 12 }, end: { x: bx + boxWidth - 5, y: y - 12 }, thickness: 0.5, color: rgb(0.7, 0.7, 0.7) })
  })
  y -= 40

  // Global Passage/Poem if present (legacy support)
  if (opts.passage) {
    const cleaned = cleanHtml(opts.passage)
    const lines = wrapText(cleaned, contentWidth, regular, 10) || []
    for (const line of lines) {
      if (y < 60) { page = pdfDoc.addPage([595.28, 841.89]); y = height - 50 }
      page.drawText(line, { x: margin, y, size: 10, font: regular })
      y -= 14
    }
    y -= 20
  }

  // Blocks
  const blocks = opts.worksheet || []
  let qNum = 1
  let subQNum = 0
  const mainTypes = ['mcq', 'multi_select', 'short_answer', 'long_answer', 'true_false', 'math', 'matching', 'fill_in_blank']

  for (const block of blocks) {
    if (y < 100) { page = pdfDoc.addPage([595.28, 841.89]); y = height - 50 }

    let label: string | undefined = undefined
    let isSub = false

    if (block.type === 'sub_question') {
      label = `${String.fromCharCode(97 + (subQNum % 26))})`
      subQNum++
      isSub = true
    } else if (mainTypes.includes(block.type)) {
      label = `${qNum++}.`
      subQNum = 0
    } else {
      subQNum = 0
    }

    const currentMargin = isSub ? margin + 30 : margin

    if (block.type === 'section_header') {
      page.drawRectangle({ x: margin, y: y - 4, width: contentWidth, height: 20, color: rgb(0.95, 0.95, 0.98) })
      page.drawText((block.section_title || 'Section').toUpperCase(), { x: margin + 8, y, size: 11, font: bold, color: rgb(0.3, 0.3, 0.8) })
      y -= 24
      if (block.section_instructions) {
         const cleanedInst = cleanHtml(block.section_instructions)
         const instLines = wrapText(cleanedInst, contentWidth - 10, italic, 9) || []
         for (const line of instLines) {
           if (y < 60) { page = pdfDoc.addPage([595.28, 841.89]); y = height - 50 }
           page.drawText(line, { x: margin + 8, y, size: 9, font: italic, color: rgb(0.5, 0.5, 0.5) })
           y -= 12
         }
         y -= 8
      }
    } else if (block.type === 'poem' || block.type === 'passage' || block.type === 'reading_passage') {
      const isPoem = block.type === 'poem' || block.passage_type === 'poem'
      const blockTitle = isPoem ? 'POEM / LITERATURE' : 'READING PASSAGE'
      page.drawText(blockTitle, { x: margin, y, size: 9, font: bold, color: rgb(0.5, 0.5, 0.5) })
      y -= 14

      const content = cleanHtml(block.question || block.passage_text || '')
      const activeFont = isPoem ? timesItalic : timesNormal
      const lines = wrapText(content, contentWidth - 20, activeFont, 11) || []
      
      for (const line of lines) {
        if (y < 60) { page = pdfDoc.addPage([595.28, 841.89]); y = height - 50 }
        page.drawText(line, { 
          x: isPoem ? margin + 25 : margin, 
          y, 
          size: 11, 
          font: activeFont, 
          color: rgb(0.1, 0.1, 0.1) 
        })
        y -= 15 // Slightly more leading for serif content
      }
      y -= 20
    } else {
      // Question or Sub-Question
      const qText = cleanHtml(block.question || '')
      const marksLabel = block.marks > 0 ? `[${block.marks} mk]` : ''
      
      const qLines = wrapText(qText, contentWidth - (isSub ? 60 : 40), regular, 11) || []
      
      if (marksLabel) {
        page.drawText(marksLabel, { x: width - margin - 50, y, size: 9, font: bold, color: rgb(0.4, 0.4, 0.9) })
      }

      for (let i = 0; i < qLines.length; i++) {
        if (y < 60) { page = pdfDoc.addPage([595.28, 841.89]); y = height - 50 }
        const line = qLines[i]
        
        if (i === 0 && label) {
          page.drawText(label, { x: currentMargin, y, size: 11, font: bold, color: rgb(0.1, 0.1, 0.1) })
          page.drawText(line, { x: currentMargin + 25, y, size: 11, font: isSub ? regular : bold, color: rgb(0.1, 0.1, 0.1) })
        } else {
          page.drawText(line, { x: currentMargin + 25, y, size: 11, font: regular, color: rgb(0.1, 0.1, 0.1) })
        }
        y -= 16
      }
      y -= 5

      // MCQ Options
      if ((block.type === 'mcq' || block.type === 'multi_select') && block.options) {
        const OPTION_LABELS = ['A', 'B', 'C', 'D', 'E', 'F']
        for (let i = 0; i < block.options.length; i++) {
          const opt = block.options[i]
          if (!opt) continue
          const optLabel = `${OPTION_LABELS[i]}) `
          const optLines = wrapText(opt, (contentWidth - 60) / 2 - 10, regular, 10) || []
          
          const xPos = currentMargin + 25 + (i % 2) * ((contentWidth - 60) / 2)
          // Adjust y only every 2 options
          const currentY = y - Math.floor(i / 2) * 20

          if (currentY < 60) { /* handle page break? simplified for now */ }
          
          for (let j = 0; j < optLines.length; j++) {
            page.drawText(j === 0 ? optLabel + optLines[j] : '   ' + optLines[j], { x: xPos, y: currentY - j * 12, size: 10, font: regular })
          }
        }
        y -= Math.ceil(block.options.length / 2) * 20 + 10
      } else if (['short_answer', 'long_answer', 'math', 'sub_question'].includes(block.type)) {
        const lines = block.type === 'long_answer' ? (block.answer_lines || 6) : (block.answer_lines || 3)
        for (let i = 0; i < lines; i++) {
          if (y < 60) { page = pdfDoc.addPage([595.28, 841.89]); y = height - 50 }
          page.drawLine({ start: { x: currentMargin + 25, y }, end: { x: width - margin, y }, thickness: 0.5, color: rgb(0.8, 0.8, 0.8) })
          y -= 20
        }
      } else if (block.type === 'true_false') {
        page.drawText('(   )  True', { x: currentMargin + 25, y, size: 10, font: regular })
        page.drawText('(   )  False', { x: currentMargin + 125, y, size: 10, font: regular })
        y -= 20
      }
      y -= 15
    }
  }

  // Footer
  const pages = pdfDoc.getPages()
  pages.forEach((p, i) => {
    p.drawText(`Page ${i + 1} of ${pages.length} | Peak Performance Tutoring`, {
      x: margin, y: 20, size: 8, font: regular, color: rgb(0.6, 0.6, 0.6)
    })
  })

  const pdfBytes = await pdfDoc.save()
  const blob = new Blob([pdfBytes as any], { type: 'application/pdf' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `${title.replace(/\s+/g, '_')}.pdf`
  a.click()
}
