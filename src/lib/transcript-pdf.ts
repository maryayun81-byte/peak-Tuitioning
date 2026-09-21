import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

/**
 * Shared transcript PDF engine. Captures a flow-based A4 element
 * (210mm wide, e.g. PremiumTranscript) and slices it across as many
 * portrait A4 pages as the content needs. Content determines pagination —
 * nothing is scaled, shrunk, stretched or clipped to force a page count.
 * Multi-page documents get "Page i of N" footers stamped in the PDF.
 */
export async function downloadTranscriptPdf(elementId: string, filename: string): Promise<void> {
  const element = document.getElementById(elementId)
  if (!element) throw new Error('Transcript element not found')

  const canvas = await html2canvas(element, {
    scale: 2.5,
    useCORS: true,
    logging: false,
    backgroundColor: '#ffffff',
    windowWidth: element.scrollWidth,
    windowHeight: element.scrollHeight,
    onclone: (clonedDoc) => {
      const el = clonedDoc.getElementById(elementId)
      if (el) {
        el.style.width = '794px'
        el.style.maxWidth = '794px'
        el.style.minWidth = '794px'
        el.style.height = 'auto'
        el.style.overflow = 'visible'
        el.style.padding = '0px'
        el.style.margin = '0px'
        el.style.transform = 'none'
      }
    },
  })

  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true })
  const pdfWidth = pdf.internal.pageSize.getWidth()
  const pdfHeight = pdf.internal.pageSize.getHeight()

  const pagePx = Math.floor(canvas.width * (pdfHeight / pdfWidth))
  const totalPages = Math.max(1, Math.ceil(canvas.height / pagePx))
  for (let page = 0; page < totalPages; page++) {
    const srcY = page * pagePx
    const sliceH = Math.min(pagePx, canvas.height - srcY)
    const slice = document.createElement('canvas')
    slice.width = canvas.width
    slice.height = sliceH
    const ctx = slice.getContext('2d')
    if (!ctx) throw new Error('Canvas unavailable')
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, slice.width, slice.height)
    ctx.drawImage(canvas, 0, srcY, canvas.width, sliceH, 0, 0, canvas.width, sliceH)
    if (page > 0) pdf.addPage()
    const imgH = (sliceH / canvas.width) * pdfWidth
    pdf.addImage(slice.toDataURL('image/png', 1.0), 'PNG', 0, 0, pdfWidth, imgH, undefined, 'FAST')
    if (totalPages > 1) {
      pdf.setFontSize(8)
      pdf.setTextColor(120)
      pdf.text(`Page ${page + 1} of ${totalPages}`, pdfWidth - 14, pdfHeight - 8, { align: 'right' })
    }
  }
  pdf.save(filename)
}

export function transcriptFilename(studentName?: string | null): string {
  const safe = (studentName || 'Student').replace(/[^a-z0-9]/gi, '_')
  return `Transcript_${safe}.pdf`
}
