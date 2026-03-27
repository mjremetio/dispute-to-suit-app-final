import { Router, Request, Response } from "express";
import multer from "multer";
import { nanoid } from "nanoid";
import { storagePut, storageGet } from "./storage";
import { createDocument, getCaseById, getClientByPortalUserId, createActivityLog } from "./db";
import { sdk } from "./_core/sdk";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
});

const fileRouter = Router();

// Sanitize file names to prevent S3/CloudFront issues with special characters
function sanitizeFileName(name: string): string {
  return name
    .replace(/[&]/g, "and")
    .replace(/[^a-zA-Z0-9._-]/g, "_")
    .replace(/_+/g, "_");
}

// Middleware to authenticate user from session cookie
async function authenticateUser(req: Request, res: Response, next: Function) {
  try {
    const user = await sdk.authenticateRequest(req);
    (req as any).user = user;
    next();
  } catch (error) {
    res.status(401).json({ error: "Unauthorized" });
  }
}

// POST /api/upload-document - Upload a file to S3 and save metadata
fileRouter.post(
  "/api/upload-document",
  authenticateUser,
  upload.single("file"),
  async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const file = req.file;
      if (!file) {
        return res.status(400).json({ error: "No file provided" });
      }

      const caseId = parseInt(req.body.caseId);
      const category = req.body.category || "supporting_document";

      if (!caseId || isNaN(caseId)) {
        return res.status(400).json({ error: "Invalid caseId" });
      }

      // Verify case exists
      const caseData = await getCaseById(caseId);
      if (!caseData) {
        return res.status(404).json({ error: "Case not found" });
      }

      // Sanitize file name and generate unique file key
      const sanitizedName = sanitizeFileName(file.originalname);
      const fileKey = `cases/${caseId}/documents/${nanoid()}-${sanitizedName}`;

      // Upload to S3
      const { url: fileUrl } = await storagePut(
        fileKey,
        file.buffer,
        file.mimetype
      );

      // Save document metadata to database
      const docId = await createDocument({
        caseId,
        clientId: caseData.clientId,
        fileName: file.originalname, // Keep original name for display
        fileKey,
        fileUrl, // Store the permanent S3/CloudFront URL
        fileSize: file.size,
        mimeType: file.mimetype,
        category,
        uploadedBy: user.id,
      });

      // Log activity
      await createActivityLog({
        userId: user.id,
        caseId,
        action: "document_uploaded",
        description: `Document uploaded: ${file.originalname}`,
      });

      res.json({
        success: true,
        document: {
          id: docId,
          fileName: file.originalname,
          fileKey,
          fileUrl,
          category,
        },
      });
    } catch (error) {
      console.error("Upload error:", error);
      res.status(500).json({ error: "Failed to upload document" });
    }
  }
);

// POST /api/upload-intake-file - Upload a file to S3 for intake inquiries (no caseId required)
fileRouter.post(
  "/api/upload-intake-file",
  authenticateUser,
  upload.single("file"),
  async (req: Request, res: Response) => {
    try {
      const file = req.file;
      if (!file) {
        return res.status(400).json({ error: "No file provided" });
      }

      const sanitizedName = sanitizeFileName(file.originalname);
      const fileKey = `intake-documents/${nanoid()}-${sanitizedName}`;

      const { url: fileUrl } = await storagePut(
        fileKey,
        file.buffer,
        file.mimetype
      );

      res.json({
        success: true,
        fileKey,
        fileUrl,
        fileName: file.originalname,
      });
    } catch (error) {
      console.error("Intake file upload error:", error);
      res.status(500).json({ error: "Failed to upload file" });
    }
  }
);

// GET /api/files/proxy - Stream file content through the server (for iframe/img embedding)
// Supports two modes:
//   ?docId=123  - Look up document from DB, try stored fileUrl first, then storageGet
//   ?key=...    - Use fileKey directly with storageGet
fileRouter.get("/api/files/proxy", async (req: Request, res: Response) => {
  try {
    const fileKey = req.query.key as string;
    const docId = req.query.docId as string;
    if (!fileKey && !docId) {
      return res.status(400).send("Missing file key or document ID");
    }

    // Helper to stream a successful response
    const streamResponse = async (response: globalThis.Response, fileName: string) => {
      const contentType = response.headers.get("content-type") || "application/octet-stream";
      res.setHeader("Content-Type", contentType);
      res.setHeader("Content-Disposition", `inline; filename="${encodeURIComponent(fileName)}"`);
      res.setHeader("Cache-Control", "no-cache, no-store, must-revalidate");
      res.setHeader("Pragma", "no-cache");
      res.setHeader("Expires", "0");
      const buffer = await response.arrayBuffer();
      return res.send(Buffer.from(buffer));
    };

    // If docId is provided, look up the document from DB
    if (docId) {
      try {
        // Use getDocumentByIdRaw to get actual S3 URLs (not proxy-normalized URLs)
        const { getDocumentByIdRaw } = await import("./db");
        const doc = await getDocumentByIdRaw(parseInt(docId));
        if (doc) {
          // Try the stored fileUrl directly (works for CloudFront/S3 URLs)
          // This is critical for signed documents where fileUrl points to the signed PDF
          if (doc.fileUrl && doc.fileUrl.startsWith("http")) {
            try {
              const response = await fetch(doc.fileUrl);
              if (response.ok) {
                return await streamResponse(response, doc.fileName || "file");
              }
            } catch (e) {
              // Fall through to storageGet
            }
          }
          // Try storageGet with fileKey as fallback
          if (doc.fileKey) {
            try {
              const { url } = await storageGet(doc.fileKey);
              const response = await fetch(url);
              if (response.ok) {
                return await streamResponse(response, doc.fileName || "file");
              }
            } catch (e) {
              // Fall through
            }
          }
        }
      } catch (e) {
        // Fall through
      }
    }

    // Fallback: Use fileKey directly with storageGet
    if (fileKey) {
      try {
        const { url } = await storageGet(fileKey);
        const response = await fetch(url);
        if (response.ok) {
          return await streamResponse(response, fileKey.split("/").pop() || "file");
        }
      } catch (e) {
        // Fall through
      }
    }

    res.status(404).send("File not found");
  } catch (error) {
    console.error("File proxy error:", error);
    res.status(500).send("Failed to fetch file");
  }
});

// GET /api/files/download-url - Get a fresh presigned download URL for a document
fileRouter.get("/api/files/download-url", authenticateUser, async (req: Request, res: Response) => {
  try {
    const docId = req.query.docId as string;
    if (!docId) {
      return res.status(400).json({ error: "Missing document ID" });
    }

    const { getDocumentByIdRaw } = await import("./db");
    const doc = await getDocumentByIdRaw(parseInt(docId));
    if (!doc) {
      return res.status(404).json({ error: "Document not found" });
    }

    // Return the proxy URL for consistent access
    res.json({ url: `/api/files/proxy?docId=${doc.id}`, fileName: doc.fileName });
  } catch (error) {
    console.error("Download URL error:", error);
    res.status(500).json({ error: "Failed to get download URL" });
  }
});

export { fileRouter };
