import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { nanoid } from "nanoid";
import bcrypt from "bcryptjs";

// Extracted domain routers (SOLID: Single Responsibility)
import {
  authRouter,
  passwordRouter,
  invitesRouter,
  usersRouter,
  activityRouter,
  notificationsRouter,
  signatureTemplatesRouter,
  externalLinksRouter,
} from "./routers/index";

// Extracted middleware (SOLID: Open/Closed for role-based access)
import {
  adminProcedure,
  croProcedure,
  adminParalegalProcedure,
  teamProcedure,
  clientProcedure,
} from "./middleware/procedures";

// Extracted notification service (SOLID: Single Responsibility)
import { notifyCaseChangeToTeam } from "./services/notificationService";

// Database operations (still used by remaining inline routers)
import {
  createCase,
  getCaseById,
  getAllCases,
  updateCase,
  deleteCase,
  createTask,
  getTaskById,
  getTasksByCaseId,
  updateTask,
  deleteTask,
  createDocument,
  getCaseDocuments,
  getAllDocuments,
  getDocumentById,
  getDocumentByIdRaw,
  createActivityLog,
  getUserById,
  getUserByEmail,
  updateUser,
  createCaseComment,
  getCommentsByCaseId,
  deleteComment,
  getCommentCountsByCaseIds,
  getLatestCommentsByCaseIds,
  getAllClients,
  getTeamMembers,
  getEnrichedTimelineByCaseId,
  getEnrichedCaseDocuments,
  deleteDocumentWithLog,
  updateDocument,
  bulkUpdateCaseStatus,
  bulkDeleteCases,
  createIntakeInquiry,
  getIntakeInquiryById,
  getIntakeInquiriesByCro,
  getAllIntakeInquiries,
  updateIntakeInquiry,
  createClient,
  getClientById,
  updateClient,
  deleteClient,
  getClientsByCreatedBy,
  getAllClientsWithCro,
  getCasesByAssignedTo,
  getIntakeInquiryCountsByCro,
  createCroApplication,
  getCroApplicationById,
  getCroApplicationByEmail,
  getAllCroApplications,
  getPendingCroApplications,
  updateCroApplication,
  getClientByPortalUserId,
  getCasesByClientId,
  getCroStats,
  getSignedAOCByClientId,
} from "./db";

import {
  notifyCaseAssignment,
  sendIntakeClientNotification,
  sendIntakeCroAcceptedNotification,
  sendCroCredentialsEmail,
  sendClientCommentCroNotification,
  sendCaseStatusChangeCroNotification,
  sendClientCredentialsEmail,
  sendAOCSignatureRequiredEmail,
} from "./email";
import { storagePut, storageGet } from "./storage";
import { notifyOwner } from "./_core/notification";

