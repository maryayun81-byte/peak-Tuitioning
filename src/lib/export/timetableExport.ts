import jsPDF from 'jspdf'
import * as htmlToImage from 'html-to-image'

/**
 * Ensures all images inside an element are fully loaded and decoded.
 */
const waitForImages = async (element: HTMLElement) => {
  const images = Array.from(element.getElementsByTagName('img'))
  await Promise.all(
    images.map((img) => {
      if (img.complete) return Promise.resolve()
      return new Promise((resolve) => {
        img.onload = resolve
        img.onerror = resolve
      })
    })
  )
  // Double-check decoding for some browsers
  await Promise.all(
    images.map((img) => img.decode().catch(() => {}))
  )
}

/**
 * Temporarily brings an element into the renderable viewport area
 * to ensure the browser computes its layout correctly.
 */
const withReadyElement = async (elementId: string, action: (el: HTMLElement) => Promise<void>) => {
  const element = document.getElementById(elementId)
  if (!element) return

  const originalStyle = {
    position: element.style.position,
    left: element.style.left,
    top: element.style.top,
    visibility: element.style.visibility,
    display: element.style.display,
    zIndex: element.style.zIndex,
  }

  // Force into "Render Zone" - invisible but active in layout
  element.style.position = 'fixed'
  element.style.left = '0'
  element.style.top = '0'
  element.style.zIndex = '-9999'
  element.style.visibility = 'visible'
  element.style.display = 'block'

  try {
    // Wait for layout and images
    await waitForImages(element)
    // Add a small safety buffer for font rendering & paint cycles
    await new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(r)))
    await new Promise((r) => setTimeout(r, 100))
    
    await action(element)
  } finally {
    // Restore
    Object.assign(element.style, originalStyle)
  }
}

export const exportTimetableAsImage = async (elementId: string, filename: string) => {
  await withReadyElement(elementId, async (element) => {
    const options = {
      pixelRatio: 2.5, // High resolution
      backgroundColor: '#ffffff',
      cacheBust: true,
      skipFonts: false,
    }

    try {
      const dataUrl = await htmlToImage.toPng(element, options)
      const link = document.createElement('a')
      link.download = filename.endsWith('.png') ? filename : `${filename}.png`
      link.href = dataUrl
      link.click()
    } catch (error) {
      console.error('PNG export error:', error)
      throw error
    }
  })
}

export const exportTimetableToPDF = async (elementId: string, filename: string) => {
  await withReadyElement(elementId, async (element) => {
    const options = {
      pixelRatio: 2.5,
      backgroundColor: '#ffffff',
      cacheBust: true,
    }

    try {
      const dataUrl = await htmlToImage.toPng(element, options)
      
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4'
      })

      const imgProps = pdf.getImageProperties(dataUrl)
      const pdfWidth = pdf.internal.pageSize.getWidth()
      const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width

      const finalHeight = Math.min(pdfHeight, pdf.internal.pageSize.getHeight())
      const finalWidth = (imgProps.width * finalHeight) / imgProps.height
      const xOffset = (pdfWidth - finalWidth) / 2

      pdf.addImage(dataUrl, 'PNG', xOffset, 0, finalWidth, finalHeight, undefined, 'FAST')
      pdf.save(filename.endsWith('.pdf') ? filename : `${filename}.pdf`)
    } catch (error) {
      console.error('PDF export error:', error)
      throw error
    }
  })
}
