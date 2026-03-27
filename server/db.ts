import { eq, and, desc, sql, gte, lte, inArray, isNotNull, like } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser, users,
  partners, InsertPartner, Partner,
  clients, Client, InsertClient,
  cases, InsertCase, Case,
  tasks, InsertTask, Task,
  documents, InsertDocument, Document,
  activityLogs, InsertActivityLog, ActivityLog,
  passwordResetTokens, InsertPasswordResetToken, PasswordResetToken,
  inviteTokens, InsertInviteToken, InviteToken,
  rateLimits, InsertRateLimit, RateLimit,
  caseComments, InsertCaseComment, CaseComment,
  externalLinks, InsertExternalLink, ExternalLink,
  signatureTemplates, InsertSignatureTemplate, SignatureTemplate,
  croApplications, InsertCroApplication, CroApplication,
  intakeInquiries, InsertIntakeInquiry, IntakeInquiry,
  notifications, InsertNotification, Notification,
} from "../drizzle/schema";
import { ENV } from './_core/env';

let _db: ReturnType<typeof drizzle> | null = null;

export async function getDb() {
  if (!_db && process.env.DATABASE_URL) {
    try {
      _db = drizzle(process.env.DATABASE_URL);
    } catch (error) {
      console.warn("[Database] Failed to connect:", error);
      _db = null;
    }
  }
  return _db;
}

// ============= USER FUNCTIONS =============

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = 'admin';
      updateSet.role = 'admin';
    }
    if (user.partnerId !== undefined) {
      values.partnerId = user.partnerId;
      updateSet.partnerId = user.partnerId;
    }
    if (user.trialDays !== undefined) {
      values.trialDays = user.trialDays;
      updateSet.trialDays = user.trialDays;
    }
    if (user.trialStartDate !== undefined) {
      values.trialStartDate = user.trialStartDate;
      updateSet.trialStartDate = user.trialStartDate;
    }
    if (user.isActive !== undefined) {
      values.isActive = user.isActive;
      updateSet.isActive = user.isActive;
    }
    if (user.passwordHash !== undefined) {
      values.passwordHash = user.passwordHash;
      updateSet.passwordHash = user.passwordHash;
    }
    if (user.mustChangePassword !== undefined) {
      values.mustChangePassword = user.mustChangePassword;
      updateSet.mustChangePassword = user.mustChangePassword;
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserByEmail(email: string) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAllUsers() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(users).orderBy(desc(users.createdAt));
}

export async function getTeamMembers() {
  const db = await getDb();
  if (!db) return [];
  return await db.select({
    id: users.id,
    name: users.name,
    email: users.email,
    role: users.role,
  }).from(users).where(
    and(
      inArray(users.role, ["admin", "paralegal", "cro"]),
      eq(users.isActive, true)
    )
  ).orderBy(users.name);
}

export async function updateUser(id: number, updates: Partial<InsertUser>) {
  const db = await getDb();
  if (!db) return;
  await db.update(users).set(updates).where(eq(users.id, id));
}

export async function deleteUser(id: number) {
  const db = await getDb();
  if (!db) return;
  
  // Get user email before deletion for cascade cleanup
  const user = await db.select().from(users).where(eq(users.id, id)).limit(1);
  if (user.length === 0) return;
  
  const userEmail = user[0].email;
  
  // Cascade delete related records
  if (userEmail) {
    // Delete from croApplications if email matches
    await db.delete(croApplications).where(eq(croApplications.email, userEmail));
    // Delete from partners if email matches
    await db.delete(partners).where(eq(partners.email, userEmail));
    // Delete from clients if email matches
    await db.delete(clients).where(eq(clients.email, userEmail));
  }
  
  // Delete user's assigned cases
  await db.delete(cases).where(eq(cases.assignedTo, id));
  // Delete user's assigned tasks
  await db.delete(tasks).where(eq(tasks.assignedTo, id));
  // Delete user's uploaded documents
  await db.delete(documents).where(eq(documents.uploadedBy, id));
  // Delete user's activity logs
  await db.delete(activityLogs).where(eq(activityLogs.userId, id));
  // Delete user's password reset tokens
  await db.delete(passwordResetTokens).where(eq(passwordResetTokens.userId, id));
  
  // Finally delete the user
  await db.delete(users).where(eq(users.id, id));
}

