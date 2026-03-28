import { int, mysqlEnum, mysqlTable, text, timestamp, varchar, boolean, bigint, index, decimal } from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  passwordHash: varchar("password_hash", { length: 255 }),
  role: mysqlEnum("role", ["user", "admin", "partner", "client", "legal", "cro", "paralegal"]).default("user").notNull(),
  partnerId: int("partnerId"), // Links to partners table for partner users
  trialDays: int("trialDays").default(3),
  trialStartDate: timestamp("trialStartDate"),
  trialExpirationSent: boolean("trialExpirationSent").default(false),
  isActive: boolean("isActive").default(true).notNull(),
  mustChangePassword: boolean("mustChangePassword").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
}, (table) => ({
  partnerIdIdx: index("partnerId_idx").on(table.partnerId),
}));

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * Partner organizations that can access the CRM
 */
export const partners = mysqlTable("partners", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  companyName: varchar("companyName", { length: 255 }),
  email: varchar("email", { length: 320 }).notNull(),
  phone: varchar("phone", { length: 50 }),
  address: text("address"),
  status: mysqlEnum("status", ["pending", "approved", "rejected"]).default("pending").notNull(),
  agreementAccepted: boolean("agreementAccepted").default(false).notNull(),
  agreementAcceptedAt: timestamp("agreementAcceptedAt"),
  approvedBy: int("approvedBy"), // Admin user ID who approved
  approvedAt: timestamp("approvedAt"),
  rejectionReason: text("rejectionReason"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  statusIdx: index("status_idx").on(table.status),
  emailIdx: index("email_idx").on(table.email),
}));

export type Partner = typeof partners.$inferSelect;
export type InsertPartner = typeof partners.$inferInsert;

/**
 * Individual clients (credit repair customers)
 */
export const clients = mysqlTable("clients", {
  id: int("id").autoincrement().primaryKey(),
  partnerId: int("partnerId").notNull(), // Partner who manages this client
  firstName: varchar("firstName", { length: 255 }).notNull(),
  lastName: varchar("lastName", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }),
  phone: varchar("phone", { length: 50 }),
  alternatePhone: varchar("alternatePhone", { length: 50 }),
  address: text("address"),
  city: varchar("city", { length: 100 }),
  state: varchar("state", { length: 50 }),
  zipCode: varchar("zipCode", { length: 20 }),
  dateOfBirth: timestamp("dateOfBirth"),
  ssn: varchar("ssn", { length: 255 }), // Encrypted
  stage: mysqlEnum("stage", ["lead", "prospect", "active", "completed", "inactive"]).default("lead").notNull(),
  source: varchar("source", { length: 100 }), // How they found us
  tags: text("tags"), // JSON array of tags
  notes: text("notes"),
  customFields: text("customFields"), // JSON for custom data
  portalAccess: boolean("portalAccess").default(false).notNull(),
  portalUserId: int("portalUserId"), // Link to users table if portal access granted
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  partnerIdIdx: index("partnerId_idx").on(table.partnerId),
  emailIdx: index("email_idx").on(table.email),
  stageIdx: index("stage_idx").on(table.stage),
}));

export type Client = typeof clients.$inferSelect;
export type InsertClient = typeof clients.$inferInsert;

/**
 * Cases in the CRM pipeline
 */
export const cases = mysqlTable("cases", {
  id: int("id").autoincrement().primaryKey(),
  partnerId: int("partnerId").notNull(), // Partner who owns this case
  clientId: int("clientId"), // Link to clients table
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  status: mysqlEnum("status", ["new", "pending_review", "in_review", "more_info_needed", "ready_for_attorney", "sent_to_attorney", "accepted_by_attorney", "rejected", "settled", "settlement_paid_out", "closed"]).default("new").notNull(),
  priority: mysqlEnum("priority", ["low", "medium", "high", "urgent"]).default("medium").notNull(),
  assignedTo: int("assignedTo"), // User ID assigned to this case
  assignedCroId: int("assignedCroId"), // CRO user ID assigned to this case
  caseType: varchar("caseType", { length: 100 }), // e.g., "FCRA Violation", "Credit Dispute"
  estimatedValue: decimal("estimatedValue", { precision: 10, scale: 2 }),
  actualValue: decimal("actualValue", { precision: 10, scale: 2 }),
  dueDate: timestamp("dueDate"),
  completedAt: timestamp("completedAt"),
  closedAt: timestamp("closedAt"),
  settlementPaidOutDate: timestamp("settlementPaidOutDate"),
  dateSubmittedToAttorney: timestamp("dateSubmittedToAttorney"),
  googleDriveLink: text("googleDriveLink"), // Google Drive folder/file link for this case
  customFields: text("customFields"), // JSON for custom data
  createdBy: int("createdBy").notNull(), // User ID who created the case
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  partnerIdIdx: index("partnerId_idx").on(table.partnerId),
  clientIdIdx: index("clientId_idx").on(table.clientId),
  statusIdx: index("status_idx").on(table.status),
  assignedToIdx: index("assignedTo_idx").on(table.assignedTo),
  assignedCroIdIdx: index("assignedCroId_idx").on(table.assignedCroId),
}));

