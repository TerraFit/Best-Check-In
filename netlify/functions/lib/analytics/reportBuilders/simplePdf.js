/**
 * Minimal PDF builder (no external deps) for structured text reports.
 * Produces valid multi-page PDF 1.4 with Helvetica text.
 */

function escapePdf(text) {
  return String(text ?? '')
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

/**
 * @param {Array<{ title?: string, lines: string[] }>} pages
 * @param {{ title?: string, subtitle?: string, footer?: string }} meta
 */
export function buildSimplePdf(pages, meta = {}) {
  const pageWidth = 595;
  const pageHeight = 842;
  const margin = 50;
  const lineHeight = 14;
  const objects = [];
  const addObj = (content) => {
    objects.push(content);
    return objects.length;
  };

  // Font
  const fontId = addObj('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');
  const fontBoldId = addObj('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>');

  const pageIds = [];
  const contentIds = [];

  pages.forEach((page) => {
    const lines = [];
    let y = pageHeight - margin;

    if (page.title) {
      lines.push(`BT /F2 16 Tf ${margin} ${y} Td (${escapePdf(page.title)}) Tj ET`);
      y -= 24;
    }
    if (meta.subtitle && page === pages[0]) {
      lines.push(`BT /F1 10 Tf ${margin} ${y} Td (${escapePdf(meta.subtitle)}) Tj ET`);
      y -= 20;
    }

    page.lines.forEach((line) => {
      if (y < margin + 40) {
        // stop filling this page content; remaining handled by caller splitting
        return;
      }
      const isHeading = line.startsWith('## ');
      const text = isHeading ? line.slice(3) : line;
      const font = isHeading ? '/F2' : '/F1';
      const size = isHeading ? 12 : 10;
      if (isHeading) y -= 8;
      lines.push(`BT ${font} ${size} Tf ${margin} ${y} Td (${escapePdf(text)}) Tj ET`);
      y -= lineHeight + (isHeading ? 4 : 0);
    });

    if (meta.footer) {
      lines.push(
        `BT /F1 8 Tf ${margin} 30 Td (${escapePdf(meta.footer)}) Tj ET`
      );
    }

    const stream = lines.join('\n');
    const contentId = addObj(
      `<< /Length ${Buffer.byteLength(stream, 'utf8')} >>\nstream\n${stream}\nendstream`
    );
    contentIds.push(contentId);
  });

  contentIds.forEach((contentId) => {
    const pageId = addObj(
      `<< /Type /Page /Parent 0 0 R /MediaBox [0 0 ${pageWidth} ${pageHeight}] /Contents ${contentId} 0 R /Resources << /Font << /F1 ${fontId} 0 R /F2 ${fontBoldId} 0 R >> >> >>`
    );
    pageIds.push(pageId);
  });

  const kids = pageIds.map((id) => `${id} 0 R`).join(' ');
  const pagesId = addObj(`<< /Type /Pages /Kids [ ${kids} ] /Count ${pageIds.length} >>`);

  // Fix Parent refs
  pageIds.forEach((pid, i) => {
    objects[pid - 1] = objects[pid - 1].replace('/Parent 0 0 R', `/Parent ${pagesId} 0 R`);
  });

  const catalogId = addObj(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);

  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((obj, i) => {
    offsets.push(Buffer.byteLength(pdf, 'utf8'));
    pdf += `${i + 1} 0 obj\n${obj}\nendobj\n`;
  });
  const xrefPos = Buffer.byteLength(pdf, 'utf8');
  pdf += `xref\n0 ${objects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  for (let i = 1; i <= objects.length; i++) {
    pdf += `${String(offsets[i]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\n`;
  pdf += `startxref\n${xrefPos}\n%%EOF`;

  return Buffer.from(pdf, 'utf8');
}

export function splitLinesToPages(allLines, linesPerPage = 48) {
  const pages = [];
  for (let i = 0; i < allLines.length; i += linesPerPage) {
    pages.push({ lines: allLines.slice(i, i + linesPerPage) });
  }
  if (pages.length === 0) pages.push({ lines: ['No data'] });
  return pages;
}
