import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  const { resourceTitle, format, engineData } = await request.json()

  try {
    const puppeteer = await import('puppeteer-core')
    let browser

    if (process.env.NODE_ENV === 'development') {
      // Local development on Windows
      const fs = await import('fs')
      const possiblePaths = [
        'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
        'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe'
      ]
      
      const executablePath = possiblePaths.find(p => fs.existsSync(p))
      if (!executablePath) throw new Error('Could not find local Chrome/Edge for PDF generation')
        
      browser = await puppeteer.default.launch({
        executablePath,
        headless: true,
      })
    } else {
      // Production on Vercel
      const chromium = await import('@sparticuz/chromium-min')
      const executablePath = await chromium.default.executablePath(
        'https://github.com/Sparticuz/chromium/releases/download/v123.0.1/chromium-v123.0.1-pack.tar'
      )
      browser = await puppeteer.default.launch({
        args: chromium.default.args,
        executablePath,
        headless: true,
      })
    }

    const page = await browser.newPage()

    // Base URL for the render route
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const renderUrl = `${baseUrl}/export/render`

    // Navigate to the render page
    await page.goto(renderUrl, { waitUntil: 'networkidle0' })

    // Inject the data and trigger the render
    await page.evaluate((data: any) => {
      (window as any).__EXPORT_DATA__ = data;
      window.dispatchEvent(new Event('export-data-ready'));
    }, engineData)

    // Wait for the React component to signal it's done rendering
    await page.waitForSelector('#export-ready', { timeout: 15000 })

    const pdfBuffer = await page.pdf({
      format: format === 'poster' ? 'A3' : 'A4',
      printBackground: true,
      margin: { top: '0', right: '0', bottom: '0', left: '0' } // Margins handled by CSS in render page
    })

    await browser.close()

    return new NextResponse(Buffer.from(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${resourceTitle.replace(/\s+/g, '_')}_${format}.pdf"`
      }
    })

  } catch (err) {
    console.error('PDF export error:', err)
    return NextResponse.json({ error: 'PDF generation failed', message: String(err) }, { status: 500 })
  }
}