export type Case = typeof cases.$inferSelect;
export type InsertCase = typeof cases.$inferInsert;

/**
 * Tasks associated with cases
 */
export const tasks = mysqlTable("tasks", {
  id: int("id").autoincrement().primaryKey(),
  caseId: int("caseId").notNull(),
  parentTaskId: int("parentTaskId"), // For subtasks
  title: varchar("title", { length: 255 }).notNull(),
  description: text("description"),
  status: mysqlEnum("status", ["pending", "in_progress", "completed", "cancelled"]).default("pending").notNull(),
  priority: mysqlEnum("priority", ["low", "medium", "high", "urgent"]).default("medium").notNull(),
  assignedTo: int("assignedTo"), // User ID assigned to this task
  dueDate: timestamp("dueDate"),
  completedAt: timestamp("completedAt"),
  timeTracked: int("timeTracked").default(0), // Minutes
  isRecurring: boolean("isRecurring").default(false),
  recurringPattern: text("recurringPattern"), // JSON for recurrence rules
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  caseIdIdx: index("caseId_idx").on(table.caseId),
  parentTaskIdIdx: index("parentTaskId_idx").on(table.parentTaskId),
  statusIdx: index("status_idx").on(table.status),
  assignedToIdx: index("assignedTo_idx").on(table.assignedTo),
}));

export type Task = typeof tasks.$inferSelect;
export type InsertTask = typeof tasks.$inferInsert;



/**
 * Documents attached to cases or clients (stored in S3)
 */
export const documents = mysqlTable("documents", {
  id: int("id").autoincrement().primaryKey(),
  caseId: int("caseId"),
  clientId: int("clientId"),
  category: varchar("category", { length: 100 }), // e.g., "credit_report", "dispute_letter", "legal_doc"
  fileName: varchar("fileName", { length: 255 }).notNull(),
  fileKey: varchar("fileKey", { length: 500 }).notNull(), // S3 key
  fileUrl: text("fileUrl").notNull(), // S3 URL
  fileSize: bigint("fileSize", { mode: "number" }),
  mimeType: varchar("mimeType", { length: 100 }),
  version: int("version").default(1),
  isLatestVersion: boolean("isLatestVersion").default(true),
  tags: text("tags"), // JSON array
  creditReportSource: varchar("creditReportSource", { length: 255 }), // e.g., "AnnualCreditReport.com"
  expiresAt: timestamp("expiresAt"), // For retention policies
  requiresSignature: boolean("requiresSignature").default(false),
  signedBy: varchar("signedBy", { length: 255 }),
  signedAt: timestamp("signedAt"),
  signatureUrl: text("signatureUrl"),
  signaturePositionX: decimal("signaturePositionX", { precision: 7, scale: 2 }), // X position as percentage (0-100)
  signaturePositionY: decimal("signaturePositionY", { precision: 7, scale: 2 }), // Y position as percentage (0-100)
  signatureScale: decimal("signatureScale", { precision: 5, scale: 2 }).default("1.00"), // Scale factor
  uploadedBy: int("uploadedBy").notNull(),
  uploadedAt: timestamp("uploadedAt").defaultNow().notNull(),
}, (table) => ({
  caseIdIdx: index("caseId_idx").on(table.caseId),
  clientIdIdx: index("clientId_idx").on(table.clientId),
  categoryIdx: index("category_idx").on(table.category),
}));

export type Document = typeof documents.$inferSelect;
export type InsertDocument = typeof documents.$inferInsert;

/**
 * Activity timeline for cases and users
 */
export const activityLogs = mysqlTable("activityLogs", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId"), // User who performed the action
  partnerId: int("partnerId"), // Partner context
  clientId: int("clientId"), // Related client if applicable
  caseId: int("caseId"), // Related case if applicable
  taskId: int("taskId"), // Related task if applicable
  action: varchar("action", { length: 100 }).notNull(), // e.g., "case_created", "task_completed", "login"
  description: text("description"),
  metadata: text("metadata"), // JSON string for additional data
  ipAddress: varchar("ipAddress", { length: 45 }),
  userAgent: text("userAgent"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("userId_idx").on(table.userId),
  partnerIdIdx: index("partnerId_idx").on(table.partnerId),
  clientIdIdx: index("clientId_idx").on(table.clientId),
  caseIdIdx: index("caseId_idx").on(table.caseId),
  actionIdx: index("action_idx").on(table.action),
  createdAtIdx: index("createdAt_idx").on(table.createdAt),
}));

