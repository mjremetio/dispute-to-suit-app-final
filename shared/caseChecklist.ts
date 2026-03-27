/**
 * Document checklist requirements per case type.
 * CROs see these checklists when creating and managing cases.
 * Each item maps to a document category for tracking completion.
 */

export interface ChecklistItem {
  id: string;
  label: string;
  category: string; // Maps to document category for matching
  required: boolean;
  description: string;
}

export interface CaseTypeConfig {
  label: string;
  value: string;
  checklist: ChecklistItem[];
}

export const CASE_TYPE_CONFIGS: Record<string, CaseTypeConfig> = {
  fcra_violation: {
    label: "FCRA Violation",
    value: "fcra_violation",
    checklist: [
      {
        id: "credit_report",
        label: "Credit Report",
        category: "credit_report",
        required: true,
        description: "Current credit report showing inaccurate information",
      },
      {
        id: "dispute_letter",
        label: "Dispute Letter",
        category: "dispute_letter",
        required: true,
        description: "Copy of dispute letter sent to credit bureau(s)",
      },
      {
        id: "bureau_response",
        label: "Bureau Response",
        category: "bureau_response",
        required: false,
        description: "Response received from credit bureau(s) if available",
      },
      {
        id: "identity_doc",
        label: "Government-Issued ID",
        category: "identity_doc",
        required: true,
        description: "Valid government-issued photo identification",
      },
      {
        id: "supporting_evidence",
        label: "Supporting Evidence",
        category: "supporting_document",
        required: false,
        description: "Any additional evidence of inaccurate reporting",
      },
    ],
  },
  fdcpa_violation: {
    label: "FDCPA Violation",
    value: "fdcpa_violation",
    checklist: [
      {
        id: "credit_report",
        label: "Credit Report",
        category: "credit_report",
        required: true,
        description: "Current credit report showing collection accounts",
      },
      {
        id: "collection_letters",
        label: "Collection Letters/Notices",
        category: "collection_letter",
        required: true,
        description: "All correspondence received from debt collectors",
      },
      {
        id: "call_records",
        label: "Call Records/Logs",
        category: "call_records",
        required: false,
        description: "Phone records showing collector contact attempts",
      },
      {
        id: "identity_doc",
        label: "Government-Issued ID",
        category: "identity_doc",
        required: true,
        description: "Valid government-issued photo identification",
      },
      {
        id: "debt_validation",
        label: "Debt Validation Request",
        category: "debt_validation",
        required: false,
        description: "Copy of debt validation letter if sent",
      },
    ],
  },
  state_law: {
    label: "State Law Consumer Violation",
    value: "state_law",
    checklist: [
      {
        id: "credit_report",
        label: "Credit Report",
        category: "credit_report",
        required: true,
        description: "Current credit report",
      },
      {
        id: "identity_doc",
        label: "Government-Issued ID",
        category: "identity_doc",
        required: true,
        description: "Valid government-issued photo identification",
      },
      {
        id: "state_complaint",
        label: "State Complaint Filing",
        category: "state_complaint",
        required: false,
        description: "Copy of complaint filed with state attorney general if applicable",
      },
      {
        id: "contract_agreement",
        label: "Contract/Agreement",
        category: "contract_agreement",
        required: false,
        description: "Relevant contracts or agreements with the violating party",
      },
      {
        id: "supporting_evidence",
        label: "Supporting Evidence",
        category: "supporting_document",
        required: false,
        description: "Any additional evidence of consumer law violation",
      },
    ],
  },
  general_consumer: {
    label: "General Consumer Law",
    value: "general_consumer",
    checklist: [
      {
        id: "credit_report",
        label: "Credit Report",
        category: "credit_report",
        required: true,
        description: "Current credit report",
      },
      {
        id: "identity_doc",
        label: "Government-Issued ID",
        category: "identity_doc",
        required: true,
        description: "Valid government-issued photo identification",
      },
      {
        id: "supporting_evidence",
        label: "Supporting Evidence",
        category: "supporting_document",
        required: false,
        description: "Any documents supporting the consumer complaint",
      },
    ],
  },
};

/**
 * Priority escalation thresholds (in hours).
 * Cases sitting in "pending_review" beyond these thresholds get escalated.
 */
export const ESCALATION_THRESHOLDS = {
  /** Hours before medium → high escalation */
  MEDIUM_TO_HIGH: 48,
  /** Hours before high → urgent escalation */
  HIGH_TO_URGENT: 72,
};

/**
 * Canonical list of case type options used across the app (Cases, IntakeInquiries, CRO portal, etc.).
 * Derived from CASE_TYPE_CONFIGS with an "Other" fallback.
 */
export const CASE_TYPES = [
  ...Object.values(CASE_TYPE_CONFIGS).map((c) => ({ value: c.value, label: c.label })),
  { value: "other", label: "Other" },
];

/**
 * Get the display label for a case type value.
 * Falls back to the raw value (replacing underscores with spaces) if not found.
 */
export function getCaseTypeLabel(value: string | null | undefined): string {
  if (!value) return "Not specified";
  const found = CASE_TYPE_CONFIGS[value];
  if (found) return found.label;
  // Fallback: might be a legacy label stored directly (e.g. "FCRA Violation")
  return value.replace(/_/g, " ");
}

/**
 * Get the checklist for a given case type.
 */
export function getChecklistForType(caseType: string): ChecklistItem[] {
  return CASE_TYPE_CONFIGS[caseType]?.checklist || [];
}

/**
 * Check how many required items are fulfilled based on uploaded document categories.
 */
export function getChecklistCompletion(
  caseType: string,
  uploadedCategories: string[]
): { total: number; completed: number; requiredTotal: number; requiredCompleted: number; items: Array<ChecklistItem & { fulfilled: boolean }> } {
  const checklist = getChecklistForType(caseType);
  const items = checklist.map((item) => ({
    ...item,
    fulfilled: uploadedCategories.includes(item.category),
  }));
  const requiredItems = items.filter((i) => i.required);

  return {
    total: items.length,
    completed: items.filter((i) => i.fulfilled).length,
    requiredTotal: requiredItems.length,
    requiredCompleted: requiredItems.filter((i) => i.fulfilled).length,
    items,
  };
}
