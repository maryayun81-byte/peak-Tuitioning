import jsPDF from 'jspdf'
import html2canvas from 'html2canvas'

export const exportTimetableToPDF = async (elementId: string, filename: string) => {
  const element = document.getElementById(elementId)
  if (!element) {
    console.error('Export element not found:', elementId)
    return
  }

  // Temporary show element for capture if hidden
  const originalStyle = element.style.display
  const originalPosition = element.style.position
  const originalLeft = element.style.left
  const originalTop = element.style.top

  element.style.display = 'block'
  element.style.position = 'relative'
  element.style.left = '0'
  element.style.top = '0'

  try {
    const canvas = await html2canvas(element, {
      scale: 2, // Higher quality
      useCORS: true,
      logging: false,
      backgroundColor: '#ffffff'
    })

    const imgData = canvas.toDataURL('image/png')
    const pdf = new jsPDF({
      orientation: 'landscape',
      unit: 'mm',
      format: 'a4'
    })

    const imgProps = pdf.getImageProperties(imgData)
    const pdfWidth = pdf.internal.pageSize.getWidth()
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width

    pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight)
    pdf.save(filename)
  } catch (error) {
    console.error('PDF export error:', error)
    throw error
  } finally {
    // Restore original styles
    element.style.display = originalStyle
    element.style.position = originalPosition
    element.style.left = originalLeft
    element.style.top = originalTop
  }
}
