import * as fs from 'fs';
import * as path from 'path';
import { PDFDocument, rgb, StandardFonts } from 'pdf-lib';
import { AGREEMENT_TEXT, AGREEMENT_VERSION } from '../lib/agreement-text';

function toWinAnsi(text: string): string {
  return text
    .replace(/[\u2018\u2019]/g, "'")   // smart single quotes
    .replace(/[\u201C\u201D]/g, '"')   // smart double quotes
    .replace(/\u2014/g, '--')          // em dash
    .replace(/\u2013/g, '-')           // en dash
    .replace(/\u2026/g, '...')         // ellipsis
    .replace(/\u2022/g, '*')           // bullet
    .replace(/\u00A0/g, ' ')           // NBSP
    .replace(/\u2500/g, '-')           // light horizontal line
    .replace(/\u2501/g, '-')           // heavy horizontal line
    .replace(/[\u2502-\u257F]/g, '|') // other box-drawing characters
    .replace(/\u00AE/g, '(R)')         // registered trademark
    .replace(/\u00A9/g, '(C)')         // copyright
    .replace(/\u2122/g, '(TM)')        // trademark
    .replace(/\u00B0/g, ' deg')        // degree
    .replace(/[^\x00-\xFF]/g, '?');    // fallback for non-Latin1
}

function wrapText(text: string, maxWidth: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let current = '';
  for (const word of words) {
    if ((current + ' ' + word).trim().length > maxWidth) {
      lines.push(current.trim());
      current = word;
    } else {
      current = current ? current + ' ' + word : word;
    }
  }
  if (current) lines.push(current.trim());
  return lines;
}