// ============= PARTNER FUNCTIONS =============

export async function createPartner(partner: InsertPartner) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(partners).values(partner);
  return Number(result[0].insertId);
}

export async function getPartnerById(id: number): Promise<Partner | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(partners).where(eq(partners.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getPartnerByEmail(email: string): Promise<Partner | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(partners).where(eq(partners.email, email)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getAllPartners() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(partners).orderBy(desc(partners.createdAt));
}

export async function getPendingPartners() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(partners).where(eq(partners.status, "pending")).orderBy(desc(partners.createdAt));
}

export async function updatePartner(id: number, updates: Partial<InsertPartner>) {
  const db = await getDb();
  if (!db) return;
  await db.update(partners).set(updates).where(eq(partners.id, id));
}

export async function approvePartner(id: number, adminId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(partners).set({
    status: "approved",
    approvedBy: adminId,
    approvedAt: new Date(),
  }).where(eq(partners.id, id));
}

export async function rejectPartner(id: number, adminId: number, reason: string) {
  const db = await getDb();
  if (!db) return;
  await db.update(partners).set({
    status: "rejected",
    approvedBy: adminId,
    rejectionReason: reason,
  }).where(eq(partners.id, id));
}

// ============= CASE FUNCTIONS =============

export async function createCase(caseData: InsertCase) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(cases).values(caseData);
  return Number(result[0].insertId);
}

export async function getCaseById(id: number): Promise<Case | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(cases).where(eq(cases.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getCasesByPartnerId(partnerId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(cases).where(eq(cases.partnerId, partnerId)).orderBy(desc(cases.createdAt));
}

export async function getAllCases() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(cases).orderBy(desc(cases.createdAt));
}

export async function updateCase(id: number, updates: Partial<InsertCase>) {
  const db = await getDb();
  if (!db) return;
  await db.update(cases).set(updates).where(eq(cases.id, id));
}

export async function deleteCase(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(cases).where(eq(cases.id, id));
}

// ============= TASK FUNCTIONS =============

export async function createTask(task: InsertTask) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(tasks).values(task);
  return Number(result[0].insertId);
}

export async function getTaskById(id: number): Promise<Task | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getTasksByCaseId(caseId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(tasks).where(eq(tasks.caseId, caseId)).orderBy(desc(tasks.createdAt));
}

export async function updateTask(id: number, updates: Partial<InsertTask>) {
  const db = await getDb();
  if (!db) return;
  await db.update(tasks).set(updates).where(eq(tasks.id, id));
}

export async function deleteTask(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(tasks).where(eq(tasks.id, id));
}

// ============= DOCUMENT FUNCTIONS =============

export async function createDocument(doc: InsertDocument) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(documents).values(doc);
  return Number(result[0].insertId);
}

// Helper to normalize document URLs to use the proxy endpoint for reliable access
function normalizeDocUrl<T extends { id: number; fileKey: string; fileUrl: string | null }>(doc: T): T {
  return {
    ...doc,
    fileUrl: `/api/files/proxy?docId=${doc.id}`,
  };
}

export async function getCaseDocuments(caseId: number) {
  const db = await getDb();
  if (!db) return [];
  const docs = await db.select().from(documents).where(eq(documents.caseId, caseId)).orderBy(desc(documents.uploadedAt));
  return docs.map(normalizeDocUrl);
}

export async function getClientDocuments(clientId: number) {
  const db = await getDb();
  if (!db) return [];
  const docs = await db.select().from(documents).where(eq(documents.clientId, clientId)).orderBy(desc(documents.uploadedAt));
  return docs.map(normalizeDocUrl);
}

