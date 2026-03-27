import type { Request, Response } from "express";
import { storagePut } from "./storage";
import { createDocument, createActivityLog } from "./db";
import multer from "multer";
import { nanoid } from "nanoid";
import { sdk } from "./_core/sdk";

// Configure multer for file uploads (in-memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
});

export const uploadMiddleware = upload.single('file');

export async function handleDocumentUpload(req: Request, res: Response) {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const { caseId, category } = req.body;

    if (!caseId) {
      return res.status(400).json({ error: "Missing caseId" });
    }

    const parsedCaseId = parseInt(caseId, 10);
    if (isNaN(parsedCaseId)) {
      return res.status(400).json({ error: "Invalid caseId" });
    }

    // Extract user from session cookie for audit trail
    let uploadedBy = 0;
    try {
      const user = await sdk.authenticateRequest(req);
      if (user) {
        uploadedBy = user.id;
      }
    } catch (e) {
      // Non-critical: if auth fails, still allow upload with userId 0
      console.warn("Could not extract user from session for upload audit:", e);
    }

    // Generate unique file key
    const fileKey = `cases/${parsedCaseId}/documents/${nanoid()}-${req.file.originalname}`;

    // Upload to S3
    const { url } = await storagePut(
      fileKey,
      req.file.buffer,
      req.file.mimetype
    );

    // Save document metadata to database
    const docId = await createDocument({
      caseId: parsedCaseId,
      category: category || "supporting_document",
      fileName: req.file.originalname,
      fileKey,
      fileUrl: url,
      fileSize: req.file.size,
      mimeType: req.file.mimetype,
      uploadedBy,
    });

    // Log activity
    try {
      await createActivityLog({
        userId: uploadedBy,
        caseId: parsedCaseId,
        action: "document_uploaded",
        description: `Document uploaded: ${req.file.originalname} (${category || "supporting_document"})`,
      });
    } catch (e) {
      // Non-critical, don't fail the upload
      console.warn("Failed to log activity:", e);
    }

    return res.json({ 
      success: true,
      fileUrl: url, 
      fileKey,
      docId,
      fileName: req.file.originalname,
    });
  } catch (error) {
    console.error("Document upload error:", error);
    return res.status(500).json({ error: "Upload failed" });
  }
}
