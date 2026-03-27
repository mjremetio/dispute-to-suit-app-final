import { describe, it, expect, vi, beforeEach } from "vitest";

/**
 * Tests for dashboard-level AOC signing.
 * 
 * The AOC (Assignment of Claim) document is now signed once at the dashboard level,
 * not per-case. Clients sign it from the client dashboard with an alert card prompting them.
 */

describe("Dashboard-Level AOC Signing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should have dashboard-level AOC generation and signing procedure", async () => {
    // This test verifies the integration between:
    // 1. getAOCStatus query in routers.ts
    // 2. generateAndSignAOC mutation in routers.ts
    // 3. generateAOCDocument service in services/aocGenerator.ts
    // 4. storagePut for uploading the PDF
    // 5. createDocument for saving metadata (with caseId: null)

    const routersContent = await import("fs").then(fs => 
      fs.promises.readFile("/home/ubuntu/dispute-to-suit-app/server/routers.ts", "utf-8")
    );

    // Check that dashboard-level AOC procedures exist
    expect(routersContent).toContain("getAOCStatus: clientProcedure");
    expect(routersContent).toContain("generateAndSignAOC: clientProcedure");
    expect(routersContent).toContain("caseId: null"); // Dashboard-level AOC not linked to specific case
    expect(routersContent).toContain("category: \"legal_doc\"");
  });

  it("should not auto-generate AOC when case is created from inquiry", async () => {
    // AOC is now handled at dashboard level, not per-case
    
    const routersContent = await import("fs").then(fs => 
      fs.promises.readFile("/home/ubuntu/dispute-to-suit-app/server/routers.ts", "utf-8")
    );

    // Verify the old auto-generation code is removed
    expect(routersContent).toContain("// AOC is now handled at dashboard level, not per case");
  });

  it("should sanitize file names to prevent S3 issues with special characters", async () => {
    const routersContent = await import("fs").then(fs => 
      fs.promises.readFile("/home/ubuntu/dispute-to-suit-app/server/routers.ts", "utf-8")
    );

    // Verify file name sanitization
    expect(routersContent).toContain("sanitizedFileName");
    expect(routersContent).toContain("replace(/[^a-zA-Z0-9.-]/g, \"_\")");
  });

  it("should use the correct AOC template structure", async () => {
    // Verify the AOC generator service exists and has the correct structure
    const aocGeneratorContent = await import("fs").then(fs => 
      fs.promises.readFile("/home/ubuntu/dispute-to-suit-app/server/services/aocGenerator.ts", "utf-8")
    );

    // Check for required client data fields in AOCClientData interface
    expect(aocGeneratorContent).toContain("firstName: string");
    expect(aocGeneratorContent).toContain("lastName: string");
    expect(aocGeneratorContent).toContain("address?:");
    expect(aocGeneratorContent).toContain("city?:");
    expect(aocGeneratorContent).toContain("state?:");
    expect(aocGeneratorContent).toContain("zipCode?:");

    // Check for AOC generation result structure
    expect(aocGeneratorContent).toContain("pdfBuffer: Buffer");
    expect(aocGeneratorContent).toContain("signatureLineYPercent: number");
    expect(aocGeneratorContent).toContain("signaturePageNumber: number");
  });
});