export type ActivityLog = typeof activityLogs.$inferSelect;
export type InsertActivityLog = typeof activityLogs.$inferInsert;







/**
 * Notifications for users
 */
export const notifications = mysqlTable("notifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  type: varchar("type", { length: 100 }).notNull(), // e.g., "task_assigned", "case_updated"
  title: varchar("title", { length: 255 }).notNull(),
  message: text("message"),
  link: varchar("link", { length: 500 }), // URL to navigate to
  isRead: boolean("isRead").default(false).notNull(),
  readAt: timestamp("readAt"),
  metadata: text("metadata"), // JSON for additional data
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("userId_idx").on(table.userId),
  isReadIdx: index("isRead_idx").on(table.isRead),
  createdAtIdx: index("createdAt_idx").on(table.createdAt),
}));

export type Notification = typeof notifications.$inferSelect;
export type InsertNotification = typeof notifications.$inferInsert;

/**
 * Password reset tokens
 */
export const passwordResetTokens = mysqlTable("passwordResetTokens", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  token: varchar("token", { length: 255 }).notNull().unique(),
  expiresAt: timestamp("expiresAt").notNull(),
  used: boolean("used").default(false).notNull(),
  usedAt: timestamp("usedAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  tokenIdx: index("token_idx").on(table.token),
  userIdIdx: index("userId_idx").on(table.userId),
}));

export type PasswordResetToken = typeof passwordResetTokens.$inferSelect;
export type InsertPasswordResetToken = typeof passwordResetTokens.$inferInsert;

/**
 * Admin invite tokens for VIP access
 */
export const inviteTokens = mysqlTable("inviteTokens", {
  id: int("id").autoincrement().primaryKey(),
  token: varchar("token", { length: 255 }).notNull().unique(),
  email: varchar("email", { length: 320 }),
  role: mysqlEnum("role", ["user", "admin", "partner", "client", "legal", "cro", "paralegal"]).default("user").notNull(),
  maxUses: int("maxUses").default(1),
  usedCount: int("usedCount").default(0),
  expiresAt: timestamp("expiresAt"),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
}, (table) => ({
  tokenIdx: index("token_idx").on(table.token),
}));

export type InviteToken = typeof inviteTokens.$inferSelect;
export type InsertInviteToken = typeof inviteTokens.$inferInsert;

/**
 * Rate limiting tracking
 */
export const rateLimits = mysqlTable("rateLimits", {
  id: int("id").autoincrement().primaryKey(),
  identifier: varchar("identifier", { length: 255 }).notNull(), // IP address or user ID
  endpoint: varchar("endpoint", { length: 100 }).notNull(),
  requestCount: int("requestCount").default(0).notNull(),
  windowStart: timestamp("windowStart").defaultNow().notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  identifierEndpointIdx: index("identifier_endpoint_idx").on(table.identifier, table.endpoint),
}));

export type RateLimit = typeof rateLimits.$inferSelect;
export type InsertRateLimit = typeof rateLimits.$inferInsert;

/**
 * Case comments for CRO and Paralegal communication
 */
export const caseComments = mysqlTable("caseComments", {
  id: int("id").autoincrement().primaryKey(),
  caseId: int("caseId").notNull(),
  userId: int("userId").notNull(),
  userName: varchar("userName", { length: 255 }).notNull(), // Denormalized for display
  userRole: varchar("userRole", { length: 50 }).notNull(), // Denormalized for display
  comment: text("comment").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  caseIdIdx: index("caseId_idx").on(table.caseId),
  userIdIdx: index("userId_idx").on(table.userId),
  createdAtIdx: index("createdAt_idx").on(table.createdAt),
}));

export type CaseComment = typeof caseComments.$inferSelect;
export type InsertCaseComment = typeof caseComments.$inferInsert;

/**
 * External file storage links (Google Drive, Dropbox, OneDrive, etc.) per case
 */
export const externalLinks = mysqlTable("externalLinks", {
  id: int("id").autoincrement().primaryKey(),
  caseId: int("caseId").notNull(),
  label: varchar("label", { length: 255 }).notNull(), // e.g., "Google Drive Folder", "Dropbox Files"
  url: text("url").notNull(), // Full URL to external storage
  createdBy: int("createdBy").notNull(), // User ID who added the link
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  caseIdIdx: index("caseId_idx").on(table.caseId),
}));

export type ExternalLink = typeof externalLinks.$inferSelect;
export type InsertExternalLink = typeof externalLinks.$inferInsert;

/**
 * Signature templates for reusable signatures across documents
 */
export const signatureTemplates = mysqlTable("signatureTemplates", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(), // User who owns this template
  name: varchar("name", { length: 255 }).notNull(), // Template name (e.g., "My Signature", "Initials")
  signatureUrl: text("signatureUrl").notNull(), // S3 URL to signature image
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  userIdIdx: index("userId_idx").on(table.userId),
}));

