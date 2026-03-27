import sgMail from "@sendgrid/mail";
import { ENV } from "./_core/env";
import { notifyOwner } from "./_core/notification";
import {
  getPartnerSignupNotificationEmail,
  getPartnerApprovalEmail,
  getPartnerRejectionEmail,
  getPasswordResetEmail,
  getAdminInviteEmail,
  getIntakeClientNotificationEmail,
  getIntakeCroAcceptedEmail,
  getCroCredentialsEmail,
  getClientCommentCroNotificationEmail,
  getCaseStatusChangeCroNotificationEmail,
  getClientCredentialsEmail,
  getAOCSignatureRequiredEmail,
} from "./emailTemplates";

/**
 * Email Service using SendGrid
 * Follows Single Responsibility Principle - handles only email delivery
 */

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

// Initialize SendGrid
if (ENV.sendgridApiKey) {
  sgMail.setApiKey(ENV.sendgridApiKey);
}

/**
 * Core email sender using SendGrid API
 */
async function sendEmail(options: EmailOptions): Promise<boolean> {
  if (!ENV.sendgridApiKey) {
    console.log(`[Email] SendGrid not configured. Would send to ${options.to}: ${options.subject}`);
    return true;
  }

  try {
    await sgMail.send({
      to: options.to,
      from: ENV.senderEmail,
      subject: options.subject,
      html: options.html,
    });
    console.log(`[Email] Sent to ${options.to}: ${options.subject}`);
    return true;
  } catch (error: any) {
    console.error(`[Email] Failed to send to ${options.to}:`, error?.response?.body || error.message);
    return false;
  }
}

/** Notify admin of new partner signup */
export async function notifyAdminOfPartnerSignup(
  partnerName: string,
  partnerEmail: string,
  companyName: string,
  phone?: string,
  address?: string,
): Promise<boolean> {
  const ownerNotification = await notifyOwner({
    title: "New Partner Signup Pending Approval",
    content: `New partner signup: ${partnerName} (${partnerEmail}) - ${companyName}`,
  });

  const template = getPartnerSignupNotificationEmail({ name: partnerName, email: partnerEmail, companyName, phone, address });
  const emailSent = await sendEmail({ to: partnerEmail, ...template });
  return ownerNotification && emailSent;
}

/** Notify user of partner approval */
export async function notifyPartnerApproval(email: string, name: string, companyName: string): Promise<boolean> {
  const template = getPartnerApprovalEmail({ name, companyName });
  return sendEmail({ to: email, ...template });
}

/** Notify user of partner rejection */
export async function notifyPartnerRejection(email: string, name: string, companyName: string, reason?: string): Promise<boolean> {
  const template = getPartnerRejectionEmail({ name, companyName, reason });
  return sendEmail({ to: email, ...template });
}

/** Send password reset email */
export async function sendPasswordResetEmail(email: string, name: string, resetToken: string): Promise<boolean> {
  const template = getPasswordResetEmail({ name, resetToken });
  return sendEmail({ to: email, ...template });
}

/** Send VIP invite email */
export async function sendInviteEmail(email: string, recipientName: string, inviteToken: string, expiresAt: Date): Promise<boolean> {
  const template = getAdminInviteEmail({ recipientName, inviteToken, expiresAt });
  return sendEmail({ to: email, ...template });
}

/** Notify about case assignment */
export async function notifyCaseAssignment(email: string, userName: string, caseTitle: string, caseId: number): Promise<boolean> {
  return sendEmail({
    to: email,
    subject: "New Case Assigned to You - Dispute2Suit",
    html: `<p>Dear ${userName},</p><p>A new case "<strong>${caseTitle}</strong>" (Case #${caseId}) has been assigned to you.</p><p>Please log in to <a href="${ENV.appUrl}/cases/${caseId}">view the case details</a>.</p>`,
  });
}

/** Send intake inquiry client notification */
export async function sendIntakeClientNotification(clientEmail: string, clientFirstName: string, croName: string): Promise<boolean> {
  const template = getIntakeClientNotificationEmail({ clientFirstName, croName });
  return sendEmail({ to: clientEmail, ...template });
}

/** Send intake inquiry acceptance notification to CRO */
export async function sendIntakeCroAcceptedNotification(croEmail: string, croName: string, clientName: string): Promise<boolean> {
  const template = getIntakeCroAcceptedEmail({ croName, clientName });
  return sendEmail({ to: croEmail, ...template });
}

/** Send CRO account credentials email after approval */
export async function sendCroCredentialsEmail(email: string, name: string, tempPassword: string): Promise<boolean> {
  const template = getCroCredentialsEmail({ name, email, tempPassword });
  return sendEmail({ to: email, ...template });
}

/** Notify CRO via email when a client posts a comment on a case */
export async function sendClientCommentCroNotification(
  croEmail: string,
  croName: string,
  clientName: string,
  caseTitle: string,
  caseId: number,
  commentPreview: string,
): Promise<boolean> {
  const template = getClientCommentCroNotificationEmail({ croName, clientName, caseTitle, caseId, commentPreview });
  return sendEmail({ to: croEmail, ...template });
}

/** Notify CRO via email when case status is changed by paralegal/admin */
export async function sendCaseStatusChangeCroNotification(
  croEmail: string,
  croName: string,
  caseTitle: string,
  caseId: number,
  oldStatus: string,
  newStatus: string,
  changedByName: string,
): Promise<boolean> {
  const template = getCaseStatusChangeCroNotificationEmail({ croName, caseTitle, caseId, oldStatus, newStatus, changedByName });
  return sendEmail({ to: croEmail, ...template });
}

/** Send client portal credentials email after account creation */
export async function sendClientCredentialsEmail(email: string, name: string, tempPassword: string): Promise<boolean> {
  const template = getClientCredentialsEmail({ name, email, tempPassword });
  return sendEmail({ to: email, ...template });
}

/** Send AOC signature required notification email (only for first case, skip if AOC already signed) */
export async function sendAOCSignatureRequiredEmail(email: string, clientName: string): Promise<boolean> {
  const template = getAOCSignatureRequiredEmail({ clientName });
  return sendEmail({ to: email, ...template });
}
