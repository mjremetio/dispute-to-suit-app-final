import { PDFDocument, PDFFont, PDFPage, rgb, StandardFonts } from "pdf-lib";

/**
 * Client data required to populate the AOC document.
 */
export interface AOCClientData {
  firstName: string;
  lastName: string;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
}

/**
 * Result of AOC generation including the PDF buffer and signature metadata.
 */
export interface AOCGenerationResult {
  pdfBuffer: Buffer;
  /** Y position of the signature line as percentage from top (0-100) for the embedder */
  signatureLineYPercent: number;
  /** Page number where the signature line is located (1-indexed) */
  signaturePageNumber: number;
}

/**
 * Generates an "Assignment of Claim for Damages" (AOC) PDF
 * strictly following the provided ReferralAOC.docx legal template.
 * Client details are auto-populated into the document.
 *
 * Returns a Buffer (for backward compatibility) — call generateAOCDocumentWithMeta()
 * if you also need signature-line coordinates.
 */
export async function generateAOCDocument(
  clientData: AOCClientData
): Promise<Buffer> {
  const result = await generateAOCDocumentWithMeta(clientData);
  return result.pdfBuffer;
}

/**
 * Generates the AOC PDF and returns both the buffer and signature positioning metadata.
 */
export async function generateAOCDocumentWithMeta(
  clientData: AOCClientData
): Promise<AOCGenerationResult> {
  const pdfDoc = await PDFDocument.create();

  const timesRoman = await pdfDoc.embedFont(StandardFonts.TimesRoman);
  const timesRomanBold = await pdfDoc.embedFont(StandardFonts.TimesRomanBold);
  const timesRomanItalic = await pdfDoc.embedFont(StandardFonts.TimesRomanItalic);

  const pageWidth = 612; // US Letter
  const pageHeight = 792;
  const marginLeft = 72;
  const marginRight = 72;
  const contentWidth = pageWidth - marginLeft - marginRight;

  let page = pdfDoc.addPage([pageWidth, pageHeight]);
  let yPos = pageHeight - 72;
  let currentPageNumber = 1;

  const fullName = `${clientData.firstName} ${clientData.lastName}`;
  const clientAddress = clientData.address || "_____________________";
  const clientCity = clientData.city || "____________";
  const clientState = clientData.state || "________";
  const clientPostalCode = clientData.zipCode || "__________";
  const todayDate = formatDate(new Date());

  // Track signature line position for the embedder
  let signatureLineY = 0;
  let signaturePageNumber = 1;

  // --- Helper functions ---

  function drawCenteredText(text: string, y: number, font: PDFFont, size: number) {
    const textWidth = font.widthOfTextAtSize(text, size);
    page.drawText(text, {
      x: (pageWidth - textWidth) / 2,
      y,
      size,
      font,
      color: rgb(0, 0, 0),
    });
  }

  function drawText(text: string, x: number, y: number, font: PDFFont, size: number, color = rgb(0, 0, 0)) {
    page.drawText(text, { x, y, size, font, color });
  }

  function ensureSpace(needed: number) {
    if (yPos < needed + 60) {
      page = pdfDoc.addPage([pageWidth, pageHeight]);
      yPos = pageHeight - 72;
      currentPageNumber++;
    }
  }

  /**
   * Draws wrapped text. Returns the new Y position after drawing.
   */
  function drawWrappedText(
    text: string,
    x: number,
    startY: number,
    font: PDFFont,
    size: number,
    maxWidth?: number,
  ): number {
    const mw = maxWidth || contentWidth;
    const words = text.split(" ");
    let currentLine = "";
    let currentY = startY;
    const lineHeight = size * 1.4;

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const testWidth = font.widthOfTextAtSize(testLine, size);

      if (testWidth > mw && currentLine) {
        drawText(currentLine, x, currentY, font, size);
        currentY -= lineHeight;
        currentLine = word;
        ensureSpace(60);
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) {
      drawText(currentLine, x, currentY, font, size);
      currentY -= lineHeight;
    }
    return currentY;
  }

  function drawLine(x1: number, y: number, x2: number, thickness = 0.5) {
    page.drawLine({
      start: { x: x1, y },
      end: { x: x2, y },
      thickness,
      color: rgb(0, 0, 0),
    });
  }

  // ================================================================
  // MAIN BODY PARAGRAPH (matches DOCX exactly — no title header)
  // ================================================================
  const bodyParagraph =
    `FOR VALUE RECEIVED, the ${fullName} ` +
    `("Assignor"), whose address is ${clientAddress}, ${clientCity}, ` +
    `${clientState}, ${clientPostalCode}, hereby sells and transfers 90% interest ` +
    `to Kway All Around Consulting ("Assignee"), whose address is 1000 W Palm Drive ` +
    `#349502, Homestead, Florida, 33034, and its successors assigns, and personal ` +
    `representatives, any and all claims, demands, and cause or causes of action of any kind ` +
    `whatsoever, which the undersigned has or may have against any person or persons ` +
    `arising from the following types of claims:`;

  yPos = drawWrappedText(bodyParagraph, marginLeft, yPos, timesRoman, 11, contentWidth);
  yPos -= 8;

  // ================================================================
  // NUMBERED LIST OF CLAIMS
  // ================================================================
  const claims = [
    `the Truth and Lending Act ("TILA") 15 U.S.C. §1501`,
    `the Fair Credit Reporting Act ("FCRA"), 15 U.S.C. § 1681-1681x;`,
    `the Fair Debt Collection Practices Act ("FDCPA"), 15 U.S.C. § 1692-1692p;`,
    `Uniform Commercial Code, Article 9, Part 6;`,
    `the Fair Credit Billing Act ("FCBA"), 15 U.S.C. 1666-1666j;`,
    `the Telephone Consumer Protection Act ("TCPA") 47 U.S.C. § 227 and,`,
    `any applicable state laws related to a consumer law, tort, and negligence legal claims.`,
  ];

  const numIndent = marginLeft + 20;
  for (let i = 0; i < claims.length; i++) {
    ensureSpace(30);
    const numStr = `${i + 1}. `;
    drawText(numStr, marginLeft + 5, yPos, timesRoman, 11);
    yPos = drawWrappedText(claims[i], numIndent, yPos, timesRoman, 11, contentWidth - 25);
    yPos -= 2;
  }
  yPos -= 8;

  // ================================================================
  // SECOND BODY PARAGRAPH
  // ================================================================
  ensureSpace(80);
  const secondParagraph =
    `The Assignee may in its own name, or under the Assignor's name, and for its own ` +
    `benefit prosecute, collect, settle, compromise, and grant releases on said claim(s) in its ` +
    `sole discretion deemed advisable. Signature or action on this Assignment by Assignee ` +
    `constitutes acceptance.`;

  yPos = drawWrappedText(secondParagraph, marginLeft, yPos, timesRoman, 11, contentWidth);
  yPos -= 8;

  // ================================================================
  // SIGNED UNDER SEAL
  // ================================================================
  ensureSpace(40);
  yPos = drawWrappedText(
    "Signed under seal on the date indicated below.",
    marginLeft, yPos, timesRoman, 11, contentWidth,
  );
  yPos -= 20;

  // ================================================================
  // ASSIGNOR SECTION
  // ================================================================
  ensureSpace(80);
  drawText("ASSIGNOR", marginLeft, yPos, timesRomanBold, 12);
  yPos -= 30;

  // Signature line
  drawLine(marginLeft, yPos, marginLeft + 280, 0.75);
  yPos -= 18;

  // Name and Date on same line
  drawText(fullName, marginLeft, yPos, timesRoman, 11);
  const dateX = pageWidth - marginRight - timesRoman.widthOfTextAtSize(todayDate, 11);
  drawText(todayDate, dateX, yPos, timesRoman, 11);
  yPos -= 30;

  // ================================================================
  // ACKNOWLEDGMENT OF RECEIPT OF NOTICE
  // ================================================================
  ensureSpace(120);
  drawCenteredText("Acknowledgment of Receipt of Notice", yPos, timesRomanBold, 12);
  yPos -= 22;

  const ackParagraph =
    `I, ${fullName}, hereby acknowledge with my digital ` +
    `signature, receipt of ASSIGNMENT OF CLAIM FOR DAMAGES. I confirm the fact that I ` +
    `agree and understand what I am signing.`;
  yPos = drawWrappedText(ackParagraph, marginLeft, yPos, timesRoman, 11, contentWidth);
  yPos -= 6;

  // ESIGN Act disclaimer (italic text with asterisk)
  const esignDisclaimer =
    `*Digital Signatures: In 2000, the U.S. Electronic Signatures in Global and National Commerce ` +
    `(ESIGN) Act established electronic records and signatures as legally binding, having the same ` +
    `legal effects as traditional paper documents and handwritten signatures. Read more at the FTC ` +
    `web site: http://www.ftc.gov/os/2001/06/esign7.htm`;
  yPos = drawWrappedText(esignDisclaimer, marginLeft, yPos, timesRomanItalic, 8, contentWidth);
  yPos -= 80; // Leave space for the e-signature image (80px tall) above the line

  // ================================================================
  // SIGNATURE LINE (where e-signature will be placed)
  // ================================================================
  ensureSpace(60);

  // Record the signature line position for the embedder
  // The signature image should be placed ABOVE this line
  signatureLineY = yPos;
  signaturePageNumber = currentPageNumber;

  drawLine(marginLeft, yPos, marginLeft + 200, 0.75);
  yPos -= 15;
  drawText("(Signature)", marginLeft, yPos, timesRomanItalic, 10);

  // Convert signature line Y position to percentage from top (0-100)
  // PDF Y=0 is bottom, so percentage from top = (pageHeight - signatureLineY) / pageHeight * 100
  const signatureLineYPercent = ((pageHeight - signatureLineY) / pageHeight) * 100;

  const pdfBytes = await pdfDoc.save();
  return {
    pdfBuffer: Buffer.from(pdfBytes),
    signatureLineYPercent,
    signaturePageNumber,
  };
}

function formatDate(date: Date): string {
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
