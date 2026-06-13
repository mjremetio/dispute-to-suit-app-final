/**
 * Tests for user tour tracking procedures (system.getTourStatus, system.markTourSeen)
 */
import { describe, it, expect, beforeEach, vi } from "vitest";

// ── Mock the DB helpers ──────────────────────────────────────────────────────
vi.mock("./db", () => ({
  getUserById: vi.fn(),
  updateUser: vi.fn(),
  upsertUser: vi.fn(),
  getUserByEmail: vi.fn(),
  getUnreadNotificationCount: vi.fn().mockResolvedValue(0),
}));

import { getUserById, updateUser } from "./db";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// ── Minimal context helpers ──────────────────────────────────────────────────
function makeCtx(userId: number): TrpcContext {
  return {
    user: {
      id: userId,
      openId: `user-${userId}`,
      email: `user${userId}@test.com`,
      name: "Test User",
      loginMethod: "password",
      role: "cro",
      partnerId: null,
      trialDays: 3,
      trialStartDate: null,
      trialExpirationSent: false,
      isActive: true,
      mustChangePassword: false,
      tourSeenCro: false,
      tourSeenClient: false,
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
    },
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn(), cookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

// ── Tests ────────────────────────────────────────────────────────────────────
describe("system.getTourStatus", () => {
  it("returns false for both portals when the user has never seen a tour", async () => {
    (getUserById as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 1,
      tourSeenCro: false,
      tourSeenClient: false,
    });

    const caller = appRouter.createCaller(makeCtx(1));
    const result = await caller.system.getTourStatus();

    expect(result.tourSeenCro).toBe(false);
    expect(result.tourSeenClient).toBe(false);
  });

  it("returns true for cro when the user has seen the CRO tour", async () => {
    (getUserById as ReturnType<typeof vi.fn>).mockResolvedValue({
      id: 2,
      tourSeenCro: true,
      tourSeenClient: false,
    });

    const caller = appRouter.createCaller(makeCtx(2));
    const result = await caller.system.getTourStatus();

    expect(result.tourSeenCro).toBe(true);
    expect(result.tourSeenClient).toBe(false);
  });

  it("falls back to false when user is not found in DB", async () => {
    (getUserById as ReturnType<typeof vi.fn>).mockResolvedValue(null);

    const caller = appRouter.createCaller(makeCtx(99));
    const result = await caller.system.getTourStatus();

    expect(result.tourSeenCro).toBe(false);
    expect(result.tourSeenClient).toBe(false);
  });
});

describe("system.markTourSeen", () => {
  beforeEach(() => {
    (updateUser as ReturnType<typeof vi.fn>).mockResolvedValue(undefined);
  });

  it("calls updateUser with tourSeenCro=true when portal is 'cro'", async () => {
    const caller = appRouter.createCaller(makeCtx(1));
    const result = await caller.system.markTourSeen({ portal: "cro" });

    expect(result.success).toBe(true);
    expect(updateUser).toHaveBeenCalledWith(1, { tourSeenCro: true });
  });

  it("calls updateUser with tourSeenClient=true when portal is 'client'", async () => {
    const caller = appRouter.createCaller(makeCtx(2));
    const result = await caller.system.markTourSeen({ portal: "client" });

    expect(result.success).toBe(true);
    expect(updateUser).toHaveBeenCalledWith(2, { tourSeenClient: true });
  });

  it("rejects unknown portal values", async () => {
    const caller = appRouter.createCaller(makeCtx(1));
    // @ts-expect-error intentionally passing invalid value
    await expect(caller.system.markTourSeen({ portal: "admin" })).rejects.toThrow();
  });
});
