// Attachment view helpers — shared by the student solver and the teacher
// marking workspace.
//
// A browser can render PDFs and images inline, but NOT Office documents
// (Word/Excel/PowerPoint). Feeding a .docx URL to the PDF renderer or the
// Fabric canvas silently produces a BLANK canvas, so students/teachers stare
// at an empty page with no way to open the questions. Office and unknown
// files must render as file-access cards (Open / Download) instead.

export type AttachmentKind = 'pdf' | 'image' | 'office' | 'other';

const OFFICE_EXTS = new Set([
  'doc', 'docx', 'docm', 'dot', 'dotx',
  'xls', 'xlsx', 'xlsm', 'csv',
  'ppt', 'pptx', 'pps', 'ppsx',
  'txt', 'rtf', 'odt', 'ods', 'odp',
]);

export function attachmentKindOf(url?: string | null): AttachmentKind | null {
  if (!url) return null;
  const clean = url.split('?')[0].toLowerCase();
  if (clean.endsWith('.pdf')) return 'pdf';
  if (/\.(png|jpe?g|webp|gif|bmp|svg|avif|heic|heif)$/.test(clean)) return 'image';
  const ext = clean.split('.').pop() || '';
  if (OFFICE_EXTS.has(ext)) return 'office';
  return 'other';
}

/** True when the file can be rendered inline (PDF pages / image pixels). */
export function isInlineRenderable(kind: AttachmentKind | null): boolean {
  return kind === 'pdf' || kind === 'image';
}

export function attachmentLabelOf(url: string): { label: string; ext: string } {
  const clean = url.split('?')[0];
  const ext = (clean.split('.').pop() || '').toLowerCase();
  const map: Record<string, string> = {
    pdf: 'PDF document',
    doc: 'Word document', docx: 'Word document', docm: 'Word document',
    xls: 'Spreadsheet', xlsx: 'Spreadsheet', xlsm: 'Spreadsheet', csv: 'Spreadsheet',
    ppt: 'Presentation', pptx: 'Presentation',
    txt: 'Text file', rtf: 'Text file',
  };
  if (/\.(png|jpe?g|webp|gif|bmp|svg|avif)$/i.test(clean)) return { label: 'Image', ext };
  return { label: map[ext] || 'Attached file', ext };
}