export const appRouter = router({
  system: systemRouter,
  
  auth: authRouter,

  // Case management
  cases: router({
    // Create case
    create: teamProcedure
      .input(z.object({
        title: z.string().min(1),
        description: z.string().optional(),
        priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
        clientId: z.number().optional(),
        caseType: z.string().optional(),
        estimatedValue: z.number().optional(),
        dueDate: z.date().optional(),
        googleDriveLink: z.string().optional(),
        assignedCroId: z.number().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const partnerId = ctx.user.partnerId || 1; // Default org

        const caseId = await createCase({
          ...input,
          estimatedValue: input.estimatedValue?.toString(),
          partnerId,
          createdBy: ctx.user.id,
          status: "new",
        });

        // Log activity
        await createActivityLog({
          userId: ctx.user.id,
          caseId,
          action: "case_created",
          description: `Case created: ${input.title}`,
        });

        // Notify team
        notifyCaseChangeToTeam({
          caseId,
          triggeredByUserId: ctx.user.id,
          type: "case_created",
          title: "New Case Created",
          message: `${ctx.user.name || "A team member"} created a new case: ${input.title}`,
        }).catch(() => {});

        // Auto-create client portal account if client is linked and doesn't have one
        let newClientCredentials: { username: string; password: string; clientName: string } | null = null;
        if (input.clientId) {
          const clientRecord = await getClientById(input.clientId);
          if (clientRecord && !clientRecord.portalUserId && clientRecord.email) {
            // Check if user account already exists for this email
            const existingUser = await getUserByEmail(clientRecord.email);
            if (existingUser) {
              // Link existing user to client
              await updateClient(input.clientId, {
                portalAccess: true,
                portalUserId: existingUser.id,
              });
            } else {
              // Create new user account for the client
              const tempPassword = nanoid(12);
              const passwordHash = await bcrypt.hash(tempPassword, 10);
              const clientOpenId = nanoid(16);
              const { upsertUser } = await import("./db");
              await upsertUser({
                openId: clientOpenId,
                name: `${clientRecord.firstName} ${clientRecord.lastName}`,
                email: clientRecord.email,
                role: "client",
                passwordHash,
                isActive: true,
                mustChangePassword: true,
              });
              const newClientUser = await getUserByEmail(clientRecord.email);
              if (newClientUser) {
                await updateClient(input.clientId, {
                  portalAccess: true,
                  portalUserId: newClientUser.id,
                });

                // Send credentials email to the client
                const clientName = `${clientRecord.firstName} ${clientRecord.lastName}`;
                sendClientCredentialsEmail(clientRecord.email, clientName, tempPassword).catch((err) => {
                  console.error("[Email] Failed to send client credentials:", err);
                });

                newClientCredentials = {
                  username: clientRecord.email,
                  password: tempPassword,
                  clientName,
                };

                await createActivityLog({
                  userId: ctx.user.id,
                  clientId: input.clientId,
                  caseId,
                  action: "client_portal_account_created",
                  description: `Portal account auto-created for client: ${clientName} (${clientRecord.email})`,
                });
              }
            }
          }
        }

        // Send AOC signature required email only if client has a portal account
        // and has NOT already signed the AOC (prevents duplicate emails on 2nd+ cases)
        if (input.clientId) {
          const clientForAOC = await getClientById(input.clientId);
          if (clientForAOC?.portalUserId && clientForAOC.email) {
            const signedAOC = await getSignedAOCByClientId(input.clientId);
            if (!signedAOC) {
              const clientName = `${clientForAOC.firstName} ${clientForAOC.lastName}`;
              sendAOCSignatureRequiredEmail(clientForAOC.email, clientName).catch((err) => {
                console.error("[Email] Failed to send AOC signature required email:", err);
              });
            }
          }
        }

        // Return the created case
        const createdCase = await getCaseById(caseId);
        if (!createdCase) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Case not found after creation" });
        }
        return { ...createdCase, newClientCredentials };
      }),

    // List all cases (with escalation check)
    list: teamProcedure.query(async ({ ctx }) => {
      const allCases = await getAllCases();
      
      // Auto-escalate cases stuck in pending_review
      const now = Date.now();
      const MEDIUM_TO_HIGH_MS = 48 * 60 * 60 * 1000; // 48 hours
      const HIGH_TO_URGENT_MS = 72 * 60 * 60 * 1000; // 72 hours
      
      for (const c of allCases) {
        if (c.status !== "pending_review") continue;
        const ageMs = now - new Date(c.updatedAt).getTime();
        
        let newPriority: string | null = null;
        if (c.priority !== "urgent" && ageMs > HIGH_TO_URGENT_MS) {
          newPriority = "urgent";
        } else if (c.priority === "medium" && ageMs > MEDIUM_TO_HIGH_MS) {
          newPriority = "high";
        }
        
        if (newPriority && newPriority !== c.priority) {
          await updateCase(c.id, { priority: newPriority as any });
          await createCaseComment({
            caseId: c.id,
            userId: ctx.user.id,
            userName: "System",
            userRole: "system",
            comment: `Priority auto-escalated from ${c.priority} to ${newPriority} — case has been pending review for over ${ageMs > HIGH_TO_URGENT_MS ? "72" : "48"} hours`,
          });
          // Update in-memory too
          (c as any).priority = newPriority;
        }
      }
      
      return allCases;
    }),

    // Get document checklist completion for a case
    checklist: teamProcedure
      .input(z.object({ caseId: z.number(), caseType: z.string() }))
      .query(async ({ input }) => {
        const docs = await getCaseDocuments(input.caseId);
        const uploadedCategories = docs.map((d) => d.category).filter(Boolean) as string[];
        
        // Import checklist helper
        const { getChecklistCompletion } = await import("../shared/caseChecklist");
        return getChecklistCompletion(input.caseType, uploadedCategories);
      }),

    // Get case by ID
    getById: teamProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input, ctx }) => {
        const caseData = await getCaseById(input.id);
        if (!caseData) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Case not found" });
        }

        return caseData;
      }),

    // Update case
    update: teamProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().optional(),
        description: z.string().optional(),
        status: z.enum(["new", "pending_review", "in_review", "more_info_needed", "ready_for_attorney", "sent_to_attorney", "accepted_by_attorney", "rejected", "settled", "settlement_paid_out", "closed"]).optional(),
        priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
        caseType: z.string().optional(),
        estimatedValue: z.number().optional(),
        clientId: z.number().nullable().optional(),
        assignedTo: z.number().optional(),
        assignedCroId: z.number().nullable().optional(),
        dueDate: z.date().optional(),
        settlementPaidOutDate: z.date().optional(),
        dateSubmittedToAttorney: z.date().optional(),
        googleDriveLink: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { id, estimatedValue, ...rest } = input;
        const updates: any = { ...rest };
        if (estimatedValue !== undefined) {
          updates.estimatedValue = estimatedValue.toString();
        }
        const caseData = await getCaseById(id);

        if (!caseData) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Case not found" });
        }


        await updateCase(id, updates);

        // Auto-post system comment on status change for audit trail
        if (updates.status && updates.status !== caseData.status) {
          const statusLabels: Record<string, string> = {
            new: "New",
            pending_review: "Pending Review",
            in_review: "In Review",
            more_info_needed: "More Information Needed",
            ready_for_attorney: "Ready for Attorney",
            sent_to_attorney: "Sent to Attorney",
            accepted_by_attorney: "Accepted by Attorney",
            rejected: "Rejected Case",
            settled: "Settled",
            settlement_paid_out: "Settlement Paid Out",
            closed: "Closed",
          };
          const fromLabel = statusLabels[caseData.status] || caseData.status;
          const toLabel = statusLabels[updates.status] || updates.status;
          await createCaseComment({
            caseId: id,
            userId: ctx.user.id,
            userName: ctx.user.name || "System",
            userRole: "system",
            comment: `Status changed from ${fromLabel} to ${toLabel}`,
          });

          // Email notifications on key status changes
          const actorName = ctx.user.name || "Team member";
          if (updates.status === "pending_review") {
            // CRO submitted case for review
            notifyOwner({
              title: `Case Submitted for Review: ${caseData.title}`,
              content: `${actorName} has submitted case #${id} "${caseData.title}" for paralegal review. Status changed from ${fromLabel} to Pending Review.`,
            }).catch(() => {});
          } else if (updates.status === "new" && caseData.status !== "new") {
            // Paralegal sent case back to CRO
            notifyOwner({
              title: `Case Sent Back to CRO: ${caseData.title}`,
              content: `${actorName} has sent case #${id} "${caseData.title}" back to CRO for revisions. The case requires additional information or documents.`,
            }).catch(() => {});
          } else if (updates.status === "ready_for_attorney") {
            // Paralegal marked case ready for attorney
            notifyOwner({
              title: `Case Ready for Attorney: ${caseData.title}`,
              content: `${actorName} has marked case #${id} "${caseData.title}" as ready for attorney review. All documents have been reviewed and prepared.`,
            }).catch(() => {});
          }

          // Email CRO about status change (when changed by paralegal/admin)
          if (caseData.assignedCroId && ctx.user.role !== "cro") {
            const croUser = await getUserById(caseData.assignedCroId);
            if (croUser?.email) {
              sendCaseStatusChangeCroNotification(
                croUser.email,
                croUser.name || "CRO",
                caseData.title,
                id,
                caseData.status,
                updates.status,
                ctx.user.name || "Team member",
              ).catch((err) => console.error("[Email] Failed to notify CRO of status change:", err));
            }
          }
        }

        // Log activity
        await createActivityLog({
          userId: ctx.user.id,
          caseId: id,
          action: "case_updated",
          description: `Case updated: ${caseData.title}`,
          metadata: JSON.stringify(updates),
        });

        // Notify team about case update
        const updateParts: string[] = [];
        if (updates.status) updateParts.push(`status changed to ${updates.status}`);
        if (updates.priority) updateParts.push(`priority changed to ${updates.priority}`);
        if (updates.assignedTo) updateParts.push(`assigned to a new team member`);
        const updateSummary = updateParts.length > 0 ? updateParts.join(", ") : "details updated";
        notifyCaseChangeToTeam({
          caseId: id,
          triggeredByUserId: ctx.user.id,
          type: "case_updated",
          title: `Case Updated: ${caseData.title}`,
          message: `${ctx.user.name || "A team member"} updated case #${id}: ${updateSummary}`,
        }).catch(() => {});

        // Return updated case
        const updatedCase = await getCaseById(id);
        if (!updatedCase) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Case not found after update" });
        }
        return updatedCase;
      }),

    // Delete case
    delete: teamProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const caseData = await getCaseById(input.id);
        
        if (!caseData) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Case not found" });
        }


        await deleteCase(input.id);

        // Log activity
        await createActivityLog({
          userId: ctx.user.id,
          caseId: input.id,
          action: "case_deleted",
          description: `Case deleted: ${caseData.title}`,
        });

        return { success: true };
      }),

    // Get case timeline
    timeline: teamProcedure
      .input(z.object({ caseId: z.number() }))
      .query(async ({ input, ctx }) => {
        const caseData = await getCaseById(input.caseId);
        
        if (!caseData) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Case not found" });
        }


        return await getEnrichedTimelineByCaseId(input.caseId);
      }),

    // Add comment to case
    addComment: teamProcedure
      .input(z.object({
        caseId: z.number(),
        comment: z.string().min(1),
      }))
      .mutation(async ({ input, ctx }) => {
        const caseData = await getCaseById(input.caseId);
        
        if (!caseData) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Case not found" });
        }


        const commentId = await createCaseComment({
          caseId: input.caseId,
          userId: ctx.user.id,
          userName: ctx.user.name || "Unknown User",
          userRole: ctx.user.role,
          comment: input.comment,
        });

        // Log activity
        await createActivityLog({
          userId: ctx.user.id,
          caseId: input.caseId,
          action: "comment_added",
          description: `Comment added to case: ${caseData.title}`,
        });

        // Notify team
        notifyCaseChangeToTeam({
          caseId: input.caseId,
          triggeredByUserId: ctx.user.id,
          type: "comment_added",
          title: `New Comment on Case: ${caseData.title}`,
          message: `${ctx.user.name || "A team member"} commented on case #${input.caseId}: "${input.comment.substring(0, 100)}${input.comment.length > 100 ? "..." : ""}"`,
        }).catch(() => {});

        return { success: true, commentId };
      }),

    // Get comment counts for multiple cases
    getCounts: teamProcedure
      .input(z.object({ caseIds: z.array(z.number()) }))
      .query(async ({ input }) => {
        return await getCommentCountsByCaseIds(input.caseIds);
      }),

    // Get latest comments for multiple cases
    getLatest: teamProcedure
      .input(z.object({ caseIds: z.array(z.number()) }))
      .query(async ({ input }) => {
        return await getLatestCommentsByCaseIds(input.caseIds);
      }),

    // Get comments for a case
    getComments: teamProcedure
      .input(z.object({ caseId: z.number() }))
      .query(async ({ input, ctx }) => {
        const caseData = await getCaseById(input.caseId);
        
        if (!caseData) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Case not found" });
        }


        return await getCommentsByCaseId(input.caseId);
      }),

    // Bulk status update
    bulkUpdateStatus: teamProcedure
      .input(z.object({
        caseIds: z.array(z.number()).min(1),
        status: z.enum(["new", "pending_review", "in_review", "more_info_needed", "ready_for_attorney", "sent_to_attorney", "accepted_by_attorney", "rejected", "settled", "settlement_paid_out", "closed"]),
      }))
      .mutation(async ({ input, ctx }) => {
        const result = await bulkUpdateCaseStatus(input.caseIds, input.status);

        // Log bulk status update for each case
        const statusLabels: Record<string, string> = {
          new: "New", pending_review: "Pending Review", in_review: "In Review",
          more_info_needed: "More Information Needed", ready_for_attorney: "Ready for Attorney",
          sent_to_attorney: "Sent to Attorney", accepted_by_attorney: "Accepted by Attorney",
          rejected: "Rejected Case", settled: "Settled", settlement_paid_out: "Settlement Paid Out",
          closed: "Closed",
        };
        for (const caseId of input.caseIds) {
          await createActivityLog({
            userId: ctx.user.id,
            caseId,
            action: "case_updated",
            description: `Bulk status update to ${statusLabels[input.status] || input.status}`,
          });
          // Auto-post system comment
          await createCaseComment({
            caseId,
            userId: ctx.user.id,
            userName: ctx.user.name || "System",
            userRole: "system",
            comment: `Bulk status update to ${statusLabels[input.status] || input.status}`,
          });

          // Email CRO about status change (when changed by paralegal/admin)
          if (ctx.user.role !== "cro") {
            const c = await getCaseById(caseId);
            if (c?.assignedCroId) {
              const croUser = await getUserById(c.assignedCroId);
              if (croUser?.email) {
                sendCaseStatusChangeCroNotification(
                  croUser.email,
                  croUser.name || "CRO",
                  c.title,
                  caseId,
                  c.status,
                  input.status,
                  ctx.user.name || "Team member",
                ).catch((err) => console.error("[Email] Failed to notify CRO of bulk status change:", err));
              }
            }
          }
        }

        return { success: true, affected: result.affected };
      }),

    // Bulk delete with password verification (security measure)
    bulkDelete: teamProcedure
      .input(z.object({
        caseIds: z.array(z.number()).min(1),
        password: z.string().min(1, "Password is required for bulk delete"),
      }))
      .mutation(async ({ input, ctx }) => {
        // Verify password server-side for security
        const user = await getUserByEmail(ctx.user.email || "");
        if (!user || !user.passwordHash) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Unable to verify identity" });
        }
        const valid = await bcrypt.compare(input.password, user.passwordHash);
        if (!valid) {
          throw new TRPCError({ code: "UNAUTHORIZED", message: "Incorrect password. Bulk delete cancelled." });
        }

        // Get case titles for logging before deletion
        const caseTitles: string[] = [];
        for (const caseId of input.caseIds) {
          const c = await getCaseById(caseId);
          if (c) caseTitles.push(c.title);
        }

        const result = await bulkDeleteCases(input.caseIds);

        // Log bulk delete
        await createActivityLog({
          userId: ctx.user.id,
          action: "bulk_delete",
          description: `Bulk deleted ${result.affected} cases: ${caseTitles.join(", ")}`,
        });

        return { success: true, affected: result.affected };
      }),
  }),

  // Client management
  clients: router({
    list: adminParalegalProcedure.query(async () => {
      return await getAllClientsWithCro();
    }),

    getById: adminParalegalProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const client = await getClientById(input.id);
        if (!client) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Client not found" });
        }
        // Get CRO info
        const cro = await getUserById(client.createdBy);
        // Get portal user info
        let portalUser = null;
        if (client.portalUserId) {
          portalUser = await getUserById(client.portalUserId);
        }
        return {
          ...client,
          croName: cro?.name || null,
          croEmail: cro?.email || null,
          portalUserEmail: portalUser?.email || null,
          portalUserActive: portalUser?.isActive ?? null,
        };
      }),

    create: adminParalegalProcedure
      .input(z.object({
        firstName: z.string().min(1),
        lastName: z.string().min(1),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        address: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        zipCode: z.string().optional(),
        stage: z.enum(["lead", "prospect", "active", "completed", "inactive"]).default("lead"),
        notes: z.string().optional(),
        assignedCroId: z.number().optional(),
        username: z.string().email().optional(),
        password: z.string().min(6).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { username, password, assignedCroId, ...clientData } = input;

        let portalUserId: number | undefined;

        // If username and password provided, create a portal user account
        if (username && password) {
          const existingUser = await getUserByEmail(username);
          if (existingUser) {
            throw new TRPCError({ code: "BAD_REQUEST", message: "A user with this email already exists" });
          }
          const hashedPassword = await bcrypt.hash(password, 10);
          const openId = nanoid(16);
          const { upsertUser } = await import("./db");
          await upsertUser({
            openId,
            name: `${input.firstName} ${input.lastName}`,
            email: username,
            role: "client",
            passwordHash: hashedPassword,
            isActive: true,
          });
          const newUser = await getUserByEmail(username);
          portalUserId = newUser?.id;
        }

        const createdBy = assignedCroId || ctx.user.id;
        const clientId = await createClient({
          ...clientData,
          partnerId: ctx.user.partnerId || 1,
          createdBy,
          portalAccess: !!portalUserId,
          portalUserId: portalUserId ?? null,
        });
        await createActivityLog({
          userId: ctx.user.id,
          clientId,
          action: "client_created",
          description: `Client created by admin: ${input.firstName} ${input.lastName}${assignedCroId ? ` (assigned to CRO #${assignedCroId})` : ""}`,
        });
        return { success: true, clientId };
      }),

    update: adminParalegalProcedure
      .input(z.object({
        id: z.number(),
        firstName: z.string().optional(),
        lastName: z.string().optional(),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        address: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        zipCode: z.string().optional(),
        stage: z.enum(["lead", "prospect", "active", "completed", "inactive"]).optional(),
        notes: z.string().optional(),
        assignedCroId: z.number().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const client = await getClientById(input.id);
        if (!client) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Client not found" });
        }
        const { id, assignedCroId, ...updates } = input;
        const clientUpdates: any = { ...updates };
        if (assignedCroId !== undefined) {
          clientUpdates.createdBy = assignedCroId;
        }
        await updateClient(id, clientUpdates);
        await createActivityLog({
          userId: ctx.user.id,
          clientId: id,
          action: "client_updated",
          description: `Client updated by admin: ${client.firstName} ${client.lastName}`,
        });
        return { success: true };
      }),

    delete: adminParalegalProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const client = await getClientById(input.id);
        if (!client) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Client not found" });
        }
        // If client had a portal user, deactivate it
        if (client.portalUserId) {
          await updateUser(client.portalUserId, { isActive: false });
        }
        await deleteClient(input.id);
        await createActivityLog({
          userId: ctx.user.id,
          clientId: input.id,
          action: "client_deleted",
          description: `Client deleted: ${client.firstName} ${client.lastName}`,
        });
        return { success: true };
      }),

    // Reset a client's portal password
    resetPassword: adminParalegalProcedure
      .input(z.object({
        clientId: z.number(),
        newPassword: z.string().min(6),
      }))
      .mutation(async ({ input, ctx }) => {
        const client = await getClientById(input.clientId);
        if (!client) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Client not found" });
        }
        if (!client.portalUserId) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Client does not have a portal account" });
        }
        const hashedPassword = await bcrypt.hash(input.newPassword, 10);
        await updateUser(client.portalUserId, { passwordHash: hashedPassword });
        await createActivityLog({
          userId: ctx.user.id,
          clientId: input.clientId,
          action: "client_password_reset",
          description: `Portal password reset for client: ${client.firstName} ${client.lastName}`,
        });
        return { success: true };
      }),

    // Get CRO users for the assignment dropdown
    croUsers: adminParalegalProcedure.query(async () => {
      return await getTeamMembers();
    }),

    // List CRO users with their client counts
    listCrosWithClientCounts: adminParalegalProcedure.query(async () => {
      const allUsers = await getTeamMembers();
      const croUsers = allUsers.filter((u) => u.role === "cro");
      const allClients = await getAllClientsWithCro();

      return croUsers.map((cro) => {
        const clientCount = allClients.filter((c: any) => c.createdBy === cro.id).length;
        return {
          id: cro.id,
          name: cro.name,
          email: cro.email,
          clientCount,
        };
      });
    }),

    // Get clients for a specific CRO
    listByCro: adminParalegalProcedure
      .input(z.object({ croId: z.number() }))
      .query(async ({ input }) => {
        return await getClientsByCreatedBy(input.croId);
      }),

    // Update client portal username (admin can update)
    updatePortalUsername: adminParalegalProcedure
      .input(z.object({
        clientId: z.number(),
        newUsername: z.string().email(),
      }))
      .mutation(async ({ input, ctx }) => {
        const client = await getClientById(input.clientId);
        if (!client) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Client not found" });
        }
        if (!client.portalUserId) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Client does not have a portal account" });
        }
        // Check if the new email is already taken
        const existing = await getUserByEmail(input.newUsername);
        if (existing && existing.id !== client.portalUserId) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "This email is already in use by another user" });
        }
        await updateUser(client.portalUserId, { email: input.newUsername });
        await createActivityLog({
          userId: ctx.user.id,
          clientId: input.clientId,
          action: "client_username_updated",
          description: `Portal username updated for client: ${client.firstName} ${client.lastName} to ${input.newUsername}`,
        });
        return { success: true };
      }),

    // Create portal account for an existing client who doesn't have one
    createPortalAccount: adminParalegalProcedure
      .input(z.object({
        clientId: z.number(),
        username: z.string().email(),
        password: z.string().min(6),
      }))
      .mutation(async ({ input, ctx }) => {
        const client = await getClientById(input.clientId);
        if (!client) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Client not found" });
        }
        if (client.portalUserId) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Client already has a portal account" });
        }

        // Check if email is already taken
        const existingUser = await getUserByEmail(input.username);
        if (existingUser) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "A user with this email already exists" });
        }

        const hashedPassword = await bcrypt.hash(input.password, 10);
        const openId = nanoid(16);
        const { upsertUser } = await import("./db");
        await upsertUser({
          openId,
          name: `${client.firstName} ${client.lastName}`,
          email: input.username,
          role: "client",
          passwordHash: hashedPassword,
          isActive: true,
          mustChangePassword: true,
        });
        const newUser = await getUserByEmail(input.username);
        if (!newUser) {
          throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to create user account" });
        }

        // Link portal user to client record
        await updateClient(input.clientId, {
          portalAccess: true,
          portalUserId: newUser.id,
        });

        await createActivityLog({
          userId: ctx.user.id,
          clientId: input.clientId,
          action: "client_portal_account_created",
          description: `Portal account created for client: ${client.firstName} ${client.lastName} (${input.username})`,
        });

        // Send credentials email to the client
        const clientName = `${client.firstName} ${client.lastName}`;
        sendClientCredentialsEmail(input.username, clientName, input.password).catch((err) => {
          console.error("[Email] Failed to send client credentials:", err);
        });

        // Send AOC signature required email if client hasn't signed the AOC yet
        const signedAOC = await getSignedAOCByClientId(input.clientId);
        if (!signedAOC) {
          sendAOCSignatureRequiredEmail(input.username, clientName).catch((err) => {
            console.error("[Email] Failed to send AOC signature required email:", err);
          });
        }

        return {
          success: true,
          portalUserId: newUser.id,
          credentials: {
            username: input.username,
            password: input.password,
            clientName: `${client.firstName} ${client.lastName}`,
          },
        };
      }),
  }),

  // Team members (for task assignment)
  teamMembers: router({
    list: teamProcedure.query(async () => {
      return await getTeamMembers();
    }),
  }),

  // Task management
  tasks: router({
    // Create task
    create: teamProcedure
      .input(z.object({
        caseId: z.number(),
        title: z.string().min(1),
        description: z.string().optional(),
        priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
        assignedTo: z.number().optional(),
        dueDate: z.date().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        // Verify case exists and user has access
        const caseData = await getCaseById(input.caseId);
        if (!caseData) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Case not found" });
        }


        const taskId = await createTask({
          ...input,
          createdBy: ctx.user.id,
          status: "pending",
        });

        // Log activity
        await createActivityLog({
          userId: ctx.user.id,
          caseId: input.caseId,
          taskId,
          action: "task_created",
          description: `Task created: ${input.title}`,
        });

        return { success: true, taskId };
      }),

    // List tasks for a case
    listByCase: teamProcedure
      .input(z.object({ caseId: z.number() }))
      .query(async ({ input, ctx }) => {
        const caseData = await getCaseById(input.caseId);
        if (!caseData) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Case not found" });
        }


        return await getTasksByCaseId(input.caseId);
      }),

    // Update task
    update: teamProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().optional(),
        description: z.string().optional(),
        status: z.enum(["pending", "in_progress", "completed", "cancelled"]).optional(),
        priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
        assignedTo: z.number().optional(),
        dueDate: z.date().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { id, ...updates } = input;
        const task = await getTaskById(id);
        
        if (!task) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Task not found" });
        }

        // Verify case access
        const caseData = await getCaseById(task.caseId);
        if (!caseData) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Case not found" });
        }


        // If marking as completed, set completedAt
        if (updates.status === "completed") {
          (updates as any).completedAt = new Date();
        }

        await updateTask(id, updates);

        // Log activity
        await createActivityLog({
          userId: ctx.user.id,
          caseId: task.caseId,
          taskId: id,
          action: "task_updated",
          description: `Task updated: ${task.title}`,
          metadata: JSON.stringify(updates),
        });

        return { success: true };
      }),

    // Delete task
    delete: teamProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const task = await getTaskById(input.id);
        
        if (!task) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Task not found" });
        }

        // Verify case access
        const caseData = await getCaseById(task.caseId);
        if (!caseData) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Case not found" });
        }


        await deleteTask(input.id);

        // Log activity
        await createActivityLog({
          userId: ctx.user.id,
          caseId: task.caseId,
          taskId: input.id,
          action: "task_deleted",
          description: `Task deleted: ${task.title}`,
        });

        return { success: true };
      }),
  }),

  // Document management
  documents: router({
    // Get presigned upload URL
    getUploadUrl: teamProcedure
      .input(z.object({
        caseId: z.number(),
        fileName: z.string(),
        fileSize: z.number(),
        mimeType: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        // Verify case access
        const caseData = await getCaseById(input.caseId);
        if (!caseData) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Case not found" });
        }


        // File size validation (50MB limit)
        if (input.fileSize > 50 * 1024 * 1024) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "File size exceeds 50MB limit" });
        }

        // Generate unique file key with random suffix to prevent enumeration
        const fileKey = `cases/${input.caseId}/documents/${nanoid()}-${input.fileName}`;

        // Import storage helper
        const { storagePut } = await import("./storage");
        
        // For presigned upload, we'll return the key and let client upload
        // Then client calls confirmUpload with the final URL
        return { fileKey };
      }),

    // Confirm upload and save metadata
    confirmUpload: teamProcedure
      .input(z.object({
        caseId: z.number(),
        fileName: z.string(),
        fileKey: z.string(),
        fileUrl: z.string(),
        fileSize: z.number(),
        mimeType: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        // Verify case access
        const caseData = await getCaseById(input.caseId);
        if (!caseData) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Case not found" });
        }


        const docId = await createDocument({
          caseId: input.caseId,
          fileName: input.fileName,
          fileKey: input.fileKey,
          fileUrl: input.fileUrl,
          fileSize: input.fileSize,
          mimeType: input.mimeType,
          uploadedBy: ctx.user.id,
        });

        // Log activity
        await createActivityLog({
          userId: ctx.user.id,
          caseId: input.caseId,
          action: "document_uploaded",
          description: `Document uploaded: ${input.fileName}`,
        });

        // Notify team
        notifyCaseChangeToTeam({
          caseId: input.caseId,
          triggeredByUserId: ctx.user.id,
          type: "document_uploaded",
          title: `Document Uploaded`,
          message: `${ctx.user.name || "A team member"} uploaded "${input.fileName}" to case #${input.caseId}`,
        }).catch(() => {});

        return { success: true, docId };
      }),

    // List all documents (admin/partner)
    listAll: teamProcedure
      .query(async ({ ctx }) => {
        const docs = await getAllDocuments();
        
        return docs;
      }),

    // List documents for a case
    listByCase: teamProcedure
      .input(z.object({ caseId: z.number() }))
      .query(async ({ input, ctx }) => {
        const caseData = await getCaseById(input.caseId);
        if (!caseData) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Case not found" });
        }


        return await getEnrichedCaseDocuments(input.caseId);
      }),

    // Get document by ID
    getById: teamProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input, ctx }) => {
        const doc = await getDocumentById(input.id);
        if (!doc) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Document not found" });
        }
        
        return doc;
      }),

    // Delete document
    delete: teamProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const doc = await getDocumentById(input.id);
        if (!doc) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Document not found" });
        }
        await deleteDocumentWithLog(input.id, ctx.user.id);
        return { success: true };
      }),

    // Request signature on a document
    requestSignature: teamProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const doc = await getDocumentById(input.id);
        if (!doc) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Document not found" });
        }
        await updateDocument(input.id, { requiresSignature: true });
        await createActivityLog({
          userId: ctx.user.id,
          caseId: doc.caseId ?? undefined,
          action: "signature_requested",
          description: `Signature requested for document: ${doc.fileName}`,
        });
        return { success: true };
      }),

    // Submit signature for a document
    submitSignature: teamProcedure
      .input(z.object({
        id: z.number(),
        signatureDataUrl: z.string(), // base64 data URL from canvas
        signedByName: z.string(),
        positionX: z.number().min(0).max(100).optional(), // X position as percentage
        positionY: z.number().min(0).max(100).optional(), // Y position as percentage
        scale: z.number().min(0.1).max(5).optional(), // Scale factor
        pageNumber: z.number().int().min(1).optional(), // Page number to sign (1-indexed)
      }))
      .mutation(async ({ input, ctx }) => {
        const doc = await getDocumentByIdRaw(input.id);
        if (!doc) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Document not found" });
        }
        if (!doc.requiresSignature) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "This document does not require a signature" });
        }
        if (doc.signedAt) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "This document has already been signed" });
        }

        // Convert base64 data URL to buffer and upload to S3
        const base64Data = input.signatureDataUrl.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(base64Data, "base64");
        const sigKey = `signatures/${doc.caseId || "general"}/${nanoid()}-signature.png`;
        const { storagePut } = await import("./storage");
        const { url: signatureUrl } = await storagePut(sigKey, buffer, "image/png");

        // Embed signature into the document file
        const { embedSignatureInPDF, embedSignatureInImage, detectPDFPageCount } = await import("./signatureEmbedder");
        const isPDF = doc.fileName.toLowerCase().endsWith('.pdf');
        const isImage = /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(doc.fileName);

        // For AOC documents, use precise signature line position
        const isAOCDocument = doc.fileName.startsWith('AOC-') && doc.category === 'legal_doc';
        let sigPosX = input.positionX ?? 50;
        let sigPosY = input.positionY ?? 75;
        let sigScale = input.scale ?? 1;
        let sigPage = input.pageNumber;

        if (isAOCDocument && !input.positionX && !input.positionY) {
          // Use AOC-specific signature line coordinates
          // Generate fresh metadata to get exact position
          try {
            const { generateAOCDocumentWithMeta } = await import("./services/aocGenerator");
            // We need client info - get it from the case
            const caseData = doc.caseId ? await getCaseById(doc.caseId) : null;
            let clientInfo: any = {};
            if (caseData?.clientId) {
              clientInfo = await getClientById(caseData.clientId);
            }
            const meta = await generateAOCDocumentWithMeta({
              firstName: clientInfo?.firstName || "Client",
              lastName: clientInfo?.lastName || "",
              address: clientInfo?.address,
              city: clientInfo?.city,
              state: clientInfo?.state,
              zipCode: clientInfo?.zipCode,
            });
            sigPosX = 28;
            sigPosY = meta.signatureLineYPercent - 5;
            sigPage = meta.signaturePageNumber;
            console.log(`[TeamSignature] AOC signature position: x=${sigPosX}, y=${sigPosY.toFixed(1)}, page=${sigPage}`);
          } catch (metaErr) {
            console.warn("[TeamSignature] Could not get AOC metadata, using defaults", metaErr);
            sigPosX = 28;
            sigPosY = 76;
          }
        }

        let signedDocumentUrl = doc.fileUrl; // Default to original if embedding fails
        let signedFileKey = doc.fileKey; // Track new file key for signed document

        try {
          if (isPDF) {
            // Embed signature into PDF
            const signedPdfBuffer = await embedSignatureInPDF(
              doc.fileUrl,
              signatureUrl,
              sigPosX,
              sigPosY,
              sigScale,
              sigPage
            );
            // Upload signed PDF to S3
            signedFileKey = `signed-documents/${doc.caseId || "general"}/${nanoid()}-signed.pdf`;
            const { url: signedPdfUrl } = await storagePut(signedFileKey, signedPdfBuffer, "application/pdf");
            signedDocumentUrl = signedPdfUrl;
          } else if (isImage) {
            // Embed signature into image
            const signedImageBuffer = await embedSignatureInImage(
              doc.fileUrl,
              signatureUrl,
              sigPosX,
              sigPosY,
              sigScale
            );
            // Determine image MIME type
            const ext = doc.fileName.split('.').pop()?.toLowerCase() || 'png';
            const mimeType = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 'image/png';
            // Upload signed image to S3
            signedFileKey = `signed-documents/${doc.caseId || "general"}/${nanoid()}-signed.${ext}`;
            const { url: signedImageUrl } = await storagePut(signedFileKey, signedImageBuffer, mimeType);
            signedDocumentUrl = signedImageUrl;
          }
        } catch (error) {
          console.error("Error embedding signature:", error);
          // Continue with metadata-only signature if embedding fails
        }

        await updateDocument(input.id, {
          signedBy: input.signedByName,
          signedAt: new Date(),
          signatureUrl,
          signaturePositionX: input.positionX?.toString() ?? "50",
          signaturePositionY: input.positionY?.toString() ?? "80",
          signatureScale: input.scale?.toString() ?? "1",
          fileUrl: signedDocumentUrl, // Update with signed document URL
          fileKey: signedFileKey, // Update fileKey so proxy endpoint serves signed version
        });

        await createActivityLog({
          userId: ctx.user.id,
          caseId: doc.caseId ?? undefined,
          action: "document_signed",
          description: `Document signed by ${input.signedByName}: ${doc.fileName}`,
        });

        return { success: true, signatureUrl };
      }),

    // Get page count for PDF documents
    getPageCount: teamProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const doc = await getDocumentByIdRaw(input.id);
        if (!doc) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Document not found" });
        }
        const isPDF = doc.fileName.toLowerCase().endsWith('.pdf');
        if (!isPDF) {
          return { pageCount: 1 }; // Non-PDF documents are considered single-page
        }
        const { detectPDFPageCount } = await import("./signatureEmbedder");
        const pageCount = await detectPDFPageCount(doc.fileUrl);
        return { pageCount };
      }),

    // Remove signature requirement from a document
    removeSignatureRequirement: teamProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const doc = await getDocumentById(input.id);
        if (!doc) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Document not found" });
        }
        await updateDocument(input.id, {
          requiresSignature: false,
          signedBy: null,
          signedAt: null,
          signatureUrl: null,
        });
        await createActivityLog({
          userId: ctx.user.id,
          caseId: doc.caseId ?? undefined,
          action: "signature_removed",
          description: `Signature requirement removed for document: ${doc.fileName}`,
        });
        return { success: true };
      }),
  }),

  password: passwordRouter,

  invites: invitesRouter,

  activity: activityRouter,

  externalLinks: externalLinksRouter,

  signatureTemplates: signatureTemplatesRouter,

  users: usersRouter,
  notifications: notificationsRouter,

  // =============================================
  // CRO Portal Routes
  // =============================================
  cro: router({
    // CRO Dashboard stats
    dashboardStats: croProcedure.query(async ({ ctx }) => {
      const [clientsList, casesList, inquiryCounts] = await Promise.all([
        getClientsByCreatedBy(ctx.user.id),
        getCasesByAssignedTo(ctx.user.id),
        getIntakeInquiryCountsByCro(ctx.user.id),
      ]);
      const activeCases = casesList.filter(c => !["closed", "settled", "settlement_paid_out", "rejected"].includes(c.status));
      return {
        totalClients: clientsList.length,
        activeCases: activeCases.length,
        pendingInquiries: inquiryCounts.pending,
        acceptedInquiries: inquiryCounts.accepted,
        rejectedInquiries: inquiryCounts.rejected,
      };
    }),

    // CRO client management
    myClients: croProcedure.query(async ({ ctx }) => {
      return await getClientsByCreatedBy(ctx.user.id);
    }),

    createClient: croProcedure
      .input(z.object({
        firstName: z.string().min(1),
        lastName: z.string().min(1),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        address: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        zipCode: z.string().optional(),
        dateOfBirth: z.date().optional(),
        notes: z.string().optional(),
        username: z.string().email().optional(),
        password: z.string().min(6).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const { username, password, ...clientData } = input;

        let portalUserId: number | undefined;

        // If username and password provided, create a portal user account
        if (username && password) {
          // Check if email already taken
          const existingUser = await getUserByEmail(username);
          if (existingUser) {
            throw new TRPCError({ code: "BAD_REQUEST", message: "A user with this email already exists" });
          }

          const hashedPassword = await bcrypt.hash(password, 10);
          const openId = nanoid(16);
          const { upsertUser } = await import("./db");
          await upsertUser({
            openId,
            name: `${input.firstName} ${input.lastName}`,
            email: username,
            role: "client",
            passwordHash: hashedPassword,
            isActive: true,
          });
          const newUser = await getUserByEmail(username);
          portalUserId = newUser?.id;
        }

        const clientId = await createClient({
          ...clientData,
          partnerId: ctx.user.partnerId || 1,
          createdBy: ctx.user.id,
          stage: "lead",
          portalAccess: !!portalUserId,
          portalUserId: portalUserId ?? null,
        });
        await createActivityLog({
          userId: ctx.user.id,
          clientId,
          action: "client_created",
          description: `Client created: ${input.firstName} ${input.lastName}${portalUserId ? " (with portal account)" : ""}`,
        });
        return { success: true, clientId };
      }),

    updateClient: croProcedure
      .input(z.object({
        id: z.number(),
        firstName: z.string().optional(),
        lastName: z.string().optional(),
        email: z.string().email().optional(),
        phone: z.string().optional(),
        address: z.string().optional(),
        city: z.string().optional(),
        state: z.string().optional(),
        zipCode: z.string().optional(),
        dateOfBirth: z.date().optional(),
        notes: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        // Verify ownership
        const client = await getClientById(input.id);
        if (!client || client.createdBy !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "You can only edit your own clients" });
        }
        const { id, ...updates } = input;
        await updateClient(id, updates);
        await createActivityLog({
          userId: ctx.user.id,
          clientId: id,
          action: "client_updated",
          description: `Client updated: ${client.firstName} ${client.lastName}`,
        });
        return { success: true };
      }),

    deleteClient: croProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const client = await getClientById(input.id);
        if (!client || client.createdBy !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "You can only delete your own clients" });
        }
        // Deactivate portal user if exists
        if (client.portalUserId) {
          await updateUser(client.portalUserId, { isActive: false });
        }
        await deleteClient(input.id);
        await createActivityLog({
          userId: ctx.user.id,
          clientId: input.id,
          action: "client_deleted",
          description: `Client deleted: ${client.firstName} ${client.lastName}`,
        });
        return { success: true };
      }),

    resetClientPassword: croProcedure
      .input(z.object({
        clientId: z.number(),
        newPassword: z.string().min(6),
      }))
      .mutation(async ({ input, ctx }) => {
        const client = await getClientById(input.clientId);
        if (!client || client.createdBy !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "You can only manage your own clients" });
        }
        if (!client.portalUserId) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Client does not have a portal account" });
        }
        const hashedPassword = await bcrypt.hash(input.newPassword, 10);
        await updateUser(client.portalUserId, { passwordHash: hashedPassword });
        await createActivityLog({
          userId: ctx.user.id,
          clientId: input.clientId,
          action: "client_password_reset",
          description: `CRO reset portal password for client: ${client.firstName} ${client.lastName}`,
        });
        return { success: true };
      }),

    // Update client portal username
    updateClientUsername: croProcedure
      .input(z.object({
        clientId: z.number(),
        newUsername: z.string().email(),
      }))
      .mutation(async ({ input, ctx }) => {
        const client = await getClientById(input.clientId);
        if (!client || client.createdBy !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "You can only manage your own clients" });
        }
        if (!client.portalUserId) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Client does not have a portal account" });
        }
        // Check if the new email is already taken
        const existing = await getUserByEmail(input.newUsername);
        if (existing && existing.id !== client.portalUserId) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "This email is already in use by another user" });
        }
        await updateUser(client.portalUserId, { email: input.newUsername });
        await createActivityLog({
          userId: ctx.user.id,
          clientId: input.clientId,
          action: "client_username_updated",
          description: `CRO updated portal username for client: ${client.firstName} ${client.lastName} to ${input.newUsername}`,
        });
        return { success: true };
      }),

    // Submit intake inquiry
    submitIntakeInquiry: croProcedure
      .input(z.object({
        clientId: z.number().optional(), // Optional: select existing client
        clientFirstName: z.string().min(1),
        clientLastName: z.string().min(1),
        clientDateOfBirth: z.date().optional(),
        clientEmail: z.string().email(),
        clientFullAddress: z.string().min(1),
        clientAddress: z.string().optional(),
        clientCity: z.string().optional(),
        clientState: z.string().optional(),
        clientZipCode: z.string().optional(),
        supportingDocuments: z.array(z.string()).optional(), // S3 URLs
        annualCreditReportScreenshot: z.string().optional(), // S3 URL for proof of upload
      }))
      .mutation(async ({ input, ctx }) => {
        const inquiryId = await createIntakeInquiry({
          croUserId: ctx.user.id,
          croName: ctx.user.name || "Unknown CRO",
          clientFirstName: input.clientFirstName,
          clientLastName: input.clientLastName,
          clientDateOfBirth: input.clientDateOfBirth,
          clientEmail: input.clientEmail,
          clientFullAddress: input.clientFullAddress,
          clientAddress: input.clientAddress || null,
          clientCity: input.clientCity || null,
          clientState: input.clientState || null,
          clientZipCode: input.clientZipCode || null,
          supportingDocuments: input.supportingDocuments ? JSON.stringify(input.supportingDocuments) : null,
          annualCreditReportScreenshot: input.annualCreditReportScreenshot || null,
          status: "pending",
        });
        await createActivityLog({
          userId: ctx.user.id,
          action: "intake_inquiry_submitted",
          description: `Intake inquiry submitted for ${input.clientFirstName} ${input.clientLastName}`,
        });
        return { success: true, inquiryId };
      }),

    // Get CRO's own inquiries
    myInquiries: croProcedure.query(async ({ ctx }) => {
      return await getIntakeInquiriesByCro(ctx.user.id);
    }),

    // Get CRO's assigned cases
    myCases: croProcedure.query(async ({ ctx }) => {
      return await getCasesByAssignedTo(ctx.user.id);
    }),

    // Get a single case (own only)
    getCaseById: croProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input, ctx }) => {
        const caseData = await getCaseById(input.id);
        if (!caseData) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Case not found" });
        }
        if (caseData.assignedTo !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "You can only view your own assigned cases" });
        }
        return caseData;
      }),

    // Add comment to own case
    addComment: croProcedure
      .input(z.object({
        caseId: z.number(),
        comment: z.string().min(1),
      }))
      .mutation(async ({ input, ctx }) => {
        const caseData = await getCaseById(input.caseId);
        if (!caseData) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Case not found" });
        }
        if (caseData.assignedTo !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "You can only comment on your own assigned cases" });
        }
        const commentId = await createCaseComment({
          caseId: input.caseId,
          userId: ctx.user.id,
          userName: ctx.user.name || "CRO",
          userRole: "cro",
          comment: input.comment,
        });
        await createActivityLog({
          userId: ctx.user.id,
          caseId: input.caseId,
          action: "comment_added",
          description: `CRO comment added to case: ${caseData.title}`,
        });

        // Notify team
        notifyCaseChangeToTeam({
          caseId: input.caseId,
          triggeredByUserId: ctx.user.id,
          type: "comment_added",
          title: `New CRO Comment on Case: ${caseData.title}`,
          message: `${ctx.user.name || "CRO"} commented on case #${input.caseId}: "${input.comment.substring(0, 100)}${input.comment.length > 100 ? "..." : ""}"`,
        }).catch(() => {});

        return { success: true, commentId };
      }),

    // Upload document to own case
    uploadDocument: croProcedure
      .input(z.object({
        caseId: z.number(),
        fileName: z.string(),
        fileKey: z.string(),
        fileUrl: z.string(),
        fileSize: z.number(),
        mimeType: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        const caseData = await getCaseById(input.caseId);
        if (!caseData) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Case not found" });
        }
        if (caseData.assignedTo !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "You can only upload to your own assigned cases" });
        }
        const docId = await createDocument({
          caseId: input.caseId,
          fileName: input.fileName,
          fileKey: input.fileKey,
          fileUrl: input.fileUrl,
          fileSize: input.fileSize,
          mimeType: input.mimeType,
          uploadedBy: ctx.user.id,
        });
        await createActivityLog({
          userId: ctx.user.id,
          caseId: input.caseId,
          action: "document_uploaded",
          description: `CRO uploaded document: ${input.fileName}`,
        });

        // Notify team
        notifyCaseChangeToTeam({
          caseId: input.caseId,
          triggeredByUserId: ctx.user.id,
          type: "document_uploaded",
          title: `CRO Uploaded Document`,
          message: `${ctx.user.name || "CRO"} uploaded "${input.fileName}" to case #${input.caseId}`,
        }).catch(() => {});

        return { success: true, docId };
      }),

    // Get case documents (own case only)
    getCaseDocuments: croProcedure
      .input(z.object({ caseId: z.number() }))
      .query(async ({ input, ctx }) => {
        const caseData = await getCaseById(input.caseId);
        if (!caseData) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Case not found" });
        }
        if (caseData.assignedTo !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "You can only view documents on your own assigned cases" });
        }
        return await getEnrichedCaseDocuments(input.caseId);
      }),

    // Get case comments (own case only)
    getCaseComments: croProcedure
      .input(z.object({ caseId: z.number() }))
      .query(async ({ input, ctx }) => {
        const caseData = await getCaseById(input.caseId);
        if (!caseData) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Case not found" });
        }
        if (caseData.assignedTo !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "You can only view comments on your own assigned cases" });
        }
        return await getCommentsByCaseId(input.caseId);
      }),

    // Get case timeline (own case only)
    getCaseTimeline: croProcedure
      .input(z.object({ caseId: z.number() }))
      .query(async ({ input, ctx }) => {
        const caseData = await getCaseById(input.caseId);
        if (!caseData) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Case not found" });
        }
        if (caseData.assignedTo !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "You can only view timeline on your own assigned cases" });
        }
        return await getEnrichedTimelineByCaseId(input.caseId);
      }),

    // Get upload URL for case document
    getUploadUrl: croProcedure
      .input(z.object({
        caseId: z.number(),
        fileName: z.string(),
        fileSize: z.number(),
        mimeType: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        const caseData = await getCaseById(input.caseId);
        if (!caseData) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Case not found" });
        }
        if (caseData.assignedTo !== ctx.user.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "You can only upload to your own assigned cases" });
        }
        if (input.fileSize > 50 * 1024 * 1024) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "File size exceeds 50MB limit" });
        }
        const fileKey = `cases/${input.caseId}/documents/${nanoid()}-${input.fileName}`;
        return { fileKey };
      }),
  }),

  // =============================================
  // Intake Inquiry Management (Paralegal/Admin)
  // =============================================
  intakeInquiries: router({
    // List all intake inquiries
    list: adminParalegalProcedure.query(async () => {
      return await getAllIntakeInquiries();
    }),

    // Get single intake inquiry
    getById: adminParalegalProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const inquiry = await getIntakeInquiryById(input.id);
        if (!inquiry) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Intake inquiry not found" });
        }
        return inquiry;
      }),

    // Accept intake inquiry
    accept: adminParalegalProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const inquiry = await getIntakeInquiryById(input.id);
        if (!inquiry) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Intake inquiry not found" });
        }
        if (inquiry.status !== "pending") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Only pending inquiries can be accepted" });
        }
        await updateIntakeInquiry(input.id, {
          status: "accepted",
          reviewedBy: ctx.user.id,
          reviewedAt: new Date(),
        });
        await createActivityLog({
          userId: ctx.user.id,
          action: "intake_inquiry_accepted",
          description: `Intake inquiry #${input.id} accepted for ${inquiry.clientFirstName} ${inquiry.clientLastName}`,
        });

        // Send notification to CRO
        const croUser = await getUserById(inquiry.croUserId);
        if (croUser?.email) {
          sendIntakeCroAcceptedNotification(
            croUser.email,
            inquiry.croName,
            `${inquiry.clientFirstName} ${inquiry.clientLastName}`
          ).catch(() => {});
        }

        return { success: true };
      }),

    // Reject intake inquiry
    reject: adminParalegalProcedure
      .input(z.object({
        id: z.number(),
        rejectionReason: z.string().min(1),
      }))
      .mutation(async ({ input, ctx }) => {
        const inquiry = await getIntakeInquiryById(input.id);
        if (!inquiry) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Intake inquiry not found" });
        }
        if (inquiry.status !== "pending") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Only pending inquiries can be rejected" });
        }
        await updateIntakeInquiry(input.id, {
          status: "rejected",
          reviewedBy: ctx.user.id,
          reviewedAt: new Date(),
          rejectionReason: input.rejectionReason,
        });
        await createActivityLog({
          userId: ctx.user.id,
          action: "intake_inquiry_rejected",
          description: `Intake inquiry #${input.id} rejected for ${inquiry.clientFirstName} ${inquiry.clientLastName}: ${input.rejectionReason}`,
        });
        return { success: true };
      }),

    // Notify client (button-triggered)
    notifyClient: adminParalegalProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const inquiry = await getIntakeInquiryById(input.id);
        if (!inquiry) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Intake inquiry not found" });
        }
        if (inquiry.status !== "accepted") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Can only notify client for accepted inquiries" });
        }
        if (inquiry.clientNotificationSent) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Client has already been notified" });
        }

        await sendIntakeClientNotification(
          inquiry.clientEmail,
          inquiry.clientFirstName,
          inquiry.croName
        );

        await updateIntakeInquiry(input.id, {
          clientNotificationSent: true,
          clientNotificationSentAt: new Date(),
        });

        await createActivityLog({
          userId: ctx.user.id,
          action: "intake_client_notified",
          description: `Client notified for intake inquiry #${input.id}: ${inquiry.clientFirstName} ${inquiry.clientLastName}`,
        });

        return { success: true };
      }),

    // Create case from accepted inquiry (auto-populates fields)
    createCaseFromInquiry: adminParalegalProcedure
      .input(z.object({
        id: z.number(),
        title: z.string().min(1),
        description: z.string().optional(),
        caseType: z.string().optional(),
        priority: z.enum(["low", "medium", "high", "urgent"]).default("medium"),
        estimatedValue: z.number().optional(),
        dueDate: z.date().optional(),
        googleDriveLink: z.string().optional(),
        assignedCroId: z.number().optional(),
        // Client detail overrides
        clientFirstName: z.string().min(1).optional(),
        clientLastName: z.string().min(1).optional(),
        clientEmail: z.string().email().optional(),
        clientPhone: z.string().optional(),
        clientDateOfBirth: z.date().optional(),
        clientAddress: z.string().optional(),
        clientCity: z.string().optional(),
        clientState: z.string().optional(),
        clientZipCode: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const inquiry = await getIntakeInquiryById(input.id);
        if (!inquiry) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Intake inquiry not found" });
        }
        if (inquiry.status !== "accepted") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Can only create case from accepted inquiries" });
        }
        if (inquiry.caseId) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "A case has already been created for this inquiry" });
        }

        // Resolve client details: use input overrides, fall back to inquiry data
        const resolvedFirstName = input.clientFirstName || inquiry.clientFirstName;
        const resolvedLastName = input.clientLastName || inquiry.clientLastName;
        const resolvedEmail = input.clientEmail || inquiry.clientEmail;
        const resolvedPhone = input.clientPhone || undefined;
        const resolvedDob = input.clientDateOfBirth || inquiry.clientDateOfBirth || undefined;
        const resolvedAddress = input.clientAddress || inquiry.clientAddress || inquiry.clientFullAddress;
        const resolvedCity = input.clientCity || inquiry.clientCity || undefined;
        const resolvedState = input.clientState || inquiry.clientState || undefined;
        const resolvedZipCode = input.clientZipCode || inquiry.clientZipCode || undefined;
        const resolvedCroId = input.assignedCroId || inquiry.croUserId;

        // Auto-create client if not exists
        let clientId: number | undefined;
        const existingClients = await getClientsByCreatedBy(inquiry.croUserId);
        const existingClient = existingClients.find(
          c => c.email === resolvedEmail &&
               c.firstName === resolvedFirstName &&
               c.lastName === resolvedLastName
        );
        if (existingClient) {
          clientId = existingClient.id;
          // Update existing client with any new/overridden details
          await updateClient(existingClient.id, {
            phone: resolvedPhone || existingClient.phone,
            dateOfBirth: resolvedDob || existingClient.dateOfBirth,
            address: resolvedAddress || existingClient.address,
            city: resolvedCity || existingClient.city || undefined,
            state: resolvedState || existingClient.state || undefined,
            zipCode: resolvedZipCode || existingClient.zipCode || undefined,
          });
        } else {
          clientId = await createClient({
            firstName: resolvedFirstName,
            lastName: resolvedLastName,
            email: resolvedEmail,
            phone: resolvedPhone,
            address: resolvedAddress,
            city: resolvedCity,
            state: resolvedState,
            zipCode: resolvedZipCode,
            dateOfBirth: resolvedDob,
            partnerId: 1,
            createdBy: inquiry.croUserId,
            stage: "active",
          });
        }

        // Portal account creation is now manual via the "Create Portal Account" button in CaseDetail
        // This allows admins to control when accounts are created and manually share credentials

        // Create the case with all management fields
        const caseId = await createCase({
          title: input.title,
          description: input.description,
          caseType: input.caseType,
          priority: input.priority,
          estimatedValue: input.estimatedValue?.toString(),
          dueDate: input.dueDate,
          googleDriveLink: input.googleDriveLink,
          clientId,
          assignedTo: resolvedCroId,
          assignedCroId: resolvedCroId,
          partnerId: 1,
          createdBy: ctx.user.id,
          status: "new",
        });

        // Link the case to the inquiry
        await updateIntakeInquiry(inquiry.id, { caseId });

        await createActivityLog({
          userId: ctx.user.id,
          caseId,
          action: "case_created_from_intake",
          description: `Case created from intake inquiry #${inquiry.id} for ${inquiry.clientFirstName} ${inquiry.clientLastName}`,
        });

        // AOC is now handled at dashboard level, not per case
        // Send AOC signature required email only if client has a portal account
        // and has NOT already signed the AOC (prevents duplicate emails on 2nd+ cases)
        if (clientId) {
          const clientForAOC = await getClientById(clientId);
          if (clientForAOC?.portalUserId && clientForAOC.email) {
            const signedAOC = await getSignedAOCByClientId(clientId);
            if (!signedAOC) {
              const clientName = `${clientForAOC.firstName} ${clientForAOC.lastName}`;
              sendAOCSignatureRequiredEmail(clientForAOC.email, clientName).catch((err) => {
                console.error("[Email] Failed to send AOC signature required email:", err);
              });
            }
          }
        }

        return { success: true, caseId, clientId };
      }),
  }),

  // =============================================
  // CRO Management (Admin/Paralegal)
  // =============================================
  croManagement: router({
    // List all CROs with their statistics
    list: adminParalegalProcedure.query(async () => {
      return await getCroStats();
    }),

    // Get a single CRO's details with their clients
    getById: adminParalegalProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input }) => {
        const user = await getUserById(input.id);
        if (!user || user.role !== "cro") {
          throw new TRPCError({ code: "NOT_FOUND", message: "CRO not found" });
        }
        const clientsList = await getClientsByCreatedBy(input.id);
        const casesList = await getCasesByAssignedTo(input.id);
        return { ...user, clients: clientsList, cases: casesList };
      }),

    // Toggle CRO active status
    toggleActive: adminProcedure
      .input(z.object({ id: z.number(), isActive: z.boolean() }))
      .mutation(async ({ input, ctx }) => {
        const user = await getUserById(input.id);
        if (!user || user.role !== "cro") {
          throw new TRPCError({ code: "NOT_FOUND", message: "CRO not found" });
        }
        await updateUser(input.id, { isActive: input.isActive });
        await createActivityLog({
          userId: ctx.user.id,
          action: input.isActive ? "cro_activated" : "cro_deactivated",
          description: `CRO ${input.isActive ? "activated" : "deactivated"}: ${user.name} (${user.email})`,
        });
        return { success: true };
      }),

    // Reset CRO password
    resetPassword: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const user = await getUserById(input.id);
        if (!user || user.role !== "cro") {
          throw new TRPCError({ code: "NOT_FOUND", message: "CRO not found" });
        }
        const tempPassword = nanoid(12);
        const passwordHash = await bcrypt.hash(tempPassword, 10);
        await updateUser(input.id, { passwordHash });
        await createActivityLog({
          userId: ctx.user.id,
          action: "cro_password_reset",
          description: `Password reset for CRO: ${user.name} (${user.email})`,
        });
        // Send credentials via email
        if (user.email) {
          try {
            await sendCroCredentialsEmail(user.email, user.name || "CRO", tempPassword);
          } catch (e) {
            console.error("[CRO Management] Failed to send reset email:", e);
          }
        }
        return { success: true, tempPassword };
      }),
  }),

  // =============================================
  // CRO Signup & Application Management
  // =============================================
  croApplications: router({
    // Public: Submit CRO signup application
    submit: publicProcedure
      .input(z.object({
        name: z.string().min(1),
        email: z.string().email(),
        phone: z.string().optional(),
        companyName: z.string().optional(),
        agreementAccepted: z.boolean(),
      }))
      .mutation(async ({ input }) => {
        if (!input.agreementAccepted) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "You must accept the CRO agreement" });
        }
        // Check for existing application
        const existing = await getCroApplicationByEmail(input.email);
        if (existing) {
          throw new TRPCError({ code: "CONFLICT", message: "An application with this email already exists" });
        }
        // Check for existing user
        const existingUser = await getUserByEmail(input.email);
        if (existingUser) {
          throw new TRPCError({ code: "CONFLICT", message: "A user with this email already exists" });
        }
        const appId = await createCroApplication({
          name: input.name,
          email: input.email,
          phone: input.phone,
          companyName: input.companyName,
          agreementAccepted: true,
          agreementAcceptedAt: new Date(),
          status: "pending",
        });

        await createActivityLog({
          action: "cro_application_submitted",
          description: `CRO application submitted: ${input.name} (${input.email})`,
        });

        // Notify admin
        notifyOwner({
          title: "New CRO Application Pending Approval",
          content: `Name: ${input.name}\nEmail: ${input.email}\nCompany: ${input.companyName || "N/A"}\nPhone: ${input.phone || "N/A"}`,
        }).catch(() => {});

        return { success: true, applicationId: appId };
      }),

    // Admin: List all CRO applications
    list: adminProcedure.query(async () => {
      return await getAllCroApplications();
    }),

    // Admin: Get pending CRO applications
    pending: adminProcedure.query(async () => {
      return await getPendingCroApplications();
    }),

    // Admin: Approve CRO application and create user account
    approve: adminProcedure
      .input(z.object({ id: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const app = await getCroApplicationById(input.id);
        if (!app) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Application not found" });
        }
        if (app.status !== "pending") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Only pending applications can be approved" });
        }

        // Generate temporary password
        const tempPassword = nanoid(12);
        const passwordHash = await bcrypt.hash(tempPassword, 10);

        // Create user account
        const { upsertUser } = await import("./db");
        const openId = nanoid(16);
        await upsertUser({
          openId,
          name: app.name,
          email: app.email,
          role: "cro",
          passwordHash,
          isActive: true,
          mustChangePassword: true,
        });

        // Get the created user
        const { getUserByEmail: getUser } = await import("./db");
        const newUser = await getUser(app.email);

        // Update application
        await updateCroApplication(input.id, {
          status: "approved",
          reviewedBy: ctx.user.id,
          reviewedAt: new Date(),
          userId: newUser?.id,
        });

        await createActivityLog({
          userId: ctx.user.id,
          action: "cro_application_approved",
          description: `CRO application approved: ${app.name} (${app.email})`,
        });

        // Send credentials email to CRO
        await sendCroCredentialsEmail(app.email, app.name, tempPassword);

        return { success: true, userId: newUser?.id, tempPassword };
      }),

    // Admin: Reject CRO application
    reject: adminProcedure
      .input(z.object({
        id: z.number(),
        rejectionReason: z.string().min(1),
      }))
      .mutation(async ({ input, ctx }) => {
        const app = await getCroApplicationById(input.id);
        if (!app) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Application not found" });
        }
        if (app.status !== "pending") {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Only pending applications can be rejected" });
        }
        await updateCroApplication(input.id, {
          status: "rejected",
          reviewedBy: ctx.user.id,
          reviewedAt: new Date(),
          rejectionReason: input.rejectionReason,
        });
        await createActivityLog({
          userId: ctx.user.id,
          action: "cro_application_rejected",
          description: `CRO application rejected: ${app.name} (${app.email}). Reason: ${input.rejectionReason}`,
        });
        return { success: true };
      }),
  }),

  // =============================================
  // Client Portal Routes
  // =============================================
  clientPortal: router({
    // Get the client's linked record and case info
    myProfile: clientProcedure.query(async ({ ctx }) => {
      const clientRecord = await getClientByPortalUserId(ctx.user.id);
      if (!clientRecord) {
        throw new TRPCError({ code: "NOT_FOUND", message: "No client record linked to your account" });
      }
      return clientRecord;
    }),

    // Get the client's case(s)
    myCases: clientProcedure.query(async ({ ctx }) => {
      const clientRecord = await getClientByPortalUserId(ctx.user.id);
      if (!clientRecord) {
        return [];
      }
      return await getCasesByClientId(clientRecord.id);
    }),

    // Get a single case detail (own only)
    getCaseById: clientProcedure
      .input(z.object({ id: z.number() }))
      .query(async ({ input, ctx }) => {
        const clientRecord = await getClientByPortalUserId(ctx.user.id);
        if (!clientRecord) {
          throw new TRPCError({ code: "FORBIDDEN", message: "No client record linked to your account" });
        }
        const caseData = await getCaseById(input.id);
        if (!caseData || caseData.clientId !== clientRecord.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "You can only view your own cases" });
        }
        return caseData;
      }),

    // Get documents for own case
    getCaseDocuments: clientProcedure
      .input(z.object({ caseId: z.number() }))
      .query(async ({ input, ctx }) => {
        const clientRecord = await getClientByPortalUserId(ctx.user.id);
        if (!clientRecord) {
          throw new TRPCError({ code: "FORBIDDEN", message: "No client record linked to your account" });
        }
        const caseData = await getCaseById(input.caseId);
        if (!caseData || caseData.clientId !== clientRecord.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "You can only view documents for your own cases" });
        }
        return await getEnrichedCaseDocuments(input.caseId);
      }),

    // Upload document to own case
    uploadDocument: clientProcedure
      .input(z.object({
        caseId: z.number(),
        fileName: z.string(),
        fileKey: z.string(),
        fileUrl: z.string(),
        fileSize: z.number(),
        mimeType: z.string(),
        category: z.string().optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const clientRecord = await getClientByPortalUserId(ctx.user.id);
        if (!clientRecord) {
          throw new TRPCError({ code: "FORBIDDEN", message: "No client record linked to your account" });
        }
        const caseData = await getCaseById(input.caseId);
        if (!caseData || caseData.clientId !== clientRecord.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "You can only upload to your own cases" });
        }
        const docId = await createDocument({
          caseId: input.caseId,
          clientId: clientRecord.id,
          fileName: input.fileName,
          fileKey: input.fileKey,
          fileUrl: input.fileUrl,
          fileSize: input.fileSize,
          mimeType: input.mimeType,
          category: input.category,
          uploadedBy: ctx.user.id,
        });
        await createActivityLog({
          userId: ctx.user.id,
          caseId: input.caseId,
          clientId: clientRecord.id,
          action: "document_uploaded",
          description: `Client uploaded document: ${input.fileName}`,
        });

        // Notify team about client document upload
        notifyCaseChangeToTeam({
          caseId: input.caseId,
          triggeredByUserId: ctx.user.id,
          type: "client_document_uploaded",
          title: `Client Uploaded Document`,
          message: `${ctx.user.name || "Client"} uploaded "${input.fileName}" to case #${input.caseId}`,
        }).catch(() => {});

        return { success: true, docId };
      }),

    // Get upload key for document
    getUploadUrl: clientProcedure
      .input(z.object({
        caseId: z.number(),
        fileName: z.string(),
        fileSize: z.number(),
        mimeType: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        const clientRecord = await getClientByPortalUserId(ctx.user.id);
        if (!clientRecord) {
          throw new TRPCError({ code: "FORBIDDEN", message: "No client record linked to your account" });
        }
        const caseData = await getCaseById(input.caseId);
        if (!caseData || caseData.clientId !== clientRecord.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "You can only upload to your own cases" });
        }
        if (input.fileSize > 50 * 1024 * 1024) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "File size exceeds 50MB limit" });
        }
        const fileKey = `cases/${input.caseId}/client-documents/${nanoid()}-${input.fileName}`;
        const { url: fileUrl } = await storageGet(fileKey);
        return { fileKey, fileUrl };
      }),

    // Generate AOC (Assignment of Claim for Damages) document with client details auto-populated
    generateAOC: clientProcedure
      .input(z.object({ caseId: z.number() }))
      .mutation(async ({ input, ctx }) => {
        const clientRecord = await getClientByPortalUserId(ctx.user.id);
        if (!clientRecord) {
          throw new TRPCError({ code: "FORBIDDEN", message: "No client record linked to your account" });
        }
        const caseData = await getCaseById(input.caseId);
        if (!caseData || caseData.clientId !== clientRecord.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "You can only generate documents for your own cases" });
        }

        // Delete existing AOC documents for this case to prevent duplicates
        const existingAOCDocs = await getCaseDocuments(input.caseId);
        const aocDocs = existingAOCDocs.filter(doc =>
          doc.category === "legal_doc" && doc.fileName.startsWith("AOC-")
        );
        for (const doc of aocDocs) {
          await deleteDocumentWithLog(doc.id, ctx.user.id);
        }

        // Generate the AOC PDF using exact template
        const { generateAOCDocument } = await import("./services/aocGenerator");
        const pdfBuffer = await generateAOCDocument({
          firstName: clientRecord.firstName,
          lastName: clientRecord.lastName,
          address: clientRecord.address,
          city: clientRecord.city,
          state: clientRecord.state,
          zipCode: clientRecord.zipCode,
        });

        // Upload PDF to storage
        const fileName = `AOC-${clientRecord.firstName}-${clientRecord.lastName}-Case-${caseData.id}.pdf`;
        const fileKey = `cases/${caseData.id}/documents/${nanoid()}-${fileName}`;
        const { url: fileUrl } = await storagePut(fileKey, pdfBuffer, "application/pdf");

        // Check if client has already signed an AOC for another case
        const previouslySignedAOC = await getSignedAOCByClientId(clientRecord.id);

        // Save document metadata — if previously signed, mark as already signed
        const docId = await createDocument({
          caseId: caseData.id,
          clientId: clientRecord.id,
          fileName,
          fileKey,
          fileUrl,
          fileSize: pdfBuffer.length,
          mimeType: "application/pdf",
          category: "legal_doc",
          requiresSignature: !previouslySignedAOC,
          uploadedBy: ctx.user.id,
        });

        // If client previously signed an AOC, auto-apply their signature to this new one
        if (previouslySignedAOC) {
          try {
            const { embedSignatureInPDF } = await import("./signatureEmbedder");
            const { generateAOCDocumentWithMeta } = await import("./services/aocGenerator");

            // Get precise signature position
            const meta = await generateAOCDocumentWithMeta({
              firstName: clientRecord.firstName,
              lastName: clientRecord.lastName,
              address: clientRecord.address,
              city: clientRecord.city,
              state: clientRecord.state,
              zipCode: clientRecord.zipCode,
            });
            const sigPosX = 28;
            const sigPosY = meta.signatureLineYPercent - 5;
            const sigPage = meta.signaturePageNumber;

            const signedPdfBuffer = await embedSignatureInPDF(
              fileUrl,
              previouslySignedAOC.signatureUrl!,
              sigPosX, sigPosY,
              1, sigPage
            );

            const signedFileKey = `signed-documents/${caseData.id}/${nanoid()}-client-signed.pdf`;
            const { url: signedFileUrl } = await storagePut(signedFileKey, signedPdfBuffer, "application/pdf");

            await updateDocument(docId, {
              signedBy: previouslySignedAOC.signedBy,
              signedAt: new Date(),
              signatureUrl: previouslySignedAOC.signatureUrl,
              signaturePositionX: "28",
              signaturePositionY: sigPosY.toFixed(2),
              signatureScale: "1",
              fileUrl: signedFileUrl,
              fileKey: signedFileKey,
            });

            console.log(`[AOC Auto-Sign] Re-used existing signature for case #${caseData.id} (from previously signed AOC #${previouslySignedAOC.id})`);

            await createActivityLog({
              userId: ctx.user.id,
              caseId: caseData.id,
              clientId: clientRecord.id,
              action: "document_signed_by_client",
              description: `AOC auto-signed using existing client signature for ${clientRecord.firstName} ${clientRecord.lastName}`,
            });
          } catch (autoSignErr) {
            console.error("[AOC Auto-Sign] Failed to auto-sign, client will need to sign manually:", autoSignErr);
            // Fall back to requiring manual signature
            await updateDocument(docId, { requiresSignature: true });
          }
        }

        // Log activity
        await createActivityLog({
          userId: ctx.user.id,
          caseId: caseData.id,
          clientId: clientRecord.id,
          action: "document_uploaded",
          description: `AOC document generated for client ${clientRecord.firstName} ${clientRecord.lastName}`,
        });

        // Notify team
        notifyCaseChangeToTeam({
          caseId: caseData.id,
          triggeredByUserId: ctx.user.id,
          type: "document_uploaded",
          title: "AOC Document Generated",
          message: `${clientRecord.firstName} ${clientRecord.lastName} generated an Affidavit of Complaint for case #${caseData.id}`,
        }).catch(() => {});

        return { success: true, docId, fileName };
      }),

    // Submit e-signature for a document (AOC etc.)
    submitSignature: clientProcedure
      .input(z.object({
        documentId: z.number(),
        signatureDataUrl: z.string(),
        signedByName: z.string(),
        positionX: z.number().min(0).max(100).optional(),
        positionY: z.number().min(0).max(100).optional(),
        scale: z.number().min(0.1).max(5).optional(),
        pageNumber: z.number().int().min(1).optional(),
      }))
      .mutation(async ({ input, ctx }) => {
        const clientRecord = await getClientByPortalUserId(ctx.user.id);
        if (!clientRecord) {
          throw new TRPCError({ code: "FORBIDDEN", message: "No client record linked to your account" });
        }
        const doc = await getDocumentByIdRaw(input.documentId);
        if (!doc) {
          throw new TRPCError({ code: "NOT_FOUND", message: "Document not found" });
        }
        // Verify the document belongs to client's case
        if (doc.caseId) {
          const caseData = await getCaseById(doc.caseId);
          if (!caseData || caseData.clientId !== clientRecord.id) {
            throw new TRPCError({ code: "FORBIDDEN", message: "You can only sign documents for your own cases" });
          }
        }
        if (!doc.requiresSignature) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "This document does not require a signature" });
        }
        if (doc.signedAt) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "This document has already been signed" });
        }

        // Convert base64 data URL to buffer and upload signature image
        const base64Data = input.signatureDataUrl.replace(/^data:image\/\w+;base64,/, "");
        const buffer = Buffer.from(base64Data, "base64");
        const sigKey = `signatures/${doc.caseId || "general"}/${nanoid()}-client-signature.png`;
        const { storagePut: storePut } = await import("./storage");
        const { url: signatureUrl } = await storePut(sigKey, buffer, "image/png");

        // Embed signature into the document
        let signedDocumentUrl = doc.fileUrl;
        let signedFileKey = doc.fileKey; // Track new file key for signed document
        try {
          const { embedSignatureInPDF, embedSignatureInImage } = await import("./signatureEmbedder");
          const isPDF = doc.fileName.toLowerCase().endsWith('.pdf');
          const isImage = /\.(jpg|jpeg|png|gif|webp|bmp)$/i.test(doc.fileName);

          // For AOC documents, use precise signature line position from the generator
          // The signature line is at ~74% from top, and we want the signature centered above it
          // positionX ~28 centers on the signature line (marginLeft to marginLeft+200)
          // positionY ~69 places the signature just above the line
          const isAOCDocument = doc.fileName.startsWith('AOC-') && doc.category === 'legal_doc';
          let sigPosX = input.positionX ?? 50;
          let sigPosY = input.positionY ?? 75;
          let sigScale = input.scale ?? 1;
          let sigPage = input.pageNumber;

          if (isAOCDocument && !input.positionX && !input.positionY) {
            // Use precise AOC signature line coordinates
            // Generate fresh metadata to get exact position
            try {
              const { generateAOCDocumentWithMeta } = await import("./services/aocGenerator");
              const meta = await generateAOCDocumentWithMeta({
                firstName: clientRecord.firstName,
                lastName: clientRecord.lastName,
                address: clientRecord.address,
                city: clientRecord.city,
                state: clientRecord.state,
                zipCode: clientRecord.zipCode,
              });
              // Position signature centered above the signature line
              // The line is at marginLeft(72) to marginLeft+200(272), center = 172
              // As percentage of page width (612): 172/612 * 100 = 28.1%
              sigPosX = 28;
              // Signature center should be above the line by half the signature height
              // signatureHeight = 80 * scale = 80, half = 40
              // 40 / 792 * 100 = 5.05%
              sigPosY = meta.signatureLineYPercent - 5;
              sigPage = meta.signaturePageNumber;
              console.log(`[ClientSignature] AOC signature position: x=${sigPosX}, y=${sigPosY.toFixed(1)}, page=${sigPage}`);
            } catch (metaErr) {
              console.warn("[ClientSignature] Could not get AOC metadata, using defaults", metaErr);
              sigPosX = 28;
              sigPosY = 76;
            }
          }

          if (isPDF) {
            const signedPdfBuffer = await embedSignatureInPDF(
              doc.fileUrl, signatureUrl,
              sigPosX, sigPosY,
              sigScale, sigPage
            );
            signedFileKey = `signed-documents/${doc.caseId || "general"}/${nanoid()}-client-signed.pdf`;
            const { url: signedPdfUrl } = await storePut(signedFileKey, signedPdfBuffer, "application/pdf");
            signedDocumentUrl = signedPdfUrl;
          } else if (isImage) {
            const signedImageBuffer = await embedSignatureInImage(
              doc.fileUrl, signatureUrl,
              sigPosX, sigPosY,
              sigScale
            );
            const ext = doc.fileName.split('.').pop()?.toLowerCase() || 'png';
            const mimeType = ext === 'jpg' || ext === 'jpeg' ? 'image/jpeg' : 'image/png';
            signedFileKey = `signed-documents/${doc.caseId || "general"}/${nanoid()}-client-signed.${ext}`;
            const { url: signedImageUrl } = await storePut(signedFileKey, signedImageBuffer, mimeType);
            signedDocumentUrl = signedImageUrl;
          }
        } catch (error: any) {
          console.error("Error embedding client signature:", error?.message || error);
          console.error("Error stack:", error?.stack);
          // Still continue - metadata will be updated even if embedding fails
        }

        console.log(`[ClientSignature] Updating document ${input.documentId}: fileUrl=${signedDocumentUrl.substring(0, 80)}, fileKey=${signedFileKey.substring(0, 80)}`);
        await updateDocument(input.documentId, {
          signedBy: input.signedByName,
          signedAt: new Date(),
          signatureUrl,
          signaturePositionX: input.positionX?.toString() ?? "50",
          signaturePositionY: input.positionY?.toString() ?? "80",
          signatureScale: input.scale?.toString() ?? "1",
          fileUrl: signedDocumentUrl,
          fileKey: signedFileKey, // Update fileKey so proxy endpoint serves signed version
        });

        await createActivityLog({
          userId: ctx.user.id,
          caseId: doc.caseId ?? undefined,
          clientId: clientRecord.id,
          action: "document_signed_by_client",
          description: `Document e-signed by client ${input.signedByName}: ${doc.fileName}`,
        });

        // Notify team about client signature
        if (doc.caseId) {
          notifyCaseChangeToTeam({
            caseId: doc.caseId,
            triggeredByUserId: ctx.user.id,
            type: "document_signed",
            title: `Document Signed by Client`,
            message: `${input.signedByName} e-signed document "${doc.fileName}" on case #${doc.caseId}`,
          }).catch(() => {});
        }

        return { success: true, signatureUrl };
      }),

    // Get case comments (own case only)
    getCaseComments: clientProcedure
      .input(z.object({ caseId: z.number() }))
      .query(async ({ input, ctx }) => {
        const clientRecord = await getClientByPortalUserId(ctx.user.id);
        if (!clientRecord) {
          throw new TRPCError({ code: "FORBIDDEN", message: "No client record linked to your account" });
        }
        const caseData = await getCaseById(input.caseId);
        if (!caseData || caseData.clientId !== clientRecord.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "You can only view comments for your own cases" });
        }
        return await getCommentsByCaseId(input.caseId);
      }),

    // Add comment to own case
    addComment: clientProcedure
      .input(z.object({
        caseId: z.number(),
        comment: z.string().min(1),
      }))
      .mutation(async ({ input, ctx }) => {
        const clientRecord = await getClientByPortalUserId(ctx.user.id);
        if (!clientRecord) {
          throw new TRPCError({ code: "FORBIDDEN", message: "No client record linked to your account" });
        }
        const caseData = await getCaseById(input.caseId);
        if (!caseData || caseData.clientId !== clientRecord.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "You can only comment on your own cases" });
        }
        const commentId = await createCaseComment({
          caseId: input.caseId,
          userId: ctx.user.id,
          userName: ctx.user.name || "Client",
          userRole: "client",
          comment: input.comment,
        });
        await createActivityLog({
          userId: ctx.user.id,
          caseId: input.caseId,
          clientId: clientRecord.id,
          action: "comment_added",
          description: `Client comment added to case: ${caseData.title}`,
        });

        // Notify team about client comment
        notifyCaseChangeToTeam({
          caseId: input.caseId,
          triggeredByUserId: ctx.user.id,
          type: "client_comment",
          title: `Client Comment on Case: ${caseData.title}`,
          message: `${ctx.user.name || "Client"} commented on case #${input.caseId}: "${input.comment.substring(0, 100)}${input.comment.length > 100 ? "..." : ""}"`,
        }).catch(() => {});

        // Email CRO about client comment
        if (caseData.assignedCroId) {
          const croUser = await getUserById(caseData.assignedCroId);
          if (croUser?.email) {
            const clientName = `${clientRecord.firstName} ${clientRecord.lastName}`;
            const commentPreview = input.comment.length > 200 ? input.comment.substring(0, 200) + "..." : input.comment;
            sendClientCommentCroNotification(
              croUser.email,
              croUser.name || "CRO",
              clientName,
              caseData.title,
              input.caseId,
              commentPreview,
            ).catch((err) => console.error("[Email] Failed to notify CRO of client comment:", err));
          }
        }

        return { success: true, commentId };
      }),

    // Get case timeline (own case only)
    getCaseTimeline: clientProcedure
      .input(z.object({ caseId: z.number() }))
      .query(async ({ input, ctx }) => {
        const clientRecord = await getClientByPortalUserId(ctx.user.id);
        if (!clientRecord) {
          throw new TRPCError({ code: "FORBIDDEN", message: "No client record linked to your account" });
        }
        const caseData = await getCaseById(input.caseId);
        if (!caseData || caseData.clientId !== clientRecord.id) {
          throw new TRPCError({ code: "FORBIDDEN", message: "You can only view timeline for your own cases" });
        }
        return await getEnrichedTimelineByCaseId(input.caseId);
      }),

    // Check if client has signed the AOC (dashboard-level)
    getAOCStatus: clientProcedure.query(async ({ ctx }) => {
      const clientRecord = await getClientByPortalUserId(ctx.user.id);
      if (!clientRecord) {
        throw new TRPCError({ code: "NOT_FOUND", message: "No client record linked to your account" });
      }
      const signedAOC = await getSignedAOCByClientId(clientRecord.id);
      return {
        hasSigned: !!signedAOC,
        aocDocument: signedAOC || null,
      };
    }),

    // Generate and sign AOC at dashboard level
    generateAndSignAOC: clientProcedure
      .input(z.object({
        signatureDataUrl: z.string(),
      }))
      .mutation(async ({ input, ctx }) => {
        const clientRecord = await getClientByPortalUserId(ctx.user.id);
        if (!clientRecord) {
          throw new TRPCError({ code: "NOT_FOUND", message: "No client record linked to your account" });
        }

        // Check if already signed
        const existingAOC = await getSignedAOCByClientId(clientRecord.id);
        if (existingAOC) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "You have already signed the AOC" });
        }

        // Generate AOC PDF
        const { generateAOCDocumentWithMeta } = await import("./services/aocGenerator");
        const { pdfBuffer, signatureLineYPercent, signaturePageNumber } = await generateAOCDocumentWithMeta({
          firstName: clientRecord.firstName,
          lastName: clientRecord.lastName,
          address: clientRecord.address,
          city: clientRecord.city,
          state: clientRecord.state,
          zipCode: clientRecord.zipCode,
        });

        // Upload unsigned PDF to storage
        const fileName = `AOC-${clientRecord.firstName}-${clientRecord.lastName}.pdf`;
        const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9.-]/g, "_");
        const fileKey = `clients/${clientRecord.id}/aoc/${nanoid()}-${sanitizedFileName}`;
        const { url: unsignedFileUrl } = await storagePut(fileKey, pdfBuffer, "application/pdf");

        // Upload signature image
        const signatureBuffer = Buffer.from(input.signatureDataUrl.split(",")[1], "base64");
        const signatureKey = `clients/${clientRecord.id}/signatures/${nanoid()}-signature.png`;
        const { url: signatureUrl } = await storagePut(signatureKey, signatureBuffer, "image/png");

        // Embed signature into PDF
        const { embedSignatureInPDF } = await import("./signatureEmbedder");
        const sigPosX = 28;
        const sigPosY = signatureLineYPercent - 5;
        const sigPage = signaturePageNumber;

        const signedPdfBuffer = await embedSignatureInPDF(
          unsignedFileUrl,
          signatureUrl,
          sigPosX, sigPosY,
          1, sigPage
        );

        // Upload signed PDF
        const signedFileKey = `clients/${clientRecord.id}/aoc/${nanoid()}-signed.pdf`;
        const { url: signedFileUrl } = await storagePut(signedFileKey, signedPdfBuffer, "application/pdf");

        // Save document metadata (not linked to any specific case)
        const docId = await createDocument({
          caseId: null, // Dashboard-level AOC, not case-specific
          clientId: clientRecord.id,
          fileName: sanitizedFileName,
          fileUrl: signedFileUrl,
          fileKey: signedFileKey,
          fileSize: signedPdfBuffer.length,
          mimeType: "application/pdf",
          uploadedBy: ctx.user.id,
          category: "legal_doc",
          requiresSignature: false,
          signedBy: ctx.user.id.toString(),
          signedAt: new Date(),
          signatureUrl,
          signaturePositionX: sigPosX.toString(),
          signaturePositionY: sigPosY.toFixed(2),
          signatureScale: "1",
        });

        return { success: true, documentId: docId, fileUrl: signedFileUrl };
      }),
  }),
});

export type AppRouter = typeof appRouter;
