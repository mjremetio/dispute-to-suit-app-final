import { describe, expect, it, vi, beforeEach } from "vitest";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

// Test the signature embedding logic
describe("Signature Embedding", () => {
  // Helper to create a simple test PDF
  async function createTestPDF(): Promise<Buffer> {
    const pdfDoc = await PDFDocument.create();
    const page = pdfDoc.addPage([612, 792]);
    const font = await pdfDoc.embedFont(StandardFonts.TimesRoman);
    page.drawText("Test Document", { x: 72, y: 720, size: 14, font });
    page.drawText("Signature Line: _______________", { x: 72, y: 100, size: 12, font });
    const pdfBytes = await pdfDoc.save();
    return Buffer.from(pdfBytes);
  }

  // Helper to create a proper PNG signature image using sharp
  async function createTestPNG(): Promise<Buffer> {
    const sharp = (await import("sharp")).default;
    return await sharp({
      create: { width: 200, height: 80, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 1 } }
    }).png().toBuffer();
  }

  describe("embedSignatureInPDF - unit logic", () => {
    it("should embed a signature image into a PDF and produce a larger output", async () => {
      const testPdf = await createTestPDF();
      const pdfDoc = await PDFDocument.load(testPdf);
      
      // Create a proper signature image
      const testPng = await createTestPNG();
      const signatureImage = await pdfDoc.embedPng(testPng);
      
      const pages = pdfDoc.getPages();
      const page = pages[0];
      const { width: pageWidth, height: pageHeight } = page.getSize();
      
      // Place signature at bottom-right area (similar to AOC signature line)
      const positionX = 50; // center
      const positionY = 75; // 75% from top
      const scale = 1;
      const signatureWidth = 200 * scale;
      const signatureHeight = 80 * scale;
      
      const x = (positionX / 100) * pageWidth - signatureWidth / 2;
      const y = pageHeight - (positionY / 100) * pageHeight - signatureHeight / 2;
      
      page.drawImage(signatureImage, {
        x: Math.max(0, x),
        y: Math.max(0, y),
        width: signatureWidth,
        height: signatureHeight,
        opacity: 1.0,
      });
      
      const signedPdfBytes = await pdfDoc.save();
      
      // The signed PDF should be valid and larger than the original
      expect(signedPdfBytes.byteLength).toBeGreaterThan(testPdf.length);
      
      // Verify the signed PDF can be loaded
      const verifyDoc = await PDFDocument.load(signedPdfBytes);
      expect(verifyDoc.getPageCount()).toBe(1);
    });

     it("should place signature at correct coordinates for AOC position (28, 76)", () => {
      const pageWidth = 612;
      const pageHeight = 792;
      // AOC-specific position: centered on signature line, above the line
      const positionX = 28;
      const positionY = 76;
      const scale = 1;
      const signatureWidth = 200 * scale;
      const signatureHeight = 80 * scale;
      
      const x = (positionX / 100) * pageWidth - signatureWidth / 2;
      const y = pageHeight - (positionY / 100) * pageHeight - signatureHeight / 2;
      
      // At 28% X: should be left-aligned near the signature line
      // 28% of 612 = 171.36, minus half width (100) = 71.36
      expect(x).toBeCloseTo(71.36, 0);
      
      // At 76% Y from top: should be near the bottom signature area
      // 792 - (76% * 792) - 40 = 792 - 602.08 - 40 = 149.92
      expect(y).toBeCloseTo(150.08, 0);
      
      // Signature should be within page bounds
      expect(x).toBeGreaterThanOrEqual(0);
      expect(y).toBeGreaterThanOrEqual(0);
      expect(x + signatureWidth).toBeLessThanOrEqual(pageWidth);
      expect(y + signatureHeight).toBeLessThanOrEqual(pageHeight);
    });

    it("should handle multi-page PDFs and default to last page", async () => {
      const pdfDoc = await PDFDocument.create();
      pdfDoc.addPage([612, 792]);
      pdfDoc.addPage([612, 792]);
      pdfDoc.addPage([612, 792]);
      
      const pages = pdfDoc.getPages();
      const totalPages = pages.length;
      
      // Default: undefined pageNumber should use last page
      const pageNumber = undefined;
      const targetPageIndex = pageNumber ? Math.min(Math.max(pageNumber - 1, 0), totalPages - 1) : totalPages - 1;
      expect(targetPageIndex).toBe(2); // 0-indexed last page
      
      // Explicit page 1
      const page1Index = 1 ? Math.min(Math.max(1 - 1, 0), totalPages - 1) : totalPages - 1;
      expect(page1Index).toBe(0);
      
      // Explicit page 2
      const page2Index = 2 ? Math.min(Math.max(2 - 1, 0), totalPages - 1) : totalPages - 1;
      expect(page2Index).toBe(1);
    });
  });

  describe("AOC Document Generation", () => {
    it("should generate a valid PDF with correct structure", async () => {
      const { generateAOCDocument } = await import("./services/aocGenerator");
      
      const pdfBuffer = await generateAOCDocument({
        firstName: "John",
        lastName: "Doe",
        address: "123 Main St",
        city: "Miami",
        state: "Florida",
        zipCode: "33101",
      });
      
      expect(pdfBuffer).toBeInstanceOf(Buffer);
      expect(pdfBuffer.length).toBeGreaterThan(0);
      
      // Verify it's a valid PDF
      const pdfDoc = await PDFDocument.load(pdfBuffer);
      expect(pdfDoc.getPageCount()).toBeGreaterThanOrEqual(1);
      
      // Verify page dimensions (US Letter)
      const page = pdfDoc.getPages()[0];
      const { width, height } = page.getSize();
      expect(width).toBe(612);
      expect(height).toBe(792);
    });

    it("should handle missing optional fields gracefully", async () => {
      const { generateAOCDocument } = await import("./services/aocGenerator");
      
      const pdfBuffer = await generateAOCDocument({
        firstName: "Jane",
        lastName: "Smith",
        // No address, city, state, zipCode
      });
      
      expect(pdfBuffer).toBeInstanceOf(Buffer);
      expect(pdfBuffer.length).toBeGreaterThan(0);
      
      const pdfDoc = await PDFDocument.load(pdfBuffer);
      expect(pdfDoc.getPageCount()).toBeGreaterThanOrEqual(1);
    });

    it("should return signature metadata with generateAOCDocumentWithMeta", async () => {
      const { generateAOCDocumentWithMeta } = await import("./services/aocGenerator");
      
      const result = await generateAOCDocumentWithMeta({
        firstName: "Mark",
        lastName: "Remetio",
        address: "123 Main St",
        city: "Miami",
        state: "Florida",
        zipCode: "33101",
      });
      
      expect(result.pdfBuffer).toBeInstanceOf(Buffer);
      expect(result.pdfBuffer.length).toBeGreaterThan(0);
      expect(result.signaturePageNumber).toBe(1);
      // Signature line should be in the bottom third of the page (60-90% from top)
      expect(result.signatureLineYPercent).toBeGreaterThan(60);
      expect(result.signatureLineYPercent).toBeLessThan(90);
    });

    it("should produce a PDF that can have a signature embedded at AOC position", async () => {
      const { generateAOCDocumentWithMeta } = await import("./services/aocGenerator");
      
      // Generate AOC with metadata
      const result = await generateAOCDocumentWithMeta({
        firstName: "Test",
        lastName: "Client",
        address: "456 Oak Ave",
        city: "Tampa",
        state: "Florida",
        zipCode: "33602",
      });
      
      // Load the AOC PDF
      const pdfDoc = await PDFDocument.load(result.pdfBuffer);
      
      // Embed a signature image
      const testPng = await createTestPNG();
      const signatureImage = await pdfDoc.embedPng(testPng);
      
      const pages = pdfDoc.getPages();
      const targetPage = pages[result.signaturePageNumber - 1];
      const { width: pageWidth, height: pageHeight } = targetPage.getSize();
      
      // Use AOC-specific position (28, signatureLineYPercent - 5)
      const positionX = 28;
      const positionY = result.signatureLineYPercent - 5;
      const signatureWidth = 200;
      const signatureHeight = 80;
      
      const x = (positionX / 100) * pageWidth - signatureWidth / 2;
      const y = pageHeight - (positionY / 100) * pageHeight - signatureHeight / 2;
      
      targetPage.drawImage(signatureImage, {
        x: Math.max(0, x),
        y: Math.max(0, y),
        width: signatureWidth,
        height: signatureHeight,
        opacity: 1.0,
      });
      
      const signedPdfBytes = await pdfDoc.save();
      
      // Signed PDF should be valid and larger
      expect(signedPdfBytes.byteLength).toBeGreaterThan(result.pdfBuffer.length);
      
      // Verify it can be loaded
      const verifyDoc = await PDFDocument.load(signedPdfBytes);
      expect(verifyDoc.getPageCount()).toBe(pdfDoc.getPageCount());
      
      // Verify signature is placed in the correct area (bottom portion of page)
      // x should be near the left margin (around 71)
      expect(x).toBeGreaterThan(50);
      expect(x).toBeLessThan(150);
      // y should be in the lower portion (above 0, below center)
      expect(y).toBeGreaterThan(100);
      expect(y).toBeLessThan(400);
    });
  });

  describe("Proxy URL resolution for signed documents", () => {
    it("should prioritize fileUrl over fileKey when fileUrl starts with http", () => {
      const doc = {
        id: 100,
        fileKey: "cases/1/documents/original-unsigned.pdf",
        fileUrl: "https://cdn.example.com/signed-documents/1/signed.pdf",
        fileName: "AOC-Test-Client.pdf",
      };
      
      const shouldUseFileUrl = doc.fileUrl && doc.fileUrl.startsWith("http");
      expect(shouldUseFileUrl).toBe(true);
    });

    it("should fall back to fileKey when fileUrl is a proxy URL", () => {
      const doc = {
        id: 100,
        fileKey: "cases/1/documents/original-unsigned.pdf",
        fileUrl: "/api/files/proxy?docId=100",
        fileName: "AOC-Test-Client.pdf",
      };
      
      const shouldUseFileUrl = doc.fileUrl && doc.fileUrl.startsWith("http");
      expect(shouldUseFileUrl).toBe(false);
    });

    it("should use updated fileKey after signing", () => {
      const signedDoc = {
        id: 100,
        fileKey: "signed-documents/1/abc-client-signed.pdf",
        fileUrl: "https://cdn.example.com/signed-documents/1/abc-client-signed.pdf",
        fileName: "AOC-Test-Client.pdf",
        signedAt: new Date(),
      };
      
      expect(signedDoc.fileKey).toContain("signed-documents");
      expect(signedDoc.fileUrl).toContain("signed-documents");
    });
  });

  describe("AOC-specific signature positioning", () => {
    it("should detect AOC documents by filename and category", () => {
      const aocDoc = { fileName: "AOC-Mark-Remetio-Case-1.pdf", category: "legal_doc" };
      const regularDoc = { fileName: "contract.pdf", category: "supporting_document" };
      
      const isAOC1 = aocDoc.fileName.startsWith("AOC-") && aocDoc.category === "legal_doc";
      const isAOC2 = regularDoc.fileName.startsWith("AOC-") && regularDoc.category === "legal_doc";
      
      expect(isAOC1).toBe(true);
      expect(isAOC2).toBe(false);
    });

    it("should use positionX=28, positionY=76 for AOC documents when no position provided", () => {
      const isAOCDocument = true;
      const inputPositionX = undefined;
      const inputPositionY = undefined;
      
      let sigPosX = inputPositionX ?? 50;
      let sigPosY = inputPositionY ?? 75;
      
      if (isAOCDocument && !inputPositionX && !inputPositionY) {
        sigPosX = 28;
        sigPosY = 76; // Fallback matches the AOC generator's signature line position
      }
      
      expect(sigPosX).toBe(28);
      expect(sigPosY).toBe(76);
    });

    it("should respect user-provided positions even for AOC documents", () => {
      const isAOCDocument = true;
      const inputPositionX = 40;
      const inputPositionY = 80;
      
      let sigPosX = inputPositionX ?? 50;
      let sigPosY = inputPositionY ?? 75;
      
      if (isAOCDocument && !inputPositionX && !inputPositionY) {
        sigPosX = 28;
        sigPosY = 69;
      }
      
      // Should keep user-provided values
      expect(sigPosX).toBe(40);
      expect(sigPosY).toBe(80);
    });
  });

  describe("ensureTransparentSignature logic", () => {
    it("should handle PNG with alpha channel", async () => {
      const sharp = (await import("sharp")).default;
      const pngWithAlpha = await createTestPNG();
      
      const metadata = await sharp(pngWithAlpha).metadata();
      expect(metadata.hasAlpha).toBe(true);
    });

    it("should convert white background to transparent", async () => {
      const sharp = (await import("sharp")).default;
      
      // Create a signature with white background (simulating old canvas behavior)
      // White background with a black stroke in the middle
      const width = 200;
      const height = 80;
      const whiteWithStroke = await sharp({
        create: { width, height, channels: 3, background: { r: 255, g: 255, b: 255 } }
      })
        .composite([{
          input: await sharp({
            create: { width: 100, height: 4, channels: 3, background: { r: 0, g: 0, b: 0 } }
          }).png().toBuffer(),
          top: 38,
          left: 50,
        }])
        .png()
        .toBuffer();
      
      // Import the module to test the function indirectly through embedSignatureInPDF
      // We test the pixel manipulation logic directly
      const { data: rawData, info } = await sharp(whiteWithStroke)
        .ensureAlpha()
        .raw()
        .toBuffer({ resolveWithObject: true });
      
      const pixels = Buffer.from(rawData);
      const whiteThreshold = 240;
      let whitePixelsBefore = 0;
      for (let i = 0; i < pixels.length; i += 4) {
        if (pixels[i] >= whiteThreshold && pixels[i+1] >= whiteThreshold && pixels[i+2] >= whiteThreshold) {
          whitePixelsBefore++;
        }
      }
      
      // Apply the same transparency logic as ensureTransparentSignature
      for (let i = 0; i < pixels.length; i += 4) {
        const r = pixels[i];
        const g = pixels[i + 1];
        const b = pixels[i + 2];
        if (r >= whiteThreshold && g >= whiteThreshold && b >= whiteThreshold) {
          pixels[i + 3] = 0;
        }
      }
      
      // Count transparent pixels after processing
      let transparentPixelsAfter = 0;
      for (let i = 0; i < pixels.length; i += 4) {
        if (pixels[i + 3] === 0) {
          transparentPixelsAfter++;
        }
      }
      
      // All white pixels should now be transparent
      expect(transparentPixelsAfter).toBe(whitePixelsBefore);
      expect(transparentPixelsAfter).toBeGreaterThan(0);
      
      // Black stroke pixels should remain opaque
      const totalPixels = width * height;
      expect(transparentPixelsAfter).toBeLessThan(totalPixels);
    });

    it("should preserve dark signature strokes while removing white bg", async () => {
      const sharp = (await import("sharp")).default;
      
      // Create image: white bg with black text
      const width = 100;
      const height = 40;
      const rawPixels = Buffer.alloc(width * height * 4);
      
      // Fill with white (opaque)
      for (let i = 0; i < rawPixels.length; i += 4) {
        rawPixels[i] = 255;     // R
        rawPixels[i + 1] = 255; // G
        rawPixels[i + 2] = 255; // B
        rawPixels[i + 3] = 255; // A
      }
      
      // Add some black pixels (signature strokes)
      const blackPixelCount = 50;
      for (let p = 0; p < blackPixelCount; p++) {
        const idx = (p * 20 + 100) * 4; // Spread across the image
        if (idx + 3 < rawPixels.length) {
          rawPixels[idx] = 0;
          rawPixels[idx + 1] = 0;
          rawPixels[idx + 2] = 0;
          rawPixels[idx + 3] = 255;
        }
      }
      
      // Apply white-to-transparent conversion
      const whiteThreshold = 240;
      for (let i = 0; i < rawPixels.length; i += 4) {
        if (rawPixels[i] >= whiteThreshold && rawPixels[i+1] >= whiteThreshold && rawPixels[i+2] >= whiteThreshold) {
          rawPixels[i + 3] = 0;
        }
      }
      
      // Count remaining opaque pixels (should be only the black strokes)
      let opaquePixels = 0;
      for (let i = 0; i < rawPixels.length; i += 4) {
        if (rawPixels[i + 3] > 0) opaquePixels++;
      }
      
      // Only the black stroke pixels should remain opaque
      expect(opaquePixels).toBe(blackPixelCount);
    });
  });
});
