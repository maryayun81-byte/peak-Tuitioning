export async function renderPdfToImages(url: string): Promise<string[]> {
  try {
     // Fetch the PDF as an arrayBuffer to avoid CORS canvas issues
     const response = await fetch(url)
     if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`)
     const arrayBuffer = await response.arrayBuffer()

      // Ensure pdfjs is initialized
      const pdfjsLib = await import('pdfjs-dist')
      // QC FIX: the worker used to load from the unpkg CDN, which is
      // unreachable on many Kenyan networks — every PDF open failed with
      // "Setting up fake worker failed" and students saw a blank page.
      // The worker is now bundled with the app (public/pdf.worker.min.mjs,
      // copied from the installed pdfjs-dist version), same-origin, no CDN.
      // If you upgrade pdfjs-dist, re-copy the worker file.
      if (pdfjsLib.version && !(pdfjsLib.GlobalWorkerOptions.workerSrc || '').startsWith('/pdf.worker')) {
        console.info(`[pdf-renderer] pdfjs v${pdfjsLib.version}, using bundled worker`)
      }
      pdfjsLib.GlobalWorkerOptions.workerSrc = '/pdf.worker.min.mjs'

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
