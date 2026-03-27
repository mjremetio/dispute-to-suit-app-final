import { PDFDocument } from "pdf-lib";
import sharp from "sharp";

/**
 * Detect the number of pages in a PDF document
 * @param pdfUrl URL of the PDF document
 * @returns Number of pages in the PDF
 */
export async function detectPDFPageCount(pdfUrl: string): Promise<number> {
  try {
    const pdfResponse = await fetch(pdfUrl);
    const pdfBytes = await pdfResponse.arrayBuffer();
    const pdfDoc = await PDFDocument.load(pdfBytes);
    return pdfDoc.getPageCount();
  } catch (error) {
    console.error("Error detecting PDF page count:", error);
    return 1; // Default to 1 page if detection fails
  }
}

/**
 * Process signature image to ensure transparency
 * Removes white/near-white backgrounds and ensures PNG with alpha channel
 */
async function ensureTransparentSignature(signatureBuffer: Buffer): Promise<Buffer> {
  try {
    // Get image metadata
    const metadata = await sharp(signatureBuffer).metadata();
    const width = metadata.width || 200;
    const height = metadata.height || 80;

    // Convert to raw RGBA pixels
    const { data, info } = await sharp(signatureBuffer)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    // Process each pixel: make white/near-white pixels transparent
    const pixels = Buffer.from(data);
    const whiteThreshold = 240; // Pixels with R,G,B all above this are considered "white"
    for (let i = 0; i < pixels.length; i += 4) {
      const r = pixels[i];
      const g = pixels[i + 1];
      const b = pixels[i + 2];
      // If pixel is white or near-white, make it fully transparent
      if (r >= whiteThreshold && g >= whiteThreshold && b >= whiteThreshold) {
        pixels[i + 3] = 0; // Set alpha to 0 (fully transparent)
      }
    }

    // Reconstruct the image from processed pixels
    return await sharp(pixels, {
      raw: {
        width: info.width,
        height: info.height,
        channels: 4,
      },
    })
      .png()
      .toBuffer();
  } catch (error) {
    console.error("Error processing signature transparency:", error);
    // Fallback: just ensure alpha channel exists
    try {
      return await sharp(signatureBuffer).ensureAlpha().png().toBuffer();
    } catch {
      return signatureBuffer;
    }
  }
}

/**
 * Embed a signature image into a PDF at the specified position
 * @param pdfUrl URL of the original PDF document
 * @param signatureUrl URL of the signature image
 * @param positionX X position as percentage (0-100) from the SignaturePositioner
 * @param positionY Y position as percentage (0-100) from the SignaturePositioner
 * @param scale Scale factor for the signature (0.3-2.0)
 * @param pageNumber Page number to sign (1-indexed), defaults to last page
 * @returns Buffer of the signed PDF
 */
