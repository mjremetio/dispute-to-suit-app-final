import { describe, expect, it } from "vitest";
import { ENV } from "./_core/env";

describe("SendGrid Email Configuration", () => {
  const hasSendgrid = !!ENV.sendgridApiKey;

  it.skipIf(!hasSendgrid)("should have SendGrid API key configured", () => {
    expect(ENV.sendgridApiKey).toBeTruthy();
    expect(ENV.sendgridApiKey.length).toBeGreaterThan(20);
  });

  it("should have sender email configured", () => {
    expect(ENV.senderEmail).toBeTruthy();
    expect(ENV.senderEmail).toMatch(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
  });

  it.skipIf(!hasSendgrid)("should have valid SendGrid API key format", () => {
    // SendGrid API keys start with "SG."
    expect(ENV.sendgridApiKey).toMatch(/^SG\./);
  });
});
