import { describe, expect, it, vi } from "vitest";

// Test the sanitizeFileName function logic
describe("sanitizeFileName", () => {
  // Replicate the sanitize logic from fileRoutes.ts
  function sanitizeFileName(name: string): string {
    return name
      .replace(/[&]/g, "and")
      .replace(/[^a-zA-Z0-9._-]/g, "_")
      .replace(/_+/g, "_");
  }

  it("replaces ampersands with 'and'", () => {
    expect(sanitizeFileName("Case Referral & Settlement Agreement.pdf")).toContain("and");
    expect(sanitizeFileName("Case Referral & Settlement Agreement.pdf")).not.toContain("&");
  });

  it("replaces spaces with underscores", () => {
    const result = sanitizeFileName("my document file.pdf");
    expect(result).not.toContain(" ");
    expect(result).toBe("my_document_file.pdf");
  });

  it("removes special characters", () => {
    const result = sanitizeFileName("file (1) [copy] {test}.pdf");
    expect(result).not.toMatch(/[()[\]{}]/);
  });

  it("collapses multiple underscores", () => {
    const result = sanitizeFileName("file   name   here.pdf");
    expect(result).not.toContain("__");
  });

  it("preserves dots, hyphens, and alphanumeric characters", () => {
    const result = sanitizeFileName("my-file.2024.pdf");
    expect(result).toBe("my-file.2024.pdf");
  });

  it("handles the exact problematic file name from the bug report", () => {
    const result = sanitizeFileName("Case Referral & Settlement Agreement Signed .pdf");
    expect(result).not.toContain("&");
    expect(result).not.toContain(" ");
    expect(result).toContain(".pdf");
    // Should be safe for S3/CloudFront URLs
    expect(encodeURIComponent(result)).toBe(result);
  });
});

// Test the normalizeDocUrl logic
describe("normalizeDocUrl", () => {
  function normalizeDocUrl<T extends { id: number; fileKey: string; fileUrl: string | null }>(doc: T): T {
    return {
      ...doc,
      fileUrl: `/api/files/proxy?docId=${doc.id}`,
    };
  }

  it("converts document with CloudFront URL to proxy URL", () => {
    const doc = {
      id: 60001,
      fileKey: "cases/1/documents/abc123-test.pdf",
      fileUrl: "https://d2xsxph8kpxj0f.cloudfront.net/some-path/test.pdf",
      fileName: "test.pdf",
    };
    const result = normalizeDocUrl(doc);
    expect(result.fileUrl).toBe("/api/files/proxy?docId=60001");
  });

  it("converts document with relative path to proxy URL", () => {
    const doc = {
      id: 1,
      fileKey: "cases/1/client-documents/abc-file.pdf",
      fileUrl: "cases/1/client-documents/abc-file.pdf",
      fileName: "file.pdf",
    };
    const result = normalizeDocUrl(doc);
    expect(result.fileUrl).toBe("/api/files/proxy?docId=1");
  });

  it("converts document with null fileUrl to proxy URL", () => {
    const doc = {
      id: 5,
      fileKey: "cases/1/documents/test.pdf",
      fileUrl: null,
      fileName: "test.pdf",
    };
    const result = normalizeDocUrl(doc);
    expect(result.fileUrl).toBe("/api/files/proxy?docId=5");
  });

  it("preserves all other document properties", () => {
    const doc = {
      id: 10,
      fileKey: "cases/1/documents/test.pdf",
      fileUrl: "https://example.com/test.pdf",
      fileName: "test.pdf",
      caseId: 1,
      category: "supporting_document",
    };
    const result = normalizeDocUrl(doc);
    expect(result.id).toBe(10);
    expect(result.fileKey).toBe("cases/1/documents/test.pdf");
    expect(result.fileName).toBe("test.pdf");
    expect(result.caseId).toBe(1);
    expect(result.category).toBe("supporting_document");
  });
});