// Find a previously signed AOC document for a given client (across all their cases)
export async function getSignedAOCByClientId(clientId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(documents)
    .where(and(
      eq(documents.clientId, clientId),
      eq(documents.category, "legal_doc"),
      like(documents.fileName, "AOC-%"),
      isNotNull(documents.signedAt),
      isNotNull(documents.signatureUrl),
    ))
    .orderBy(desc(documents.signedAt))
    .limit(1);
  return result.length > 0 ? result[0] : null;
}

export async function getAllDocuments() {
  const db = await getDb();
  if (!db) return [];
  const docs = await db.select().from(documents).orderBy(desc(documents.uploadedAt));
  return docs.map(normalizeDocUrl);
}

// Raw version for server-side operations (signature embedding, file proxy, etc.)
export async function getDocumentByIdRaw(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(documents).where(eq(documents.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// Normalized version for frontend-facing responses
export async function getDocumentById(id: number) {
  const doc = await getDocumentByIdRaw(id);
  return doc ? normalizeDocUrl(doc) : undefined;
}

export async function deleteDocument(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(documents).where(eq(documents.id, id));
}

export async function deleteDocumentWithLog(id: number, userId: number) {
  const db = await getDb();
  if (!db) return;
  const doc = await getDocumentByIdRaw(id);
  await db.delete(documents).where(eq(documents.id, id));
  if (doc?.caseId) {
    await createActivityLog({
      userId,
      caseId: doc.caseId,
      action: "document_deleted",
      description: `Document deleted: ${doc.fileName}`,
    });
  }
}

export async function updateDocument(id: number, data: Partial<InsertDocument>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  await db.update(documents).set(data).where(eq(documents.id, id));
}

// ============= ACTIVITY LOG FUNCTIONS =============

export async function createActivityLog(log: InsertActivityLog) {
  const db = await getDb();
  if (!db) return;
  try {
    await db.insert(activityLogs).values(log);
  } catch (error) {
    console.error("[Database] Failed to create activity log:", error);
  }
}

export async function getActivityLogsByUserId(userId: number, limit: number = 100) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(activityLogs).where(eq(activityLogs.userId, userId)).orderBy(desc(activityLogs.createdAt)).limit(limit);
}

export async function getActivityLogsByCaseId(caseId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(activityLogs).where(eq(activityLogs.caseId, caseId)).orderBy(desc(activityLogs.createdAt));
}

// Enriched timeline with user name/role
export async function getEnrichedTimelineByCaseId(caseId: number) {
  const db = await getDb();
  if (!db) return [];
  const logs = await db.select().from(activityLogs).where(eq(activityLogs.caseId, caseId)).orderBy(desc(activityLogs.createdAt));
  
  // Collect unique user IDs
  const userIds = Array.from(new Set(logs.filter(l => l.userId != null).map(l => l.userId!)));
  let userMap: Record<number, { name: string | null; role: string }> = {};
  if (userIds.length > 0) {
    const userRows = await db.select({ id: users.id, name: users.name, role: users.role }).from(users).where(inArray(users.id, userIds));
    userRows.forEach(u => { userMap[u.id] = { name: u.name, role: u.role }; });
  }
  
  return logs.map(log => ({
    ...log,
    userName: log.userId ? (userMap[log.userId]?.name || null) : null,
    userRole: log.userId ? (userMap[log.userId]?.role || null) : null,
  }));
}

// Enriched documents with uploader name
export async function getEnrichedCaseDocuments(caseId: number) {
  const db = await getDb();
  if (!db) return [];
  const docs = await db.select().from(documents).where(eq(documents.caseId, caseId)).orderBy(desc(documents.uploadedAt));
  
  const uploaderIds = Array.from(new Set(docs.filter(d => d.uploadedBy != null).map(d => d.uploadedBy!)));
  let uploaderMap: Record<number, { name: string | null; role: string }> = {};
  if (uploaderIds.length > 0) {
    const uploaderRows = await db.select({ id: users.id, name: users.name, role: users.role }).from(users).where(inArray(users.id, uploaderIds));
    uploaderRows.forEach(u => { uploaderMap[u.id] = { name: u.name, role: u.role }; });
  }
  
  return docs.map(doc => ({
    ...doc,
    uploaderName: doc.uploadedBy ? (uploaderMap[doc.uploadedBy]?.name || null) : null,
    uploaderRole: doc.uploadedBy ? (uploaderMap[doc.uploadedBy]?.role || null) : null,
    // Always use proxy endpoint with docId for reliable authenticated access
    fileUrl: `/api/files/proxy?docId=${doc.id}`,
  }));
}

export async function getAllActivityLogs(limit: number = 500) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(activityLogs).orderBy(desc(activityLogs.createdAt)).limit(limit);
}

// ============= PASSWORD RESET TOKEN FUNCTIONS =============

export async function createPasswordResetToken(token: InsertPasswordResetToken) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(passwordResetTokens).values(token);
  return Number(result[0].insertId);
}

