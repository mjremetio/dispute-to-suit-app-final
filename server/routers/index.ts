/**
 * Router index: re-exports all domain-specific routers.
 * This serves as the composition root for tRPC router modules.
 */
export { authRouter } from "./auth.router";
export { passwordRouter } from "./password.router";
export { invitesRouter } from "./invites.router";
export { usersRouter } from "./users.router";
export { activityRouter } from "./activity.router";
export { notificationsRouter } from "./notifications.router";
export { signatureTemplatesRouter } from "./signatureTemplates.router";
export { externalLinksRouter } from "./externalLinks.router";
