import { Router, Request, Response } from "express";
import { apiKeyAuth, requirePermission } from "../../middleware/apiAuth";
import {
  getClientsByPartnerId,
  getClientById,
  getCasesByPartnerId,
  getCaseById,
  getTasksByCaseId,
  getCaseDocuments,
  getEnrichedTimelineByCaseId,
  getCommentsByCaseId,
  getCasesByClientId,
  createCaseComment,
  updateCase,
  createActivityLog,
} from "../../db";

const router = Router();

// All routes require API key authentication
router.use(apiKeyAuth);

// ============= HELPERS =============

function parsePagination(req: Request) {
  const page = Math.max(1, parseInt(req.query.page as string) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(req.query.limit as string) || 20));
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

function paginate<T>(items: T[], page: number, limit: number) {
  const total = items.length;
  const totalPages = Math.ceil(total / limit);
  const offset = (page - 1) * limit;
  const data = items.slice(offset, offset + limit);
  return {
    data,
    pagination: {
      page,
      limit,
      total,
      totalPages,
      hasMore: page < totalPages,
    },
  };
}

/** Strip sensitive fields from client records (SSN, etc.) */
function sanitizeClient(client: any) {
  const { ssn, customFields, ...safe } = client;
  return safe;
}

/** Strip internal fields from case records */
function sanitizeCase(c: any) {
  const { customFields, ...safe } = c;
  return safe;
}

// ============= DASHBOARD STATS =============

router.get("/dashboard/stats", requirePermission("dashboard:read"), async (req: Request, res: Response) => {
  try {
    const partnerId = req.apiPartner!.id;
    const [clients, cases] = await Promise.all([
      getClientsByPartnerId(partnerId),
      getCasesByPartnerId(partnerId),
    ]);

    const casesByStatus: Record<string, number> = {};
    const casesByPriority: Record<string, number> = {};
    let activeCases = 0;
    const activeStatuses = ["new", "pending_review", "in_review", "more_info_needed", "ready_for_attorney", "sent_to_attorney", "accepted_by_attorney"];
    const completedStatuses = ["settled", "settlement_paid_out", "closed"];

    for (const c of cases) {
      casesByStatus[c.status] = (casesByStatus[c.status] || 0) + 1;
      casesByPriority[c.priority] = (casesByPriority[c.priority] || 0) + 1;
      if (activeStatuses.includes(c.status)) activeCases++;
    }

    const completedCases = completedStatuses.reduce((sum, s) => sum + (casesByStatus[s] || 0), 0);

    const clientsByStage: Record<string, number> = {};
    for (const cl of clients) {
      clientsByStage[cl.stage] = (clientsByStage[cl.stage] || 0) + 1;
    }

    return res.json({
      success: true,
      data: {
        totalClients: clients.length,
        clientsByStage,
        totalCases: cases.length,
        activeCases,
        completedCases,
        rejectedCases: casesByStatus["rejected"] || 0,
        casesByStatus,
        casesByPriority,
        successRate: cases.length > 0 ? Math.round((completedCases / cases.length) * 100) : 0,
      },
    });
  } catch (error) {
    console.error("[API v1] dashboard/stats error:", error);
    return res.status(500).json({ success: false, error: "Internal server error." });
  }
});

// ============= CLIENTS =============

router.get("/clients", requirePermission("clients:read"), async (req: Request, res: Response) => {
  try {
    const partnerId = req.apiPartner!.id;
    const { page, limit } = parsePagination(req);
    let clients = await getClientsByPartnerId(partnerId);

    // Filter by stage
    const stage = req.query.stage as string;
    if (stage) {
      clients = clients.filter(c => c.stage === stage);
    }

    // Search by name or email
    const search = (req.query.search as string || "").toLowerCase();
    if (search) {
      clients = clients.filter(c =>
        `${c.firstName} ${c.lastName}`.toLowerCase().includes(search) ||
        (c.email && c.email.toLowerCase().includes(search))
      );
    }

    const result = paginate(clients.map(sanitizeClient), page, limit);
    return res.json({ success: true, ...result });
  } catch (error) {
    console.error("[API v1] clients list error:", error);
    return res.status(500).json({ success: false, error: "Internal server error." });
  }
});

router.get("/clients/:id", requirePermission("clients:read"), async (req: Request, res: Response) => {
  try {
    const partnerId = req.apiPartner!.id;
    const clientId = parseInt(req.params.id);
    if (isNaN(clientId)) {
      return res.status(400).json({ success: false, error: "Invalid client ID." });
    }

    const client = await getClientById(clientId);
    if (!client || client.partnerId !== partnerId) {
      return res.status(404).json({ success: false, error: "Client not found." });
    }

    // Include client's cases summary
    const clientCases = await getCasesByClientId(clientId);
    const scopedCases = clientCases.filter(c => c.partnerId === partnerId);

    return res.json({
      success: true,
      data: {
        ...sanitizeClient(client),
        cases: scopedCases.map(sanitizeCase),
      },
    });
  } catch (error) {
    console.error("[API v1] client detail error:", error);
    return res.status(500).json({ success: false, error: "Internal server error." });
  }
});