export async function getPasswordResetToken(token: string): Promise<PasswordResetToken | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(passwordResetTokens).where(
    and(
      eq(passwordResetTokens.token, token),
      eq(passwordResetTokens.used, false),
      gte(passwordResetTokens.expiresAt, new Date())
    )
  ).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function markTokenAsUsed(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(passwordResetTokens).set({
    used: true,
    usedAt: new Date(),
  }).where(eq(passwordResetTokens.id, id));
}

// ============= INVITE TOKEN FUNCTIONS =============

export async function createInviteToken(token: InsertInviteToken) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(inviteTokens).values(token);
  return Number(result[0].insertId);
}

export async function getInviteToken(token: string): Promise<InviteToken | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(inviteTokens).where(eq(inviteTokens.token, token)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function incrementInviteTokenUsage(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(inviteTokens).set({
    usedCount: sql`${inviteTokens.usedCount} + 1`,
  }).where(eq(inviteTokens.id, id));
}

export async function getAllInviteTokens() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(inviteTokens).orderBy(desc(inviteTokens.createdAt));
}

// ============= RATE LIMIT FUNCTIONS =============

export async function getRateLimit(identifier: string, endpoint: string): Promise<RateLimit | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(rateLimits).where(
    and(
      eq(rateLimits.identifier, identifier),
      eq(rateLimits.endpoint, endpoint)
    )
  ).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createOrUpdateRateLimit(identifier: string, endpoint: string, windowStart: Date) {
  const db = await getDb();
  if (!db) return;
  
  const existing = await getRateLimit(identifier, endpoint);
  
  if (existing) {
    await db.update(rateLimits).set({
      requestCount: sql`${rateLimits.requestCount} + 1`,
      updatedAt: new Date(),
    }).where(eq(rateLimits.id, existing.id));
  } else {
    await db.insert(rateLimits).values({
      identifier,
      endpoint,
      requestCount: 1,
      windowStart,
    });
  }
}

export async function resetRateLimit(identifier: string, endpoint: string, windowStart: Date) {
  const db = await getDb();
  if (!db) return;
  await db.update(rateLimits).set({
    requestCount: 1,
    windowStart,
    updatedAt: new Date(),
  }).where(
    and(
      eq(rateLimits.identifier, identifier),
      eq(rateLimits.endpoint, endpoint)
    )
  );
}

export async function cleanupOldRateLimits(olderThan: Date) {
  const db = await getDb();
  if (!db) return;
  await db.delete(rateLimits).where(lte(rateLimits.windowStart, olderThan));
}

// ============= CASE COMMENT FUNCTIONS =============

export async function createCaseComment(commentData: InsertCaseComment) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(caseComments).values(commentData);
  return Number(result[0].insertId);
}

export async function getCommentsByCaseId(caseId: number): Promise<CaseComment[]> {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(caseComments)
    .where(eq(caseComments.caseId, caseId))
    .orderBy(caseComments.createdAt);
}

