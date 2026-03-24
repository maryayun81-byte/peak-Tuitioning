export async function renderPdfToImages(url: string): Promise<string[]> {
  try {
     // Fetch the PDF as an arrayBuffer to avoid CORS canvas issues
     const response = await fetch(url)
     if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
     const arrayBuffer = await response.arrayBuffer()

     // Ensure pdfjs is initialized
     const pdfjsLib = await import('pdfjs-dist')
     // For PDF.js 4.x+, the worker must be a module (.mjs)
     const workerUrl = `https://unpkg.com/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`
     pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl

     const loadingTask = pdfjsLib.getDocument({
        data: arrayBuffer,
        useWorkerFetch: false,
        isEvalSupported: false,
        useSystemFonts: true
     })

     const pdf = await loadingTask.promise
     const images: string[] = []

     for (let i = 1; i <= pdf.numPages; i++) {
       const page = await pdf.getPage(i)
       const viewport = page.getViewport({ scale: 1.5 }) 

       const canvas = document.createElement('canvas')
       const context = canvas.getContext('2d')
       if (!context) continue

       canvas.height = viewport.height
       canvas.width = viewport.width

       await page.render({
         canvasContext: context,
         viewport: viewport
       }).promise

       images.push(canvas.toDataURL('image/png'))
     }

     return images
  } catch (error: any) {
     console.error('[pdf-renderer] Detailed Error:', error)
     throw error
  }
}
