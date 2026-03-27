/**
 * Signature templates router: manages reusable signature images.
 * Single Responsibility: Only handles signature template CRUD.
 */
import { protectedProcedure } from "../_core/trpc";
import { router } from "../_core/trpc";
import { z } from "zod";
import {
  createSignatureTemplate,
  getSignatureTemplatesByUserId,
  deleteSignatureTemplate,
} from "../db";

export const signatureTemplatesRouter = router({
  create: protectedProcedure
    .input(z.object({
      name: z.string().min(1).max(255),
      signatureUrl: z.string().url(),
    }))
    .mutation(async ({ input, ctx }) => {
      const template = await createSignatureTemplate({
        userId: ctx.user.id,
        name: input.name,
        signatureUrl: input.signatureUrl,
      });
      return template;
    }),

  list: protectedProcedure
    .query(async ({ ctx }) => {
      return await getSignatureTemplatesByUserId(ctx.user.id);
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await deleteSignatureTemplate(input.id);
      return { success: true };
    }),
});