export async function getCommentCountsByCaseIds(caseIds: number[]): Promise<Record<number, number>> {
  const db = await getDb();
  if (!db || caseIds.length === 0) return {};
  const results = await db.select({
    caseId: caseComments.caseId,
    count: sql<number>`count(*)`.as('count'),
  }).from(caseComments)
    .where(inArray(caseComments.caseId, caseIds))
    .groupBy(caseComments.caseId);
  const map: Record<number, number> = {};
  for (const r of results) {
    map[r.caseId] = Number(r.count);
  }
  return map;
}

export async function getLatestCommentsByCaseIds(caseIds: number[]): Promise<Record<number, CaseComment>> {
  const db = await getDb();
  if (!db || caseIds.length === 0) return {};
  // Get latest comment per case using a subquery approach
  const allComments = await db.select().from(caseComments)
    .where(inArray(caseComments.caseId, caseIds))
    .orderBy(desc(caseComments.createdAt));
  const map: Record<number, CaseComment> = {};
  for (const c of allComments) {
    if (!map[c.caseId]) {
      map[c.caseId] = c;
    }
  }
  return map;
}

export async function deleteComment(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(caseComments).where(eq(caseComments.id, id));
}

// ============= CLIENT FUNCTIONS =============

export async function getAllClients() {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(clients).orderBy(clients.createdAt);
}

export async function getAllClientsWithCro() {
  const db = await getDb();
  if (!db) return [];
  const croUser = db.select({ id: users.id, name: users.name, email: users.email }).from(users).as("croUser");
  const portalUser = db.select({ id: users.id, name: users.name, email: users.email, isActive: users.isActive }).from(users).as("portalUser");

  const results = await db
    .select({
      client: clients,
      croName: sql<string | null>`croUser.name`.as("croName"),
      croEmail: sql<string | null>`croUser.email`.as("croEmail"),
      portalUserEmail: sql<string | null>`portalUser.email`.as("portalUserEmail"),
      portalUserActive: sql<boolean | null>`portalUser.isActive`.as("portalUserActive"),
    })
    .from(clients)
    .leftJoin(croUser, eq(clients.createdBy, sql`croUser.id`))
    .leftJoin(portalUser, eq(clients.portalUserId, sql`portalUser.id`))
    .orderBy(desc(clients.createdAt));

  return results.map((r) => ({
    ...r.client,
    croName: r.croName,
    croEmail: r.croEmail,
    portalUserEmail: r.portalUserEmail,
    portalUserActive: r.portalUserActive,
  }));
}

export async function getClientById(id: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(clients).where(eq(clients.id, id));
  return result[0] || null;
}


// ============= BULK OPERATIONS =============

export async function bulkUpdateCaseStatus(caseIds: number[], status: "new" | "pending_review" | "in_review" | "more_info_needed" | "ready_for_attorney" | "sent_to_attorney" | "accepted_by_attorney" | "rejected" | "settled" | "settlement_paid_out" | "closed") {
  const db = await getDb();
  if (!db) return { affected: 0 };
  await db.update(cases).set({ status, updatedAt: new Date() }).where(inArray(cases.id, caseIds));
  return { affected: caseIds.length };
}

export async function bulkDeleteCases(caseIds: number[]) {
  const db = await getDb();
  if (!db) return { affected: 0 };
  // Delete related records first (tasks, documents, comments, activity logs)
  await db.delete(tasks).where(inArray(tasks.caseId, caseIds));
  await db.delete(documents).where(inArray(documents.caseId, caseIds));
  await db.delete(caseComments).where(inArray(caseComments.caseId, caseIds));
  await db.delete(activityLogs).where(inArray(activityLogs.caseId, caseIds));
  // Delete the cases
  await db.delete(cases).where(inArray(cases.id, caseIds));
  return { affected: caseIds.length };
}


// ============= EXTERNAL LINKS FUNCTIONS =============

export async function addExternalLink(link: InsertExternalLink): Promise<ExternalLink | null> {
  const db = await getDb();
  if (!db) return null;
  const result = await db.insert(externalLinks).values(link);
  const id = Number(result[0].insertId);
  return await getExternalLinkById(id);
}

