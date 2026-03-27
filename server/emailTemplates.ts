/**
 * Professional email templates for Dispute2Suit
 * All templates include branding and proper HTML structure
 */

const BRAND_COLOR = "#4F46E5"; // Indigo-600
const BRAND_NAME = "Dispute2Suit";
const APP_DOMAIN = "https://dispute-to-suit.manus.space";

/**
 * Base email template with Dispute2Suit branding
 */
function getEmailTemplate(content: string): string {
  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${BRAND_NAME}</title>
  <style>
    body {
      margin: 0;
      padding: 0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      background-color: #f3f4f6;
    }
    .email-container {
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
    }
    .email-header {
      background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%);
      padding: 40px 30px;
      text-align: center;
    }
    .logo-container {
      display: inline-block;
      background-color: rgba(255, 255, 255, 0.2);
      padding: 15px 25px;
      border-radius: 12px;
      margin-bottom: 15px;
    }
    .logo-text {
      color: #ffffff;
      font-size: 28px;
      font-weight: bold;
      margin: 0;
      letter-spacing: -0.5px;
    }
    .tagline {
      color: #E0E7FF;
      font-size: 14px;
      margin: 10px 0 0 0;
    }
    .email-body {
      padding: 40px 30px;
      color: #374151;
      line-height: 1.6;
    }
    .email-footer {
      background-color: #F9FAFB;
      padding: 30px;
      text-align: center;
      border-top: 1px solid #E5E7EB;
    }
    .footer-text {
      color: #6B7280;
      font-size: 13px;
      margin: 5px 0;
    }
    .button {
      display: inline-block;
      padding: 14px 32px;
      background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%);
      color: #ffffff !important;
      text-decoration: none;
      border-radius: 8px;
      font-weight: 600;
      margin: 20px 0;
      box-shadow: 0 4px 6px rgba(79, 70, 229, 0.3);
    }
    .button:hover {
      box-shadow: 0 6px 8px rgba(79, 70, 229, 0.4);
    }
    .info-box {
      background-color: #EEF2FF;
      border-left: 4px solid ${BRAND_COLOR};
      padding: 16px 20px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .success-box {
      background-color: #ECFDF5;
      border-left: 4px solid #10B981;
      padding: 16px 20px;
      margin: 20px 0;
      border-radius: 4px;
    }
    .warning-box {
      background-color: #FEF3C7;
      border-left: 4px solid #F59E0B;
      padding: 16px 20px;
      margin: 20px 0;
      border-radius: 4px;
    }
    h1 {
      color: #111827;
      font-size: 24px;
      margin: 0 0 20px 0;
      font-weight: 700;
    }
    h2 {
      color: #1F2937;
      font-size: 20px;
      margin: 30px 0 15px 0;
      font-weight: 600;
    }
    p {
      margin: 15px 0;
    }
    .scale-icon {
      font-size: 32px;
      margin-bottom: 10px;
    }
  </style>
</head>
<body>
  <div class="email-container">
    <div class="email-header">
      <div class="logo-container">
        <div class="scale-icon">⚖️</div>
        <h1 class="logo-text">${BRAND_NAME}</h1>
      </div>
      <p class="tagline">From Dispute to Lawsuit</p>
    </div>
    <div class="email-body">
      ${content}
    </div>
    <div class="email-footer">
      <p class="footer-text"><strong>${BRAND_NAME}</strong></p>
      <p class="footer-text">The litigation-ready CRM for credit repair professionals</p>
      <p class="footer-text" style="margin-top: 20px;">
        © ${new Date().getFullYear()} ${BRAND_NAME}. All rights reserved.
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Email template for new partner signup notification (sent to admin)
 */
export function getPartnerSignupNotificationEmail(partner: {
  name: string;
  email: string;
  companyName: string;
  phone?: string;
  address?: string;
}): { subject: string; html: string } {
  const content = `
    <h1>🎯 New Partner Application</h1>
    <p>A new credit repair professional has applied to become a partner on ${BRAND_NAME}.</p>
    
    <div class="info-box">
      <h2>Partner Details</h2>
      <p><strong>Name:</strong> ${partner.name}</p>
      <p><strong>Email:</strong> ${partner.email}</p>
      <p><strong>Company:</strong> ${partner.companyName}</p>
      ${partner.phone ? `<p><strong>Phone:</strong> ${partner.phone}</p>` : ""}
      ${partner.address ? `<p><strong>Address:</strong> ${partner.address}</p>` : ""}
    </div>

    <p>Please review this application and approve or reject it from the admin dashboard.</p>
    
    <p style="margin-top: 30px;">
      <a href="${APP_DOMAIN}/admin/partners" class="button">
        Review Application
      </a>
    </p>

    <p style="color: #6B7280; font-size: 14px; margin-top: 30px;">
      This is an automated notification from ${BRAND_NAME}. Please log in to your admin dashboard to take action.
    </p>
  `;

  return {
    subject: `Dispute2Suit - New Partner Application from ${partner.companyName}`,
    html: getEmailTemplate(content),
  };
}

/**
 * Email template for partner approval (sent to partner)
 */
export function getPartnerApprovalEmail(partner: {
  name: string;
  companyName: string;
}): { subject: string; html: string } {
  const content = `
    <h1>🎉 Welcome to ${BRAND_NAME}!</h1>
    <p>Dear ${partner.name},</p>
    
    <div class="success-box">
      <p style="margin: 0;"><strong>Congratulations!</strong> Your partner application for <strong>${partner.companyName}</strong> has been approved.</p>
    </div>

    <p>You now have access to the ${BRAND_NAME} litigation-ready CRM platform. You can start managing your credit repair cases and escalating FCRA violations to attorney-backed litigation.</p>

    <h2>Getting Started</h2>
    <p>Here's what you can do now:</p>
    <ul style="line-height: 1.8;">
      <li>Log in to your dashboard using your Manus account</li>
      <li>Create and manage client cases</li>
      <li>Document FCRA violations with supporting evidence</li>
      <li>Track your litigation pipeline</li>
      <li>Upload case files and documentation</li>
      <li>Collaborate with attorneys on case preparation</li>
    </ul>

    <p style="margin-top: 30px;">
      <a href="${APP_DOMAIN}/dashboard" class="button">
        Access Your Dashboard
      </a>
    </p>

    <div class="info-box">
      <p style="margin: 0;"><strong>Need Help?</strong> If you have any questions about using the platform or submitting cases for litigation, please don't hesitate to reach out to our support team.</p>
    </div>

    <p>We're excited to have you as a partner and look forward to helping you turn disputes into victories!</p>
    
    <p style="margin-top: 30px;">Best regards,<br><strong>The ${BRAND_NAME} Team</strong></p>
  `;

  return {
    subject: `Dispute2Suit - Welcome! Your Partner Application is Approved`,
    html: getEmailTemplate(content),
  };
}

/**
 * Email template for partner rejection (sent to partner)
 */
export function getPartnerRejectionEmail(partner: {
  name: string;
  companyName: string;
  reason?: string;
}): { subject: string; html: string } {
  const content = `
    <h1>Partner Application Status</h1>
    <p>Dear ${partner.name},</p>
    
    <p>Thank you for your interest in becoming a partner with ${BRAND_NAME}.</p>

    <div class="warning-box">
      <p style="margin: 0;">After careful review, we are unable to approve your partner application for <strong>${partner.companyName}</strong> at this time.</p>
    </div>

    ${
      partner.reason
        ? `
    <h2>Reason</h2>
    <p>${partner.reason}</p>
    `
        : ""
    }

    <p>We appreciate your interest in our platform and encourage you to reapply in the future if your circumstances change.</p>

    <p>If you have any questions about this decision, please feel free to contact our support team.</p>
    
    <p style="margin-top: 30px;">Best regards,<br><strong>The ${BRAND_NAME} Team</strong></p>
  `;

  return {
    subject: `Dispute2Suit - Partner Application Status Update`,
    html: getEmailTemplate(content),
  };
}

/**
 * Email template for password reset (sent to user)
 */
export function getPasswordResetEmail(user: {
  name: string;
  resetToken: string;
}): { subject: string; html: string } {
  const resetUrl = `${APP_DOMAIN}/reset-password?token=${user.resetToken}`;

  const content = `
    <h1>🔐 Password Reset Request</h1>
    <p>Dear ${user.name},</p>
    
    <p>We received a request to reset your password for your ${BRAND_NAME} account.</p>

    <div class="info-box">
      <p style="margin: 0;"><strong>Security Notice:</strong> This password reset link is valid for 1 hour and can only be used once.</p>
    </div>

    <p>Click the button below to create a new password:</p>

    <p style="margin-top: 30px;">
      <a href="${resetUrl}" class="button">
        Reset Your Password
      </a>
    </p>

    <p style="color: #6B7280; font-size: 14px; margin-top: 30px;">
      If the button doesn't work, copy and paste this link into your browser:<br>
      <a href="${resetUrl}" style="color: ${BRAND_COLOR}; word-break: break-all;">${resetUrl}</a>
    </p>

    <div class="warning-box">
      <p style="margin: 0;"><strong>Didn't request this?</strong> If you didn't request a password reset, please ignore this email. Your password will remain unchanged.</p>
    </div>

    <p>For security reasons, we recommend using a strong, unique password that you don't use for other accounts.</p>
    
    <p style="margin-top: 30px;">Best regards,<br><strong>The ${BRAND_NAME} Team</strong></p>
  `;

  return {
    subject: `Dispute2Suit - Password Reset Request`,
    html: getEmailTemplate(content),
  };
}

/**
 * Email template for client notification from intake inquiry
 */
export function getIntakeClientNotificationEmail(data: {
  clientFirstName: string;
  croName: string;
  supportEmail?: string;
}): { subject: string; html: string } {
  const content = `
    <h1>Credit Repair Inquiry Submitted on Your Behalf</h1>
    <p>Dear ${data.clientFirstName},</p>

    <div class="info-box">
      <p style="margin: 0;"><strong>${data.croName}</strong> has submitted a credit repair inquiry on your behalf to ${BRAND_NAME}.</p>
    </div>

    <p>Our paralegal team will be reaching out to you shortly to review your case and collect any necessary signatures.</p>

    <h2>What Happens Next?</h2>
    <ul style="line-height: 1.8;">
      <li>A paralegal from our team will contact you to discuss your case</li>
      <li>You may be asked to review and sign certain documents</li>
      <li>Your case will be evaluated for potential legal action</li>
    </ul>

    <p>If you have any questions in the meantime, please contact us at <strong>${data.supportEmail || "steven@goatmezmedia.com"}</strong>.</p>

    <p style="margin-top: 30px;">Best regards,<br><strong>The ${BRAND_NAME} Paralegal Team</strong></p>
  `;

  return {
    subject: `Dispute2Suit - Your Inquiry Has Been Submitted`,
    html: getEmailTemplate(content),
  };
}

/**
 * Email template for CRO notification when intake is accepted
 */
export function getIntakeCroAcceptedEmail(data: {
  croName: string;
  clientName: string;
}): { subject: string; html: string } {
  const content = `
    <h1>Intake Inquiry Accepted</h1>
    <p>Dear ${data.croName},</p>

    <div class="success-box">
      <p style="margin: 0;">Your intake inquiry for <strong>${data.clientName}</strong> has been accepted by our paralegal team.</p>
    </div>

    <p>We will be contacting your client on your behalf to review the case details and collect any necessary signatures.</p>

    <p>You can track the progress of this inquiry and any associated cases in your CRO portal.</p>

    <p style="margin-top: 30px;">
      <a href="${APP_DOMAIN}/cro-portal/inquiries" class="button">
        View My Inquiries
      </a>
    </p>

    <p style="margin-top: 30px;">Best regards,<br><strong>The ${BRAND_NAME} Team</strong></p>
  `;

  return {
    subject: `Dispute2Suit - New Client Inquiry: ${data.clientName}`,
    html: getEmailTemplate(content),
  };
}

/**
 * Email template for CRO account credentials (sent after approval)
 */
export function getCroCredentialsEmail(data: {
  name: string;
  email: string;
  tempPassword: string;
}): { subject: string; html: string } {
  const loginUrl = `${APP_DOMAIN}/login`;

  const content = `
    <h1>Your CRO Account Has Been Created</h1>
    <p>Dear ${data.name},</p>

    <div class="success-box">
      <p style="margin: 0;"><strong>Congratulations!</strong> Your CRO application has been approved and your account is now active.</p>
    </div>

    <p>Use the credentials below to log in to your ${BRAND_NAME} CRO Portal:</p>

    <div class="info-box">
      <p><strong>Email:</strong> ${data.email}</p>
      <p style="margin-bottom: 0;"><strong>Temporary Password:</strong> <code style="background: #fff; padding: 2px 8px; border-radius: 4px; border: 1px solid #ddd; font-family: monospace;">${data.tempPassword}</code></p>
    </div>

    <div class="warning-box">
      <p style="margin: 0;"><strong>Important:</strong> Please change your password immediately after your first login for security purposes.</p>
    </div>

    <p style="margin-top: 30px;">
      <a href="${loginUrl}" class="button">
        Log In to Your Portal
      </a>
    </p>

    <h2>Getting Started</h2>
    <ul style="line-height: 1.8;">
      <li>Log in with the credentials above</li>
      <li>Submit intake inquiries for your clients</li>
      <li>Track case status and updates</li>
      <li>Upload supporting documents</li>
    </ul>

    <p style="margin-top: 30px;">Best regards,<br><strong>The ${BRAND_NAME} Team</strong></p>
  `;

  return {
    subject: `Dispute2Suit - Your CRO Account is Ready`,
    html: getEmailTemplate(content),
  };
}

/**
 * Email template for admin invite token (sent to VIP invitee)
 */
export function getAdminInviteEmail(invite: {
  recipientName: string;
  inviteToken: string;
  expiresAt: Date;
}): { subject: string; html: string } {
  const inviteUrl = `${APP_DOMAIN}/partner-signup?invite=${invite.inviteToken}`;
  const expiryDate = invite.expiresAt.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });

  const content = `
    <h1>🌟 You're Invited to Join ${BRAND_NAME}</h1>
    <p>Dear ${invite.recipientName},</p>
    
    <p>You've been personally invited to join ${BRAND_NAME} as a VIP partner!</p>

    <div class="success-box">
      <p style="margin: 0;"><strong>Exclusive Access:</strong> This invitation grants you priority access to our litigation-ready CRM platform for credit repair professionals.</p>
    </div>

    <h2>Why ${BRAND_NAME}?</h2>
    <ul style="line-height: 1.8;">
      <li>Turn FCRA violations into attorney-backed federal court cases</li>
      <li>Streamlined litigation pipeline management</li>
      <li>Complete case documentation and tracking</li>
      <li>Direct collaboration with partnering attorneys</li>
      <li>Secure document storage and file management</li>
    </ul>

    <p style="margin-top: 30px;">
      <a href="${inviteUrl}" class="button">
        Accept Your Invitation
      </a>
    </p>

    <p style="color: #6B7280; font-size: 14px; margin-top: 30px;">
      If the button doesn't work, copy and paste this link into your browser:<br>
      <a href="${inviteUrl}" style="color: ${BRAND_COLOR}; word-break: break-all;">${inviteUrl}</a>
    </p>

    <div class="info-box">
      <p style="margin: 0;"><strong>Invitation Expires:</strong> ${expiryDate}</p>
    </div>

    <p>This exclusive invitation link can only be used once. Complete your registration to gain immediate access to the platform.</p>
    
    <p style="margin-top: 30px;">We look forward to partnering with you!<br><strong>The ${BRAND_NAME} Team</strong></p>
  `;

  return {
    subject: `Dispute2Suit - Exclusive Partner Invitation`,
    html: getEmailTemplate(content),
  };
}