export async function embedSignatureInPDF(
  pdfUrl: string,
  signatureUrl: string,
  positionX: number,
  positionY: number,
  scale: number,
  pageNumber?: number
): Promise<Buffer> {
  console.log(`[SignatureEmbedder] Embedding signature into PDF`);
  console.log(`[SignatureEmbedder] PDF URL: ${pdfUrl.substring(0, 100)}...`);
  console.log(`[SignatureEmbedder] Signature URL: ${signatureUrl.substring(0, 100)}...`);
  console.log(`[SignatureEmbedder] Position: (${positionX}, ${positionY}), Scale: ${scale}, Page: ${pageNumber || 'last'}`);

  // Fetch the original PDF
  const pdfResponse = await fetch(pdfUrl);
  if (!pdfResponse.ok) {
    throw new Error(`Failed to fetch PDF: ${pdfResponse.status} ${pdfResponse.statusText} from ${pdfUrl.substring(0, 100)}`);
  }
  const pdfBytes = await pdfResponse.arrayBuffer();
  console.log(`[SignatureEmbedder] PDF fetched: ${pdfBytes.byteLength} bytes`);
  
  // Fetch the signature image
  const signatureResponse = await fetch(signatureUrl);
  if (!signatureResponse.ok) {
    throw new Error(`Failed to fetch signature: ${signatureResponse.status} ${signatureResponse.statusText}`);
  }
  const signatureBytes = Buffer.from(await signatureResponse.arrayBuffer());
  console.log(`[SignatureEmbedder] Signature fetched: ${signatureBytes.length} bytes`);

  // Ensure signature has transparency
  const transparentSignature = await ensureTransparentSignature(signatureBytes);

  // Load the PDF document
  const pdfDoc = await PDFDocument.load(pdfBytes);
  
  // Embed the signature image (always PNG now for transparency)
  const signatureImage = await pdfDoc.embedPng(transparentSignature);

  // Get the pages
  const pages = pdfDoc.getPages();
  const totalPages = pages.length;
  
  // Determine which page to sign (default to last page if not specified)
  const targetPageIndex = pageNumber ? Math.min(Math.max(pageNumber - 1, 0), totalPages - 1) : totalPages - 1;
  const page = pages[targetPageIndex];
  
  const { width: pageWidth, height: pageHeight } = page.getSize();

  // Calculate signature dimensions
  const signatureWidth = 200 * scale;
  const signatureHeight = 80 * scale;

  // The SignaturePositioner uses a coordinate system where:
  // - (0,0) is top-left
  // - (100,100) is bottom-right
  // PDF uses bottom-left origin, so we need to convert:
  // - X stays the same (left to right)
  // - Y needs to be flipped (top to bottom becomes bottom to top)
  
  const x = (positionX / 100) * pageWidth - signatureWidth / 2;
  const y = pageHeight - (positionY / 100) * pageHeight - signatureHeight / 2;

  // Draw the signature on the page
  console.log(`[SignatureEmbedder] Drawing signature at (${x.toFixed(1)}, ${y.toFixed(1)}), size: ${signatureWidth.toFixed(0)}x${signatureHeight.toFixed(0)} on page ${targetPageIndex + 1}/${totalPages}`);
  page.drawImage(signatureImage, {
    x: Math.max(0, x),
    y: Math.max(0, y),
    width: signatureWidth,
    height: signatureHeight,
    opacity: 1.0, // Full opacity for the signature itself (transparency is in the PNG)
  });

  // Save the modified PDF
  const signedPdfBytes = await pdfDoc.save();
  console.log(`[SignatureEmbedder] Signed PDF generated: ${signedPdfBytes.byteLength} bytes`);
  return Buffer.from(signedPdfBytes);
}

/**
 * Embed a signature image into an image document at the specified position
 * @param imageUrl URL of the original image document
 * @param signatureUrl URL of the signature image
 * @param positionX X position as percentage (0-100) from the SignaturePositioner
 * @param positionY Y position as percentage (0-100) from the SignaturePositioner
 * @param scale Scale factor for the signature (0.3-2.0)
 * @returns Buffer of the signed image
 */
export async function embedSignatureInImage(
  imageUrl: string,
  signatureUrl: string,
  positionX: number,
  positionY: number,
  scale: number
): Promise<Buffer> {
  // Fetch the original image
  const imageResponse = await fetch(imageUrl);
  const imageBuffer = Buffer.from(await imageResponse.arrayBuffer());

  // Fetch the signature image
  const signatureResponse = await fetch(signatureUrl);
  const signatureBytes = Buffer.from(await signatureResponse.arrayBuffer());

  // Ensure signature has transparency
  const transparentSignature = await ensureTransparentSignature(signatureBytes);

  // Get image metadata
  const imageMetadata = await sharp(imageBuffer).metadata();
  const imageWidth = imageMetadata.width || 1000;
  const imageHeight = imageMetadata.height || 1000;

  // Calculate signature dimensions
  const signatureWidth = Math.round(200 * scale);
  const signatureHeight = Math.round(80 * scale);

  // Resize signature while preserving transparency
  const resizedSignature = await sharp(transparentSignature)
    .resize(signatureWidth, signatureHeight, { 
      fit: "contain", 
      background: { r: 0, g: 0, b: 0, alpha: 0 } // Fully transparent background
    })
    .png() // Ensure PNG format for transparency
    .toBuffer();

  // The SignaturePositioner uses a coordinate system where:
  // - (0,0) is top-left
  // - (100,100) is bottom-right
  // Sharp also uses top-left origin, so coordinates match directly
  
  const x = Math.round((positionX / 100) * imageWidth - signatureWidth / 2);
  const y = Math.round((positionY / 100) * imageHeight - signatureHeight / 2);

  // Composite the signature onto the image
  const signedImage = await sharp(imageBuffer)
    .composite([
      {
        input: resizedSignature,
        top: y,
        left: x,
        blend: "over", // Proper alpha blending for transparency
      },
    ])
    .toBuffer();

  return signedImage;
}