async function main() {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontOblique = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);
  
  const fontSize = 10;
  const lineHeight = 14;
  const margin = 50;
  const pageWidth = 612;
  const pageHeight = 792;
  const usableWidth = pageWidth - margin * 2;
  const maxCharsPerLine = Math.floor(usableWidth / (fontSize * 0.53));

  const COLORS = {
    primary: rgb(0.85, 0.35, 0.1),    // Warm orange
    primaryDark: rgb(0.1, 0.2, 0.35), // Dark slate blue
    text: rgb(0.15, 0.15, 0.15),       // Dark gray/black
    secondaryText: rgb(0.4, 0.4, 0.4), // Medium gray
    border: rgb(0.8, 0.8, 0.8),       // Light gray
    white: rgb(1, 1, 1),
    bgLight: rgb(0.97, 0.97, 0.97),
  };

  // --- PAGE 1: TITLE PAGE ---
  let page = pdfDoc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  const drawFooter = (pageNum: number) => {
    page.drawText(
      toWinAnsi(`MicroStay.us | Agreement Version 6.0 | Page ${pageNum}`),
      { x: pageWidth - margin - 180, y: 30, size: 8, font, color: COLORS.secondaryText }
    );
  };

  // Top header text
  page.drawText(
    toWinAnsi('MICROSTAY PARTNER AGREEMENT'),
    { x: (pageWidth - fontBold.widthOfTextAtSize('MICROSTAY PARTNER AGREEMENT', 9)) / 2, y: y - 20, size: 9, font: fontBold, color: COLORS.secondaryText }
  );

  // Big Bold "MICROSTAY" Title
  y -= 100;
  page.drawText(
    'MICROSTAY',
    { x: (pageWidth - fontBold.widthOfTextAtSize('MICROSTAY', 42)) / 2, y, size: 42, font: fontBold, color: COLORS.primary }
  );

  // Sub title "PARTNER AGREEMENT"
  y -= 45;
  page.drawText(
    'PARTNER AGREEMENT',
    { x: (pageWidth - fontBold.widthOfTextAtSize('PARTNER AGREEMENT', 24)) / 2, y, size: 24, font: fontBold, color: COLORS.primaryDark }
  );

  // Horizontal divider
  y -= 25;
  page.drawLine({
    start: { x: margin, y },
    end: { x: pageWidth - margin, y },
    thickness: 2,
    color: COLORS.primaryDark,
  });

  // Target subtitle
  y -= 35;
  page.drawText(
    'For hotels, motels, and participating lodging properties',
    { x: (pageWidth - font.widthOfTextAtSize('For hotels, motels, and participating lodging properties', 14)) / 2, y, size: 14, font, color: COLORS.secondaryText }
  );

  // Metadata Table
  y -= 100;
  const tableData: [string, string][] = [
    ['Operated by', 'MICROSTAY HOLDINGS LLC d/b/a MicroStay.us'],
    ['Agreement Version', '6.0 - Partner Execution Version'],
    ['Last Updated', 'August 18, 2026'],
    ['Effective Date', 'Date of Partner digital acceptance'],
    ['Standard Commission', 'Flat 12% of Eligible Booking Amount on commissionable stays'],
  ];

  const col1Width = 140;
  const col2Width = usableWidth - col1Width;
  const rowHeight = 22;
  const tableHeight = rowHeight * tableData.length;

  // Draw table boundaries and headers
  page.drawRectangle({
    x: margin,
    y: y - tableHeight,
    width: usableWidth,
    height: tableHeight,
    borderWidth: 1,
    borderColor: COLORS.border,
  });

  // Draw vertical line dividing columns
  page.drawLine({
    start: { x: margin + col1Width, y },
    end: { x: margin + col1Width, y: y - tableHeight },
    thickness: 1,
    color: COLORS.border,
  });

  tableData.forEach(([key, val], idx) => {
    const rowY = y - (idx + 1) * rowHeight;
    // Draw row separator
    if (idx < tableData.length - 1) {
      page.drawLine({
        start: { x: margin, y: rowY },
        end: { x: pageWidth - margin, y: rowY },
        thickness: 1,
        color: COLORS.border,
      });
    }

    // Text in Col 1 (Bold)
    page.drawText(
      toWinAnsi(key),
      { x: margin + 8, y: rowY + 6, size: 9, font: fontBold, color: COLORS.primaryDark }
    );

    // Text in Col 2
    page.drawText(
      toWinAnsi(val),
      { x: margin + col1Width + 8, y: rowY + 6, size: 9, font, color: COLORS.text }
    );
  });

  // Note block under table
  y -= tableHeight + 40;
  const noteTextLines = wrapText(
    'This agreement is formatted for electronic acceptance through the MicroStay Partner signup process. No wet-ink signature is required when the Partner executes the Agreement using MicroStay\'s approved digital acceptance flow.',
    65
  );

  noteTextLines.forEach((line) => {
    page.drawText(
      toWinAnsi(line),
      {
        x: (pageWidth - fontOblique.widthOfTextAtSize(toWinAnsi(line), 10)) / 2,
        y,
        size: 10,
        font: fontOblique,
        color: COLORS.text,
      }
    );
    y -= 15;
  });

  drawFooter(1);

  // --- PAGES 2-14: AGREEMENT CONTENT ---
  let pageNum = 2;
  page = pdfDoc.addPage([pageWidth, pageHeight]);
  y = pageHeight - margin;

  const nextPage = () => {
    drawFooter(pageNum);
    pageNum++;
    page = pdfDoc.addPage([pageWidth, pageHeight]);
    y = pageHeight - margin;
  };

  const drawLine = (
    text: string,
    fnt = font,
    size = fontSize,
    color = COLORS.text,
    align: 'left' | 'center' | 'right' = 'left'
  ) => {
    if (y < margin + lineHeight * 3) nextPage();

    const cleanText = toWinAnsi(text);
    const textWidth = fnt.widthOfTextAtSize(cleanText, size);
    let x = margin;

    if (align === 'center') {
      x = (pageWidth - textWidth) / 2;
    } else if (align === 'right') {
      x = pageWidth - margin - textWidth;
    }

    page.drawText(cleanText, { x, y, size, font: fnt, color });
    y -= lineHeight;
  };

  const drawBlank = () => { y -= lineHeight / 2; };

  // Parse lines of agreement text
  const rawLines = AGREEMENT_TEXT.split('\n');
  const renderedHeadings = new Set<string>();

  // Skip the cover page titles in the text array to prevent duplicate title rendering
  let textStarted = false;

  for (const rawLine of rawLines) {
    const line = rawLine.trim();

    if (!line) {
      if (textStarted) drawBlank();
      continue;
    }

    // Skip the cover titles and start reading once we hit the introduction text
    if (!textStarted) {
      if (line.startsWith('This MicroStay Partner Agreement')) {
        textStarted = true;
      } else {
        continue;
      }
    }

    // Main section headings (e.g. "1. ACCEPTANCE OF AGREEMENT" or "APPENDIX A...")
    const isHeading =
      /^[A-Z][A-Z\s&\-]{5,}$/.test(line) && !/^\d+\./.test(line);
    const isNumberedHeading = /^\d+\.\s+[A-Z]/.test(line);
    const isAppendix = line.startsWith('APPENDIX');

    if ((isHeading || isNumberedHeading || isAppendix) && !renderedHeadings.has(line)) {
      renderedHeadings.add(line);
      drawBlank();
      drawLine(line, fontBold, 11, COLORS.primaryDark);
      continue;
    }

    // Checkbox items in Appendix B
    if (line.startsWith('[ ]') || line.startsWith('☐')) {
      const cleanLine = line.replace(/^\[\s*\]|^☐/, '• ');
      const wrapped = wrapText(cleanLine, maxCharsPerLine);
      for (const wl of wrapped) {
        drawLine(wl, font, fontSize, COLORS.text);
      }
      continue;
    }

    // Table rows in Appendix C (Field | Digital Acceptance Record)
    if (line.includes('|')) {
      const [col1, col2] = line.split('|').map((s) => s.trim());
      const cleanLine = `${col1.padEnd(46)} | ${col2}`;
      drawLine(cleanLine, font, 9, COLORS.text);
      continue;
    }

    // Normal paragraph text
    const wrapped = wrapText(line, maxCharsPerLine);
    for (const wl of wrapped) {
      drawLine(wl, font, fontSize, COLORS.text);
    }
  }

  // Draw final page footer
  drawFooter(pageNum);

  const outputPath = path.join(__dirname, '../public/microstay-partneragreement.pdf');
  const pdfBytes = await pdfDoc.save();
  fs.writeFileSync(outputPath, pdfBytes);
  console.log(`Successfully generated unsigned Partner Agreement PDF at: ${outputPath}`);
}

main().catch((err) => {
  console.error('Error generating PDF:', err);
  process.exit(1);
});