/**
 * Email template for CRO notification when a client posts a comment on their case
 */
export function getClientCommentCroNotificationEmail(data: {
  croName: string;
  clientName: string;
  caseTitle: string;
  caseId: number;
  commentPreview: string;
}): { subject: string; html: string } {
  const caseUrl = `${APP_DOMAIN}/cro-portal/cases/${data.caseId}`;

  const content = `
    <h1>New Client Comment</h1>
    <p>Dear ${data.croName},</p>

    <div class="info-box">
      <p style="margin: 0;"><strong>${data.clientName}</strong> has posted a new comment on case <strong>"${data.caseTitle}"</strong> (Case #${data.caseId}).</p>
    </div>

    <h2>Comment Preview</h2>
    <div style="background-color: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 8px; padding: 16px; margin: 16px 0;">
      <p style="margin: 0; color: #374151; font-style: italic;">"${data.commentPreview}"</p>
    </div>

    <p>Log in to your CRO Portal to view and respond to this comment.</p>

    <p style="margin-top: 30px;">
      <a href="${caseUrl}" class="button">
        View Case
      </a>
    </p>

    <p style="margin-top: 30px;">Best regards,<br><strong>The ${BRAND_NAME} Team</strong></p>
  `;

  return {
    subject: `Dispute2Suit - New Client Comment on Case #${data.caseId}: ${data.caseTitle}`,
    html: getEmailTemplate(content),
  };
}

