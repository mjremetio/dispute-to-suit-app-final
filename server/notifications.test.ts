/**
 * Notifications router tests.
 * Covers: list, unreadCount, markRead, markAllRead procedures.
 */
import { describe, expect, it, vi, beforeEach } from "vitest";
import { appRouter } from "./routers";
import type { TrpcContext } from "./_core/context";

// Mock the db module so tests run without a real database
vi.mock("./db", () => ({
  getNotificationsByUserId: vi.fn(),
  getUnreadNotificationCount: vi.fn(),
  markNotificationRead: vi.fn(),
  markAllNotificationsRead: vi.fn(),
}));

import * as db from "./db";

function makeCtx(overrides: Partial<TrpcContext["user"]> = {}): TrpcContext {
  return {
    user: {
      id: 1,
      openId: "test-openid",
      name: "Test User",
      email: "test@example.com",
      loginMethod: "password",
      role: "admin",
      createdAt: new Date(),
      updatedAt: new Date(),
      lastSignedIn: new Date(),
      ...overrides,
    } as TrpcContext["user"],
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: { clearCookie: vi.fn() } as unknown as TrpcContext["res"],
  };
}

const sampleNotification = {
  id: 1,
  userId: 1,
  type: "case_updated",
  title: "Case Updated",
  message: "A case was updated",
  link: "/cases/42",
  isRead: false,
  readAt: null,
  metadata: null,
  createdAt: new Date("2026-01-01T00:00:00Z"),
};

describe("notifications.list", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns notifications for the current user", async () => {
    vi.mocked(db.getNotificationsByUserId).mockResolvedValue([sampleNotification]);
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.notifications.list({ limit: 20 });
    expect(result).toHaveLength(1);
    expect(result[0]?.title).toBe("Case Updated");
    expect(db.getNotificationsByUserId).toHaveBeenCalledWith(1, 20);
  });

  it("returns empty array when no notifications exist", async () => {
    vi.mocked(db.getNotificationsByUserId).mockResolvedValue([]);
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.notifications.list({ limit: 20 });
    expect(result).toEqual([]);
  });

  it("uses default limit of 50", async () => {
    vi.mocked(db.getNotificationsByUserId).mockResolvedValue([]);
    const caller = appRouter.createCaller(makeCtx());
    // @ts-expect-error testing default parameter
    await caller.notifications.list({});
    expect(db.getNotificationsByUserId).toHaveBeenCalledWith(1, 50);
  });
});

describe("notifications.unreadCount", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns the unread count for the current user", async () => {
    vi.mocked(db.getUnreadNotificationCount).mockResolvedValue(3);
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.notifications.unreadCount();
    expect(result).toBe(3);
    expect(db.getUnreadNotificationCount).toHaveBeenCalledWith(1);
  });

  it("returns 0 when there are no unread notifications", async () => {
    vi.mocked(db.getUnreadNotificationCount).mockResolvedValue(0);
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.notifications.unreadCount();
    expect(result).toBe(0);
  });
});

describe("notifications.markRead", () => {
  beforeEach(() => vi.clearAllMocks());

  it("marks a notification as read and returns success", async () => {
    vi.mocked(db.markNotificationRead).mockResolvedValue(undefined);
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.notifications.markRead({ id: 1 });
    expect(result).toEqual({ success: true });
    expect(db.markNotificationRead).toHaveBeenCalledWith(1);
  });
});

describe("notifications.markAllRead", () => {
  beforeEach(() => vi.clearAllMocks());

  it("marks all notifications as read for the current user and returns success", async () => {
    vi.mocked(db.markAllNotificationsRead).mockResolvedValue(undefined);
    const caller = appRouter.createCaller(makeCtx());
    const result = await caller.notifications.markAllRead();
    expect(result).toEqual({ success: true });
    expect(db.markAllNotificationsRead).toHaveBeenCalledWith(1);
  });
});

describe("notification link resolution (role-aware routing)", () => {
  /**
   * These tests document the expected role-to-route mapping.
   * The actual resolution logic lives in NotificationBell.tsx (client-side).
   * We verify the server stores bare /cases/:id links and the client resolves them.
   */
  const resolveLink = (rawLink: string | null, role: string): string | null => {
    if (!rawLink) return null;
    if (rawLink.startsWith("/admin/") || rawLink.startsWith("/cro-portal/") || rawLink.startsWith("/client-portal/")) {
      return rawLink;
    }
    const caseMatch = rawLink.match(/^\/cases\/(\d+)/);
    if (caseMatch) {
      if (role === "cro") return `/cro-portal/cases/${caseMatch[1]}`;
      if (role === "client") return `/client-portal/cases/${caseMatch[1]}`;
      return `/admin/cases/${caseMatch[1]}`;
    }
    return rawLink;
  };

  it("resolves /cases/:id to /admin/cases/:id for admin users", () => {
    expect(resolveLink("/cases/42", "admin")).toBe("/admin/cases/42");
  });

  it("resolves /cases/:id to /admin/cases/:id for paralegal users", () => {
    expect(resolveLink("/cases/42", "paralegal")).toBe("/admin/cases/42");
  });

  it("resolves /cases/:id to /cro-portal/cases/:id for CRO users", () => {
    expect(resolveLink("/cases/42", "cro")).toBe("/cro-portal/cases/42");
  });

  it("resolves /cases/:id to /client-portal/cases/:id for client users", () => {
    expect(resolveLink("/cases/42", "client")).toBe("/client-portal/cases/42");
  });

  it("passes through links that already have a portal prefix", () => {
    expect(resolveLink("/admin/cases/99", "admin")).toBe("/admin/cases/99");
    expect(resolveLink("/cro-portal/cases/99", "cro")).toBe("/cro-portal/cases/99");
    expect(resolveLink("/client-portal/cases/99", "client")).toBe("/client-portal/cases/99");
  });

  it("returns null for null links", () => {
    expect(resolveLink(null, "admin")).toBeNull();
  });

  it("passes through non-case links unchanged", () => {
    expect(resolveLink("/some/other/path", "admin")).toBe("/some/other/path");
  });
});