export type SignatureTemplate = typeof signatureTemplates.$inferSelect;
export type InsertSignatureTemplate = typeof signatureTemplates.$inferInsert;

/**
 * CRO Applications — pending signup requests before account creation
 */
export const croApplications = mysqlTable("croApplications", {
  id: int("id").autoincrement().primaryKey(),
  name: varchar("name", { length: 255 }).notNull(),
  email: varchar("email", { length: 320 }).notNull(),
  phone: varchar("phone", { length: 50 }),
  companyName: varchar("companyName", { length: 255 }),
  agreementAccepted: boolean("agreementAccepted").default(false).notNull(),
  agreementAcceptedAt: timestamp("agreementAcceptedAt"),
  status: mysqlEnum("status", ["pending", "approved", "rejected"]).default("pending").notNull(),
  reviewedBy: int("reviewedBy"),
  reviewedAt: timestamp("reviewedAt"),
  rejectionReason: text("rejectionReason"),
  userId: int("userId"), // Linked user account after approval
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  statusIdx: index("cro_app_status_idx").on(table.status),
  emailIdx: index("cro_app_email_idx").on(table.email),
}));

export type CroApplication = typeof croApplications.$inferSelect;
export type InsertCroApplication = typeof croApplications.$inferInsert;

/**
 * Intake Inquiries — CRO-submitted intake forms for paralegal review
 */
export const intakeInquiries = mysqlTable("intakeInquiries", {
  id: int("id").autoincrement().primaryKey(),
  croUserId: int("croUserId").notNull(), // FK → users.id (the CRO who submitted)
  croName: varchar("croName", { length: 255 }).notNull(),
  clientFirstName: varchar("clientFirstName", { length: 255 }).notNull(),
  clientLastName: varchar("clientLastName", { length: 255 }).notNull(),
  clientDateOfBirth: timestamp("clientDateOfBirth"),
  clientEmail: varchar("clientEmail", { length: 320 }).notNull(),
  clientFullAddress: text("clientFullAddress").notNull(),
  clientAddress: text("clientAddress"),
  clientCity: varchar("clientCity", { length: 100 }),
  clientState: varchar("clientState", { length: 50 }),
  clientZipCode: varchar("clientZipCode", { length: 20 }),
  supportingDocuments: text("supportingDocuments"), // JSON array of S3 URLs
  annualCreditReportScreenshot: text("annualCreditReportScreenshot"), // S3 URL for AnnualCreditReport.com proof
  status: mysqlEnum("intakeStatus", ["pending", "accepted", "rejected"]).default("pending").notNull(),
  reviewedBy: int("reviewedBy"), // FK → users.id (paralegal/admin who reviewed)
  reviewedAt: timestamp("reviewedAt"),
  rejectionReason: text("rejectionReason"),
  caseId: int("caseId"), // FK → cases.id (linked case after acceptance)
  clientNotificationSent: boolean("clientNotificationSent").default(false).notNull(),
  clientNotificationSentAt: timestamp("clientNotificationSentAt"),
  croNotificationSent: boolean("croNotificationSent").default(false).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  croUserIdIdx: index("intake_croUserId_idx").on(table.croUserId),
  statusIdx: index("intake_status_idx").on(table.status),
  caseIdIdx: index("intake_caseId_idx").on(table.caseId),
}));

export type IntakeInquiry = typeof intakeInquiries.$inferSelect;
export type InsertIntakeInquiry = typeof intakeInquiries.$inferInsert;

/**
 * API Keys for external REST API access (credit repair software integration)
 */
export const apiKeys = mysqlTable("apiKeys", {
  id: int("id").autoincrement().primaryKey(),
  partnerId: int("partnerId").notNull(),
  keyHash: varchar("keyHash", { length: 255 }).notNull(),
  keyPrefix: varchar("keyPrefix", { length: 12 }).notNull(),
  name: varchar("name", { length: 255 }).notNull(),
  permissions: text("permissions"), // JSON array e.g. ["clients:read","cases:read","documents:read"]
  isActive: boolean("isActive").default(true).notNull(),
  lastUsedAt: timestamp("lastUsedAt"),
  expiresAt: timestamp("expiresAt"),
  createdBy: int("createdBy").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
}, (table) => ({
  partnerIdIdx: index("apikey_partnerId_idx").on(table.partnerId),
  keyPrefixIdx: index("apikey_keyPrefix_idx").on(table.keyPrefix),
  isActiveIdx: index("apikey_isActive_idx").on(table.isActive),
}));

export type ApiKey = typeof apiKeys.$inferSelect;
export type InsertApiKey = typeof apiKeys.$inferInsert;