/**
 * Email template for CRO notification when case status is changed by paralegal/admin
 */
export function getCaseStatusChangeCroNotificationEmail(data: {
  croName: string;
  caseTitle: string;
  caseId: number;
  oldStatus: string;
  newStatus: string;
  changedByName: string;
}): { subject: string; html: string } {
  const caseUrl = `${APP_DOMAIN}/cro-portal/cases/${data.caseId}`;

  const statusLabels: Record<string, string> = {
    new: "New",
    pending_review: "Pending Review",
    in_review: "In Review",
    more_info_needed: "More Information Needed",
    ready_for_attorney: "Ready for Attorney",
    sent_to_attorney: "Sent to Attorney",
    accepted_by_attorney: "Accepted by Attorney",
    rejected: "Rejected",
    settled: "Settled",
    settlement_paid_out: "Settlement Paid Out",
    closed: "Closed",
  };

  const fromLabel = statusLabels[data.oldStatus] || data.oldStatus;
  const toLabel = statusLabels[data.newStatus] || data.newStatus;

  const content = `
    <h1>Case Status Updated</h1>
    <p>Dear ${data.croName},</p>

    <div class="info-box">
      <p style="margin: 0;">The status of case <strong>"${data.caseTitle}"</strong> (Case #${data.caseId}) has been updated.</p>
    </div>

    <div style="background-color: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 8px; padding: 16px; margin: 16px 0;">
      <p style="margin: 0 0 8px 0;"><strong>Previous Status:</strong> ${fromLabel}</p>
      <p style="margin: 0 0 8px 0;"><strong>New Status:</strong> ${toLabel}</p>
      <p style="margin: 0;"><strong>Updated By:</strong> ${data.changedByName}</p>
    </div>

    <p>Log in to your CRO Portal to review the case details.</p>

    <p style="margin-top: 30px;">
      <a href="${caseUrl}" class="button">
        View Case
      </a>
    </p>

    <p style="margin-top: 30px;">Best regards,<br><strong>The ${BRAND_NAME} Team</strong></p>
  `;

  return {
    subject: `Dispute2Suit - Case #${data.caseId} Status Changed to ${toLabel}`,
    html: getEmailTemplate(content),
  };
}