// ============= CASES =============

router.get("/cases", requirePermission("cases:read"), async (req: Request, res: Response) => {
  try {
    const partnerId = req.apiPartner!.id;
    const { page, limit } = parsePagination(req);
    let cases = await getCasesByPartnerId(partnerId);

    // Filter by status
    const status = req.query.status as string;
    if (status) {
      cases = cases.filter(c => c.status === status);
    }

    // Filter by priority
    const priority = req.query.priority as string;
    if (priority) {
      cases = cases.filter(c => c.priority === priority);
    }

    // Filter by clientId
    const clientId = parseInt(req.query.clientId as string);
    if (!isNaN(clientId)) {
      cases = cases.filter(c => c.clientId === clientId);
    }

    // Search by title
    const search = (req.query.search as string || "").toLowerCase();
    if (search) {
      cases = cases.filter(c => c.title.toLowerCase().includes(search));
    }

    const result = paginate(cases.map(sanitizeCase), page, limit);
    return res.json({ success: true, ...result });
  } catch (error) {
    console.error("[API v1] cases list error:", error);
    return res.status(500).json({ success: false, error: "Internal server error." });
  }
});

router.get("/cases/:id", requirePermission("cases:read"), async (req: Request, res: Response) => {
  try {
    const partnerId = req.apiPartner!.id;
    const caseId = parseInt(req.params.id);
    if (isNaN(caseId)) {
      return res.status(400).json({ success: false, error: "Invalid case ID." });
    }

    const caseData = await getCaseById(caseId);
    if (!caseData || caseData.partnerId !== partnerId) {
      return res.status(404).json({ success: false, error: "Case not found." });
    }

    // Include tasks and documents
    const [tasks, documents] = await Promise.all([
      getTasksByCaseId(caseId),
      getCaseDocuments(caseId),
    ]);

    return res.json({
      success: true,
      data: {
        ...sanitizeCase(caseData),
        tasks: tasks.map(({ createdBy, ...t }) => t),
        documents: documents.map(({ uploadedBy, fileKey, ...d }) => d),
      },
    });
  } catch (error) {
    console.error("[API v1] case detail error:", error);
    return res.status(500).json({ success: false, error: "Internal server error." });
  }
});

router.get("/cases/:id/timeline", requirePermission("cases:read"), async (req: Request, res: Response) => {
  try {
    const partnerId = req.apiPartner!.id;
    const caseId = parseInt(req.params.id);
    if (isNaN(caseId)) {
      return res.status(400).json({ success: false, error: "Invalid case ID." });
    }

    const caseData = await getCaseById(caseId);
    if (!caseData || caseData.partnerId !== partnerId) {
      return res.status(404).json({ success: false, error: "Case not found." });
    }

    const timeline = await getEnrichedTimelineByCaseId(caseId);

    return res.json({
      success: true,
      data: timeline.map(({ ipAddress, userAgent, userId, ...entry }) => entry),
    });
  } catch (error) {
    console.error("[API v1] case timeline error:", error);
    return res.status(500).json({ success: false, error: "Internal server error." });
  }
});

router.get("/cases/:id/documents", requirePermission("documents:read"), async (req: Request, res: Response) => {
  try {
    const partnerId = req.apiPartner!.id;
    const caseId = parseInt(req.params.id);
    if (isNaN(caseId)) {
      return res.status(400).json({ success: false, error: "Invalid case ID." });
    }

    const caseData = await getCaseById(caseId);
    if (!caseData || caseData.partnerId !== partnerId) {
      return res.status(404).json({ success: false, error: "Case not found." });
    }

    const documents = await getCaseDocuments(caseId);

    return res.json({
      success: true,
      data: documents.map(({ uploadedBy, fileKey, ...d }) => d),
    });
  } catch (error) {
    console.error("[API v1] case documents error:", error);
    return res.status(500).json({ success: false, error: "Internal server error." });
  }
});

router.get("/cases/:id/comments", requirePermission("cases:read"), async (req: Request, res: Response) => {
  try {
    const partnerId = req.apiPartner!.id;
    const caseId = parseInt(req.params.id);
    if (isNaN(caseId)) {
      return res.status(400).json({ success: false, error: "Invalid case ID." });
    }

    const caseData = await getCaseById(caseId);
    if (!caseData || caseData.partnerId !== partnerId) {
      return res.status(404).json({ success: false, error: "Case not found." });
    }

    const comments = await getCommentsByCaseId(caseId);

    return res.json({
      success: true,
      data: comments.map(({ userId, ...c }) => c),
    });
  } catch (error) {
    console.error("[API v1] case comments error:", error);
    return res.status(500).json({ success: false, error: "Internal server error." });
  }
});