export async function getExternalLinkById(id: number): Promise<ExternalLink | null> {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(externalLinks).where(eq(externalLinks.id, id)).limit(1);
  return result[0] || null;
}

export async function listExternalLinksByCaseId(caseId: number): Promise<ExternalLink[]> {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(externalLinks).where(eq(externalLinks.caseId, caseId)).orderBy(desc(externalLinks.createdAt));
}

export async function updateExternalLink(id: number, updates: Partial<InsertExternalLink>): Promise<ExternalLink | null> {
  const db = await getDb();
  if (!db) return null;
  await db.update(externalLinks).set({ ...updates, updatedAt: new Date() }).where(eq(externalLinks.id, id));
  return await getExternalLinkById(id);
}

export async function deleteExternalLink(id: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  await db.delete(externalLinks).where(eq(externalLinks.id, id));
  return true;
}


// ========================================
// Signature Templates
// ========================================

export async function createSignatureTemplate(data: InsertSignatureTemplate): Promise<SignatureTemplate | null> {
  const db = await getDb();
  if (!db) return null;
  const [result] = await db.insert(signatureTemplates).values(data);
  return await getSignatureTemplateById(result.insertId);
}

export async function getSignatureTemplateById(id: number): Promise<SignatureTemplate | null> {
  const db = await getDb();
  if (!db) return null;
  const [template] = await db.select().from(signatureTemplates).where(eq(signatureTemplates.id, id));
  return template || null;
}

export async function getSignatureTemplatesByUserId(userId: number): Promise<SignatureTemplate[]> {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(signatureTemplates).where(eq(signatureTemplates.userId, userId)).orderBy(desc(signatureTemplates.createdAt));
}

export async function deleteSignatureTemplate(id: number): Promise<boolean> {
  const db = await getDb();
  if (!db) return false;
  await db.delete(signatureTemplates).where(eq(signatureTemplates.id, id));
  return true;
}

// ============= CRO APPLICATION FUNCTIONS =============

export async function createCroApplication(data: InsertCroApplication): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(croApplications).values(data);
  return Number(result.insertId);
}

export async function getCroApplicationById(id: number): Promise<CroApplication | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(croApplications).where(eq(croApplications.id, id)).limit(1);
  return result[0];
}

export async function getCroApplicationByEmail(email: string): Promise<CroApplication | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(croApplications).where(eq(croApplications.email, email)).limit(1);
  return result[0];
}

export async function getAllCroApplications(): Promise<CroApplication[]> {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(croApplications).orderBy(desc(croApplications.createdAt));
}

export async function getPendingCroApplications(): Promise<CroApplication[]> {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(croApplications).where(eq(croApplications.status, "pending")).orderBy(desc(croApplications.createdAt));
}

export async function updateCroApplication(id: number, updates: Partial<InsertCroApplication>) {
  const db = await getDb();
  if (!db) return;
  await db.update(croApplications).set(updates).where(eq(croApplications.id, id));
}

// ============= INTAKE INQUIRY FUNCTIONS =============

export async function createIntakeInquiry(data: InsertIntakeInquiry): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(intakeInquiries).values(data);
  return Number(result.insertId);
}

export async function getIntakeInquiryById(id: number): Promise<IntakeInquiry | undefined> {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(intakeInquiries).where(eq(intakeInquiries.id, id)).limit(1);
  return result[0];
}

export async function getIntakeInquiriesByCro(croUserId: number): Promise<IntakeInquiry[]> {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(intakeInquiries).where(eq(intakeInquiries.croUserId, croUserId)).orderBy(desc(intakeInquiries.createdAt));
}

export async function getAllIntakeInquiries(): Promise<IntakeInquiry[]> {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(intakeInquiries).orderBy(desc(intakeInquiries.createdAt));
}

