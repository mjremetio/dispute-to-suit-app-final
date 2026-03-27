/**
 * Notification service: handles notifying users about case changes.
 * Single Responsibility: Only manages case-related notifications.
 */
import { createNotification, getCaseNotificationRecipients } from "../db";

interface CaseNotificationOptions {
  caseId: number;
  triggeredByUserId: number;
  type: string;
  title: string;
  message: string;
  link?: string;
}

/**
 * Notifies all relevant users about a case change.
 * Catches and logs errors to prevent notification failures from blocking the main operation.
 */
export async function notifyCaseChangeToTeam(opts: CaseNotificationOptions): Promise<void> {
  try {
    const recipients = await getCaseNotificationRecipients(opts.caseId, opts.triggeredByUserId);
    for (const userId of recipients) {
      await createNotification({
        userId,
        type: opts.type,
        title: opts.title,
        message: opts.message,
        link: opts.link || `/cases/${opts.caseId}`,
        isRead: false,
      });
    }
  } catch (err) {
    console.error("[Notification] Failed to notify case change:", err);
  }
}