// ============= WRITE ENDPOINTS =============

const VALID_STATUSES = [
  "new", "pending_review", "in_review", "more_info_needed",
  "ready_for_attorney", "sent_to_attorney", "accepted_by_attorney",
  "rejected", "settled", "settlement_paid_out", "closed",
] as const;

/**
 * POST /cases/:id/comments
 * Add a comment to a case. Requires cases:write permission.
 */
router.post("/cases/:id/comments", requirePermission("cases:write"), async (req: Request, res: Response) => {
  try {
    const partnerId = req.apiPartner!.id;
    const caseId = parseInt(req.params.id);
    if (isNaN(caseId)) {
      return res.status(400).json({ success: false, error: "Invalid case ID." });
    }

    const caseData = await getCaseById(caseId);
    if (!caseData || caseData.partnerId !== partnerId) {
      return res.status(404).json({ success: false, error: "Case not found." });
    }

    // Validate request body
    const { comment } = req.body || {};
    if (!comment || typeof comment !== "string" || comment.trim().length === 0) {
      return res.status(400).json({ success: false, error: "Field 'comment' is required and must be a non-empty string." });
    }
    if (comment.length > 5000) {
      return res.status(400).json({ success: false, error: "Comment must not exceed 5000 characters." });
    }

    const partnerName = req.apiPartner!.companyName || req.apiPartner!.name || "API Partner";

    const commentId = await createCaseComment({
      caseId,
      userId: 0, // API-sourced comment, no user session
      userName: `${partnerName} (API)`,
      userRole: "partner",
      comment: comment.trim(),
    });

    // Log the activity
    await createActivityLog({
      partnerId,
      caseId,
      action: "comment_added",
      description: `Comment added via API by ${partnerName}`,
      metadata: JSON.stringify({ source: "api_v1", apiKeyId: req.apiKey!.id }),
    });

    return res.status(201).json({
      success: true,
      data: {
        id: commentId,
        caseId,
        userName: `${partnerName} (API)`,
        userRole: "partner",
        comment: comment.trim(),
        createdAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("[API v1] post comment error:", error);
    return res.status(500).json({ success: false, error: "Internal server error." });
  }
});

/**
 * PATCH /cases/:id/status
 * Update the status of a case. Requires cases:write permission.
 */
router.patch("/cases/:id/status", requirePermission("cases:write"), async (req: Request, res: Response) => {
  try {
    const partnerId = req.apiPartner!.id;
    const caseId = parseInt(req.params.id);
    if (isNaN(caseId)) {
      return res.status(400).json({ success: false, error: "Invalid case ID." });
    }

    const caseData = await getCaseById(caseId);
    if (!caseData || caseData.partnerId !== partnerId) {
      return res.status(404).json({ success: false, error: "Case not found." });
    }

    // Validate request body
    const { status, reason } = req.body || {};
    if (!status || typeof status !== "string") {
      return res.status(400).json({ success: false, error: "Field 'status' is required." });
    }
    if (!VALID_STATUSES.includes(status as any)) {
      return res.status(400).json({
        success: false,
        error: `Invalid status. Must be one of: ${VALID_STATUSES.join(", ")}`,
      });
    }

    const previousStatus = caseData.status;
    if (status === previousStatus) {
      return res.status(400).json({ success: false, error: "Case is already in the requested status." });
    }

    // Build update payload
    const updates: Record<string, any> = {
      status,
      updatedAt: new Date(),
    };
    // Auto-set completedAt / closedAt timestamps
    if (["settled", "settlement_paid_out", "closed"].includes(status)) {
      if (!caseData.completedAt) updates.completedAt = new Date();
      if (status === "closed" && !caseData.closedAt) updates.closedAt = new Date();
    }

    await updateCase(caseId, updates);

    const partnerName = req.apiPartner!.companyName || req.apiPartner!.name || "API Partner";

    // Log the activity
    await createActivityLog({
      partnerId,
      caseId,
      action: "status_changed",
      description: `Case status changed from "${previousStatus}" to "${status}" via API by ${partnerName}${reason ? ` — ${reason}` : ""}`,
      metadata: JSON.stringify({
        source: "api_v1",
        apiKeyId: req.apiKey!.id,
        previousStatus,
        newStatus: status,
        reason: reason || null,
      }),
    });

    return res.json({
      success: true,
      data: {
        id: caseId,
        previousStatus,
        status,
        updatedAt: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error("[API v1] patch status error:", error);
    return res.status(500).json({ success: false, error: "Internal server error." });
  }
});

export { router as apiV1Router };