export async function updateIntakeInquiry(id: number, updates: Partial<InsertIntakeInquiry>) {
  const db = await getDb();
  if (!db) return;
  await db.update(intakeInquiries).set(updates).where(eq(intakeInquiries.id, id));
}

// ============= CLIENT CRUD FUNCTIONS =============

export async function createClient(data: InsertClient): Promise<number> {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const [result] = await db.insert(clients).values(data);
  return Number(result.insertId);
}

export async function updateClient(id: number, updates: Partial<InsertClient>) {
  const db = await getDb();
  if (!db) return;
  await db.update(clients).set(updates).where(eq(clients.id, id));
}

export async function deleteClient(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.delete(clients).where(eq(clients.id, id));
}

export async function getClientsByCreatedBy(userId: number): Promise<Client[]> {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(clients).where(eq(clients.createdBy, userId)).orderBy(desc(clients.createdAt));
}

export async function getCasesByAssignedTo(userId: number): Promise<Case[]> {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(cases).where(eq(cases.assignedTo, userId)).orderBy(desc(cases.createdAt));
}

export async function getIntakeInquiryCountsByCro(croUserId: number) {
  const db = await getDb();
  if (!db) return { pending: 0, accepted: 0, rejected: 0 };
  const results = await db.select({
    status: intakeInquiries.status,
    count: sql<number>`count(*)`.as('count'),
  }).from(intakeInquiries)
    .where(eq(intakeInquiries.croUserId, croUserId))
    .groupBy(intakeInquiries.status);
  const counts = { pending: 0, accepted: 0, rejected: 0 };
  for (const r of results) {
    if (r.status === "pending") counts.pending = Number(r.count);
    if (r.status === "accepted") counts.accepted = Number(r.count);
    if (r.status === "rejected") counts.rejected = Number(r.count);
  }
  return counts;
}

// ============= CLIENT PORTAL FUNCTIONS =============

export async function getClientByPortalUserId(userId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select().from(clients).where(eq(clients.portalUserId, userId)).limit(1);
  return result[0] || null;
}

export async function getCasesByClientId(clientId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(cases).where(eq(cases.clientId, clientId)).orderBy(desc(cases.createdAt));
}

// ============= CRO PORTAL FUNCTIONS =============

/**
 * Get cases assigned to a specific CRO (returns minimal client info only)
 */
export async function getCasesAssignedToCro(croUserId: number) {
  const db = await getDb();
  if (!db) return [];
  const result = await db.select({
    caseId: cases.id,
    caseTitle: cases.title,
    clientId: cases.clientId,
    status: cases.status,
  }).from(cases)
    .where(eq(cases.assignedCroId, croUserId))
    .orderBy(desc(cases.createdAt));
  return result;
}

/**
 * Get CRO's own uploaded documents (credit reports)
 */
export async function getCroUploadedDocuments(croUserId: number) {
  const db = await getDb();
  if (!db) return [];
  return await db.select({
    id: documents.id,
    caseId: documents.caseId,
    fileName: documents.fileName,
    fileUrl: documents.fileUrl,
    fileSize: documents.fileSize,
    mimeType: documents.mimeType,
    creditReportSource: documents.creditReportSource,
    uploadedAt: documents.uploadedAt,
  }).from(documents)
    .where(
      and(
        eq(documents.uploadedBy, croUserId),
        eq(documents.category, "credit_report")
      )
    )
    .orderBy(desc(documents.uploadedAt));
}

/**
 * Get CRO statistics for admin dashboard
 */
