/**
 * External links router: manages external storage links (Google Drive, etc.) per case.
 * Single Responsibility: Only handles external link CRUD.
 */
import { router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { teamProcedure } from "../middleware/procedures";
import {
  addExternalLink,
  getExternalLinkById,
  listExternalLinksByCaseId,
  updateExternalLink,
  deleteExternalLink,
  createActivityLog,
} from "../db";

export const externalLinksRouter = router({
  add: teamProcedure
    .input(z.object({
      caseId: z.number(),
      label: z.string().min(1).max(255),
      url: z.string().url(),
    }))
    .mutation(async ({ input, ctx }) => {
      const link = await addExternalLink({
        caseId: input.caseId,
        label: input.label,
        url: input.url,
        createdBy: ctx.user.id,
      });
      
      await createActivityLog({
        userId: ctx.user.id,
        caseId: input.caseId,
        action: "external_link_added",
        description: `External link added: ${input.label}`,
      });
      
      return link;
    }),

  list: teamProcedure
    .input(z.object({ caseId: z.number() }))
    .query(async ({ input }) => {
      return await listExternalLinksByCaseId(input.caseId);
    }),

  update: teamProcedure
    .input(z.object({
      id: z.number(),
      label: z.string().min(1).max(255).optional(),
      url: z.string().url().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { id, ...updates } = input;
      const link = await updateExternalLink(id, updates);
      
      if (link) {
        await createActivityLog({
          userId: ctx.user.id,
          caseId: link.caseId,
          action: "external_link_updated",
          description: `External link updated: ${link.label}`,
        });
      }
      
      return link;
    }),

  delete: teamProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      const link = await getExternalLinkById(input.id);
      if (!link) {
        throw new TRPCError({ code: "NOT_FOUND", message: "External link not found" });
      }
      
      await deleteExternalLink(input.id);
      
      await createActivityLog({
        userId: ctx.user.id,
        caseId: link.caseId,
        action: "external_link_deleted",
        description: `External link deleted: ${link.label}`,
      });
      
      return { success: true };
    }),
});