/**
 * Email template for client portal credentials (sent when a new client account is created during case creation)
 */
export function getClientCredentialsEmail(data: {
  name: string;
  email: string;
  tempPassword: string;
}): { subject: string; html: string } {
  const loginUrl = `${APP_DOMAIN}/login`;

  const content = `
    <h1>Your Client Portal Account Has Been Created</h1>
    <p>Dear ${data.name},</p>

    <div class="success-box">
      <p style="margin: 0;"><strong>Welcome!</strong> A client portal account has been created for you on ${BRAND_NAME}.</p>
    </div>

    <p>Use the credentials below to log in and track your case progress:</p>

    <div class="info-box">
      <p><strong>Email / Username:</strong> ${data.email}</p>
      <p style="margin-bottom: 0;"><strong>Temporary Password:</strong> <code style="background: #fff; padding: 2px 8px; border-radius: 4px; border: 1px solid #ddd; font-family: monospace;">${data.tempPassword}</code></p>
    </div>

    <div class="warning-box">
      <p style="margin: 0;"><strong>Important:</strong> Please change your password immediately after your first login for security purposes.</p>
    </div>

    <p style="margin-top: 30px;">
      <a href="${loginUrl}" class="button">
        Log In to Your Portal
      </a>
    </p>

    <h2>What You Can Do</h2>
    <ul style="line-height: 1.8;">
      <li>View your case status and updates</li>
      <li>Upload supporting documents</li>
      <li>Communicate with your assigned representative</li>
      <li>Track your case progress in real-time</li>
    </ul>

    <p style="margin-top: 30px;">Best regards,<br><strong>The ${BRAND_NAME} Team</strong></p>
  `;

  return {
    subject: `Dispute2Suit - Your Client Portal Account is Ready`,
    html: getEmailTemplate(content),
  };
}

