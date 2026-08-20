/**
 * Minimal PDF builders (no external deps).
 * Supports both structured text reports and lightweight vector graphics.
 */

function escapePdf(text) {
  return String(text ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

function rgb(hex) {
  const h = String(hex || '#111827').replace('#', '');
  const n = Number.parseInt(h.length === 3 ? h.split('').map((x) => x + x).join('') : h, 16);
  const r = ((n >> 16) & 255) / 255;
  const g = ((n >> 8) & 255) / 255;
  const b = (n & 255) / 255;
  return `${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)}`;
}

function textCmd(text, x, y, size = 10, color = '#111827', bold = false) {
  return `BT /F${bold ? '2' : '1'} ${size} Tf ${rgb(color)} rg ${x} ${y} Td (${escapePdf(text)}) Tj ET`;
}

function rectCmd(x, y, w, h, fill = '#ffffff', stroke = null, radius = 0) {
  // PDF has no native rounded rectangle primitive; a normal rectangle keeps this dependency-free.
  let out = `${rgb(fill)} rg ${x} ${y} ${w} ${h} re f`;
  if (stroke) out += ` ${rgb(stroke)} RG ${x} ${y} ${w} ${h} re S`;
  return out;
}

function circleCmd(cx, cy, r, fill = '#ffffff', stroke = null) {
  const k = 0.5522848 * r;
  let out = `${rgb(fill)} rg ${cx + r} ${cy} m ${cx + r} ${cy + k} ${cx + k} ${cy + r} ${cx} ${cy + r} c ${cx - k} ${cy + r} ${cx - r} ${cy + k} ${cx - r} ${cy} c ${cx - r} ${cy - k} ${cx - k} ${cy - r} ${cx} ${cy - r} c ${cx + k} ${cy - r} ${cx + r} ${cy - k} ${cx + r} ${cy} c f`;
  if (stroke) out += ` ${rgb(stroke)} RG ${cx + r} ${cy} m ${cx + r} ${cy + k} ${cx + k} ${cy + r} ${cx} ${cy + r} c ${cx - k} ${cy + r} ${cx - r} ${cy + k} ${cx - r} ${cy} c ${cx - r} ${cy - k} ${cx - k} ${cy - r} ${cx} ${cy - r} c ${cx + k} ${cy - r} ${cx + r} ${cy - k} ${cx + r} ${cy} c S`;
  return out;
}

const PAGE_WIDTH = 595;
const PAGE_HEIGHT = 842;
const VISUAL_PDF_FOOTER_Y = 28;

/**
 * Build a visual vector PDF. Pages contain drawing commands in PDF user-space coordinates.
 * @param {Array<{title?: string, subtitle?: string, commands: string[]}>} pages
 */
export function buildVisualPdf(pages, meta = {}) {
  const pageWidth = PAGE_WIDTH;
  const pageHeight = PAGE_HEIGHT;
  const objects = [];
  const addObj = (content) => { objects.push(content); return objects.length; };
  const fontId = addObj('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  const fontBoldId = addObj('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');
  const contentIds = [];
  const pageIds = [];

  pages.forEach((page) => {
    const commands = [...(page.commands || [])];
    if (page.title) commands.unshift(textCmd(page.title, 50, 790, 18, '#111827', true));
    if (page.subtitle) commands.splice(page.title ? 1 : 0, 0, textCmd(page.subtitle, 50, 770, 9, '#6b7280'));
    if (meta.footer) commands.push(textCmd(meta.footer, 50, VISUAL_PDF_FOOTER_Y, 7.5, '#9ca3af'));
    const stream = commands.join('\n');
    contentIds.push(addObj(`<< /Length ${Buffer.byteLength(stream, 'utf8')} >>\nstream\n${stream}\nendstream`));
  });

  contentIds.forEach((contentId) => {
    pageIds.push(addObj(`<< /Type /Page /Parent 0 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Contents ${contentId} 0 R /Resources << /Font << /F1 ${fontId} 0 R /F2 ${fontBoldId} 0 R >> >> >>`));
  });
  const kids = pageIds.map((id) => `${id} 0 R`).join(' ');
  const pagesId = addObj(`<< /Type /Pages /Kids [ ${kids} ] /Count ${pageIds.length} >>`);
  pageIds.forEach((pid) => { objects[pid - 1] = objects[pid - 1].replace('/Parent 0 0 R', `/Parent ${pagesId} 0 R`); });
  const catalogId = addObj(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);

  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((obj, i) => {
    offsets.push(Buffer.byteLength(pdf, 'utf8'));
    pdf += `${i + 1} 0 obj\n${obj}\nendobj\n`;
  });
  const xrefPos = Buffer.byteLength(pdf, 'utf8');
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i++) pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefPos}\n%%EOF`;
  return Buffer.from(pdf, 'utf8');
}

export function buildSimplePdf(pages, meta = {}) {
  const pageWidth = PAGE_WIDTH;
  const pageHeight = PAGE_HEIGHT;
  const margin = 50;
  const lineHeight = 14;
  const objects = [];
  const addObj = (content) => { objects.push(content); return objects.length; };
  const fontId = addObj('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  const fontBoldId = addObj('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');
  const pageIds = [];
  const contentIds = [];

  pages.forEach((page) => {
    const lines = [];
    let y = pageHeight - margin;
    if (page.title) { lines.push(`BT /F2 16 Tf ${margin} ${y} Td (${escapePdf(page.title)}) Tj ET`); y -= 24; }
    if (meta.subtitle && page === pages[0]) { lines.push(`BT /F1 10 Tf ${margin} ${y} Td (${escapePdf(meta.subtitle)}) Tj ET`); y -= 20; }
    page.lines.forEach((line) => {
      if (y < margin + 40) return;
      const isHeading = line.startsWith('## ');
      const text = isHeading ? line.slice(3) : line;
      const font = isHeading ? '/F2' : '/F1';
      const size = isHeading ? 12 : 10;
      if (isHeading) y -= 8;
      lines.push(`BT ${font} ${size} Tf ${margin} ${y} Td (${escapePdf(text)}) Tj ET`);
      y -= lineHeight + (isHeading ? 4 : 0);
    });
    if (meta.footer) lines.push(`BT /F1 8 Tf ${margin} 30 Td (${escapePdf(meta.footer)}) Tj ET`);
    const stream = lines.join('\n');
    contentIds.push(addObj(`<< /Length ${Buffer.byteLength(stream, 'utf8')} >>\nstream\n${stream}\nendstream`));
  });
  contentIds.forEach((contentId) => pageIds.push(addObj(`<< /Type /Page /Parent 0 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Contents ${contentId} 0 R /Resources << /Font << /F1 ${fontId} 0 R /F2 ${fontBoldId} 0 R >> >> >>`)));
  const kids = pageIds.map((id) => `${id} 0 R`).join(' ');
  const pagesId = addObj(`<< /Type /Pages /Kids [ ${kids} ] /Count ${pageIds.length} >>`);
  pageIds.forEach((pid) => { objects[pid - 1] = objects[pid - 1].replace('/Parent 0 0 R', `/Parent ${pagesId} 0 R`); });
  const catalogId = addObj(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);
  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((obj, i) => { offsets.push(Buffer.byteLength(pdf, 'utf8')); pdf += `${i + 1} 0 obj\n${obj}\nendobj\n`; });
  const xrefPos = Buffer.byteLength(pdf, 'utf8');
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let i = 1; i <= objects.length; i++) pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefPos}\n%%EOF`;
  return Buffer.from(pdf, 'utf8');
}

export function splitLinesToPages(allLines, linesPerPage = 48) {
  const pages = [];
  for (let i = 0; i < allLines.length; i += linesPerPage) pages.push({ lines: allLines.slice(i, i + linesPerPage) });
  if (pages.length === 0) pages.push({ lines: ['No data'] });
  return pages;
}

export { textCmd, rectCmd, circleCmd, rgb };