export async function getCroStats() {
  const db = await getDb();
  if (!db) return [];

  // Get all CRO users
  const croUsers = await db.select({
    id: users.id,
    name: users.name,
    email: users.email,
    isActive: users.isActive,
    lastSignedIn: users.lastSignedIn,
  }).from(users)
    .where(eq(users.role, "cro"))
    .orderBy(users.name);

  // For each CRO, get their stats
  const stats = [];
  for (const cro of croUsers) {
    // Count assigned cases
    const assignedCases = await db.select({
      count: sql<number>`count(*)`.as('count'),
    }).from(cases)
      .where(eq(cases.assignedCroId, cro.id));

    // Count uploaded credit reports
    const uploads = await db.select({
      count: sql<number>`count(*)`.as('count'),
    }).from(documents)
      .where(
        and(
          eq(documents.uploadedBy, cro.id),
          eq(documents.category, "credit_report")
        )
      );

    // Count pending review cases (cases assigned to this CRO with status pending_review)
    const pendingReviews = await db.select({
      count: sql<number>`count(*)`.as('count'),
    }).from(cases)
      .where(
        and(
          eq(cases.assignedCroId, cro.id),
          eq(cases.status, "pending_review")
        )
      );

    stats.push({
      ...cro,
      assignedClientCount: Number(assignedCases[0]?.count || 0),
      uploadCount: Number(uploads[0]?.count || 0),
      pendingReviewCount: Number(pendingReviews[0]?.count || 0),
    });
  }

  return stats;
}

/**
 * Check if a case is already assigned to a CRO
 */
export async function getCaseAssignedCro(caseId: number) {
  const db = await getDb();
  if (!db) return null;
  const result = await db.select({
    assignedCroId: cases.assignedCroId,
  }).from(cases)
    .where(eq(cases.id, caseId))
    .limit(1);
  return result[0]?.assignedCroId || null;
}

/**
 * Assign a CRO to a case (enforces 1:1 relationship)
 */
export async function assignCroToCase(caseId: number, croUserId: number | null) {
  const db = await getDb();
  if (!db) return;
  await db.update(cases).set({ assignedCroId: croUserId }).where(eq(cases.id, caseId));
}

// ============= NOTIFICATION FUNCTIONS =============

export async function createNotification(notification: Omit<InsertNotification, "id" | "createdAt">) {
  const db = await getDb();
  if (!db) return;
  await db.insert(notifications).values(notification);
}

export async function getNotificationsByUserId(userId: number, limit = 50) {
  const db = await getDb();
  if (!db) return [];
  return await db.select().from(notifications)
    .where(eq(notifications.userId, userId))
    .orderBy(desc(notifications.createdAt))
    .limit(limit);
}

export async function getUnreadNotificationCount(userId: number): Promise<number> {
  const db = await getDb();
  if (!db) return 0;
  const result = await db.select({
    count: sql<number>`count(*)`.as("count"),
  }).from(notifications)
    .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
  return result[0]?.count ?? 0;
}

export async function markNotificationRead(id: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(notifications).set({ isRead: true, readAt: new Date() }).where(eq(notifications.id, id));
}

export async function markAllNotificationsRead(userId: number) {
  const db = await getDb();
  if (!db) return;
  await db.update(notifications).set({ isRead: true, readAt: new Date() })
    .where(and(eq(notifications.userId, userId), eq(notifications.isRead, false)));
}

/**
 * Notify all CROs and paralegals/admins associated with a case about a change.
 * Excludes the user who triggered the change.
 */
export async function getCaseNotificationRecipients(caseId: number, excludeUserId: number): Promise<number[]> {
  const db = await getDb();
  if (!db) return [];

  const caseData = await getCaseById(caseId);
  if (!caseData) return [];

  const recipientIds = new Set<number>();

  // Add the assigned user (paralegal/admin)
  if (caseData.assignedTo) recipientIds.add(caseData.assignedTo);
  // Add the assigned CRO
  if (caseData.assignedCroId) recipientIds.add(caseData.assignedCroId);
  // Add case creator
  if (caseData.createdBy) recipientIds.add(caseData.createdBy);

  // Add all admin and paralegal users
  const teamUsers = await db.select({ id: users.id }).from(users)
    .where(and(
      inArray(users.role, ["admin", "paralegal"]),
      eq(users.isActive, true)
    ));
  for (const u of teamUsers) {
    recipientIds.add(u.id);
  }

  // Remove the user who triggered the change
  recipientIds.delete(excludeUserId);

  return Array.from(recipientIds);
}
