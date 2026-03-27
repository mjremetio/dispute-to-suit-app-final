/**
 * Role-based tRPC procedure definitions.
 * Single Responsibility: Encapsulates authorization logic for each role.
 * Open/Closed: New roles can be added by creating new procedure definitions.
 */
import { protectedProcedure } from "../_core/trpc";
import { TRPCError } from "@trpc/server";

/** Admin-only procedure: restricts access to admin users */
export const adminProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin access required" });
  }
  return next({ ctx });
});

/** CRO-only procedure: restricts access to CRO users */
export const croProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "cro") {
    throw new TRPCError({ code: "FORBIDDEN", message: "CRO access required" });
  }
  return next({ ctx });
});

/** Admin or Paralegal procedure: restricts access to admin and paralegal users */
export const adminParalegalProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "admin" && ctx.user.role !== "paralegal") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Admin or Paralegal access required" });
  }
  return next({ ctx });
});

/** Team procedure: allows access for admin, CRO, and paralegal users */
export const teamProcedure = protectedProcedure.use(({ ctx, next }) => {
  const allowedRoles = ["admin", "cro", "paralegal"];
  if (!allowedRoles.includes(ctx.user.role)) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Team access required" });
  }
  return next({ ctx });
});

/** Client-only procedure: restricts access to client portal users */
export const clientProcedure = protectedProcedure.use(({ ctx, next }) => {
  if (ctx.user.role !== "client") {
    throw new TRPCError({ code: "FORBIDDEN", message: "Client access required" });
  }
  return next({ ctx });
});