/**
 * Email template for AOC signature required notification (sent only once when client's first case is created)
 */
export function getAOCSignatureRequiredEmail(data: {
  clientName: string;
}): { subject: string; html: string } {
  const loginUrl = `${APP_DOMAIN}/login`;

  const content = `
    <h1>Action Required: Sign Your Assignment of Claim</h1>
    <p>Dear ${data.clientName},</p>

    <div class="warning-box">
      <p style="margin: 0;"><strong>Important:</strong> Before we can proceed with your case, you must sign the Assignment of Claim (AOC) document.</p>
    </div>

    <p>The Assignment of Claim is a one-time legal document that authorizes ${BRAND_NAME} to act on your behalf. Once signed, it will apply to all your current and future cases — you will not need to sign it again.</p>

    <h2>How to Sign</h2>
    <ol style="line-height: 1.8;">
      <li>Log in to your client portal</li>
      <li>You will see a prompt to sign the AOC on your dashboard</li>
      <li>Draw or upload your signature to complete the process</li>
    </ol>

    <p style="margin-top: 30px;">
      <a href="${loginUrl}" class="button">
        Sign Your AOC Now
      </a>
    </p>

    <div class="info-box">
      <p style="margin: 0;">This is a one-time requirement. Once signed, the AOC will automatically apply to all your cases.</p>
    </div>

    <p style="margin-top: 30px;">Best regards,<br><strong>The ${BRAND_NAME} Paralegal Team</strong></p>
  `;

  return {
    subject: `Dispute2Suit - Action Required: Sign Your Assignment of Claim`,
    html: getEmailTemplate(content),
  };
}
