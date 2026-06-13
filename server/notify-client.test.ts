/**
 * Tests for the "Notify Client" feature:
 *  1. getCaseNotificationRecipients includes the client's portal user ID
 *  2. cases.notifyClient tRPC procedure creates an in-app notification
 *  3. cases.notifyClient rejects when no client is linked to the case
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";
import { getDb, getCaseNotificationRecipients } from "./db";

type AuthenticatedUser = NonNullable<TrpcContext["user"]>;

function createAdminContext(): TrpcContext {
  const user: AuthenticatedUser = {
    id: 1,
    openId: "admin-notify-test",
    email: "admin@test.com",
    name: "Admin Test",
    loginMethod: "manus",
    role: "admin",
    createdAt: new Date(),
    updatedAt: new Date(),
    lastSignedIn: new Date(),
  };
  return {
    user,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {} as TrpcContext["res"],
  };
}

describe("Notify Client Feature", () => {
  let testCaseId: number;
  let testClientId: number;
  let testPortalUserId: number;
  let testPartnerId: number;

  beforeAll(async () => {
    const db = await getDb();
    if (!db) throw new Error("Database not available");

    // Clean up any leftover test data
    await db.execute(`DELETE FROM users WHERE email = 'notify-portal-test@example.com'`);
    await db.execute(`DELETE FROM clients WHERE email = 'notify-client-test@example.com'`);

    // Create a test portal user (role = client)
    const [userResult] = await db.execute(
      `INSERT INTO users (openId, name, email, role, isActive, loginMethod, createdAt, updatedAt)
       VALUES ('notify-portal-test-oid', 'Test Portal Client', 'notify-portal-test@example.com', 'client', 1, 'local', NOW(), NOW())`
    );
    testPortalUserId = Number((userResult as any).insertId);
    expect(testPortalUserId).toBeGreaterThan(0);

    // Create a test partner (use the owner user id=1 as partner)
    testPartnerId = 1;

    // Create a test client record with portalAccess and portalUserId
    const [clientResult] = await db.execute(
      `INSERT INTO clients (partnerId, firstName, lastName, email, stage, portalAccess, portalUserId, createdBy, createdAt, updatedAt)
       VALUES (${testPartnerId}, 'Notify', 'TestClient', 'notify-client-test@example.com', 'active', 1, ${testPortalUserId}, 1, NOW(), NOW())`
    );
    testClientId = Number((clientResult as any).insertId);
    expect(testClientId).toBeGreaterThan(0);

    // Create a test case linked to the client
    const [caseResult] = await db.execute(
      `INSERT INTO cases (partnerId, clientId, title, description, status, priority, createdBy, createdAt, updatedAt)
       VALUES (${testPartnerId}, ${testClientId}, 'Notify Client Test Case', 'Test case for notify client feature', 'new', 'medium', 1, NOW(), NOW())`
    );
    testCaseId = Number((caseResult as any).insertId);
    expect(testCaseId).toBeGreaterThan(0);
  });

  afterAll(async () => {
    const db = await getDb();
    if (!db) return;
    if (testCaseId) await db.execute(`DELETE FROM cases WHERE id = ${testCaseId}`);
    if (testClientId) await db.execute(`DELETE FROM clients WHERE id = ${testClientId}`);
    if (testPortalUserId) await db.execute(`DELETE FROM users WHERE id = ${testPortalUserId}`);
    await db.execute(`DELETE FROM notifications WHERE userId = ${testPortalUserId}`);
  });

  describe("getCaseNotificationRecipients", () => {
    it("should include the client portal user ID in recipients", async () => {
      const recipients = await getCaseNotificationRecipients(testCaseId, 999999);
      expect(recipients).toContain(testPortalUserId);
    });

    it("should exclude the triggering user from recipients", async () => {
      // Use testPortalUserId as the triggering user — should be excluded
      const recipients = await getCaseNotificationRecipients(testCaseId, testPortalUserId);
      expect(recipients).not.toContain(testPortalUserId);
    });
  });

  describe("cases.notifyClient procedure", () => {
    it("should create an in-app notification for the client portal user", async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      const adminCaller = appRouter.createCaller(createAdminContext());
      const result = await adminCaller.cases.notifyClient({
        caseId: testCaseId,
        message: "Your case has been reviewed and is progressing to the next stage.",
      });

      expect(result.success).toBe(true);

      // Verify the notification was created in the DB
      const [rows] = await db.execute(
        `SELECT * FROM notifications WHERE userId = ${testPortalUserId} AND type = 'case_updated' ORDER BY createdAt DESC LIMIT 1`
      );
      const notif = (rows as any[])[0];
      expect(notif).toBeDefined();
      expect(notif.message).toContain("Your case has been reviewed");
      expect(notif.link).toContain(`/client-portal/cases/${testCaseId}`);
    });

    it("should reject when the case has no linked client", async () => {
      const db = await getDb();
      if (!db) throw new Error("Database not available");

      // Create a case with no clientId
      const [noClientCaseResult] = await db.execute(
        `INSERT INTO cases (partnerId, title, status, priority, createdBy, createdAt, updatedAt)
         VALUES (1, 'No Client Case', 'new', 'medium', 1, NOW(), NOW())`
      );
      const noClientCaseId = Number((noClientCaseResult as any).insertId);

      const adminCaller = appRouter.createCaller(createAdminContext());
      await expect(
        adminCaller.cases.notifyClient({ caseId: noClientCaseId, message: "Test" })
      ).rejects.toThrow("No client linked to this case");

      await db.execute(`DELETE FROM cases WHERE id = ${noClientCaseId}`);
    });

    it("should reject when the case does not exist", async () => {
      const adminCaller = appRouter.createCaller(createAdminContext());
      await expect(
        adminCaller.cases.notifyClient({ caseId: 9999999, message: "Test" })
      ).rejects.toThrow("Case not found");
    });
  });
});
