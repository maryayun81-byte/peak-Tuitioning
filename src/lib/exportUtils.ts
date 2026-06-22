import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

/**
 * Exports a given DOM element to a PNG and triggers a download.
 */
export async function exportToPng(element: HTMLElement, filename: string = 'flashcard.png') {
  try {
    const canvas = await html2canvas(element, { scale: 2, useCORS: true });
    const dataUrl = canvas.toDataURL('image/png');

    const link = document.createElement('a');
    link.download = filename;
    link.href = dataUrl;
    link.click();
  } catch (error) {
    console.error('Failed to export PNG', error);
    throw error;
  }
}

/**
 * Exports a deck (front and back DOM elements) to an A4 PDF.
 * Uses a 3x2 grid (3 rows, 2 columns) per page.
 */
export async function exportToPdf(frontElement: HTMLElement, backElement: HTMLElement, deckTitle: string = 'Deck') {
  try {
    // Generate high-res canvases for the front and back faces
    const frontCanvas = await html2canvas(frontElement, { scale: 2, useCORS: true });
    const backCanvas = await html2canvas(backElement, { scale: 2, useCORS: true });
    
    const frontDataUrl = frontCanvas.toDataURL('image/png', 0.95);
    const backDataUrl = backCanvas.toDataURL('image/png', 0.95);

    // A4 dimensions in mm
    const a4Width = 210;
    const a4Height = 297;
    
    const marginX = 10;
    const marginY = 15;
    
    // Calculate grid dimensions (2 columns, 3 rows)
    const cols = 2;
    const rows = 3;
    const cardWidth = (a4Width - (marginX * 2)) / cols;
    const cardHeight = (a4Height - (marginY * 2)) / rows;

    const pdf = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4',
    });

    // We'll generate 6 cards (3x2) for demonstration of the layout
    const cardsPerPage = cols * rows;

    // --- Page 1: Front Faces ---
    pdf.setFontSize(10);
    pdf.text(`${deckTitle} - Front Faces`, marginX, 10);

    for (let i = 0; i < cardsPerPage; i++) {
      const col = i % cols;
      const row = Math.floor(i / cols);
      
      const x = marginX + (col * cardWidth);
      const y = marginY + (row * cardHeight);

      pdf.addImage(frontDataUrl, 'PNG', x + 2, y + 2, cardWidth - 4, cardHeight - 4);
      
      // Draw a light dotted cut-line border
      pdf.setDrawColor(200, 200, 200);
      ;(pdf as any).setLineDash([1, 1], 0);
      pdf.rect(x, y, cardWidth, cardHeight);
    }

    // --- Page 2: Back Faces ---
    pdf.addPage();
    pdf.text(`${deckTitle} - Back Faces`, marginX, 10);

    for (let i = 0; i < cardsPerPage; i++) {
      // Note: For double-sided printing, columns must be mirrored!
      const originalCol = i % cols;
      const mirroredCol = (cols - 1) - originalCol;
      const row = Math.floor(i / cols);
      
      const x = marginX + (mirroredCol * cardWidth);
      const y = marginY + (row * cardHeight);

      pdf.addImage(backDataUrl, 'PNG', x + 2, y + 2, cardWidth - 4, cardHeight - 4);
      
      // Draw cut-line border
      pdf.setDrawColor(200, 200, 200);
      ;(pdf as any).setLineDash([1, 1], 0);
      pdf.rect(x, y, cardWidth, cardHeight);
    }

    pdf.save(`${deckTitle.replace(/\s+/g, '_').toLowerCase()}_printable.pdf`);

  } catch (error) {
    console.error('Failed to export PDF', error);
    throw error;
  }
}
