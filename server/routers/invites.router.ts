/**
 * Invites router: admin invite token management.
 * Single Responsibility: CRUD for invite tokens.
 */
import { publicProcedure } from "../_core/trpc";
import { router } from "../_core/trpc";
import { z } from "zod";
import { nanoid } from "nanoid";
import { adminProcedure } from "../middleware/procedures";
import {
  createInviteToken,
  getInviteToken,
  getAllInviteTokens,
  createActivityLog,
} from "../db";
import { sendInviteEmail } from "../email";

export const invitesRouter = router({
  create: adminProcedure
    .input(z.object({
      email: z.string().email().optional(),
      role: z.enum(["user", "admin", "cro", "paralegal"]).default("user"),
      maxUses: z.number().default(1),
      expiresAt: z.date().optional(),
      origin: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const token = nanoid(32);

      const tokenId = await createInviteToken({
        token,
        email: input.email,
        role: input.role,
        maxUses: input.maxUses,
        expiresAt: input.expiresAt,
        createdBy: ctx.user.id,
      });

      if (input.email && input.expiresAt) {
        await sendInviteEmail(
          input.email,
          input.email.split('@')[0],
          token,
          input.expiresAt
        );
      }

      await createActivityLog({
        userId: ctx.user.id,
        action: "invite_created",
        description: `Invite token created for: ${input.email || "general use"}`,
      });

      return { success: true, token, tokenId };
    }),

  list: adminProcedure.query(async () => {
    return await getAllInviteTokens();
  }),

  validate: publicProcedure
    .input(z.object({ token: z.string() }))
    .query(async ({ input }) => {
      const tokenData = await getInviteToken(input.token);

      if (!tokenData) {
        return { valid: false };
      }

      if (tokenData.expiresAt && tokenData.expiresAt < new Date()) {
        return { valid: false };
      }

      if ((tokenData.usedCount || 0) >= (tokenData.maxUses || 1)) {
        return { valid: false };
      }

      return { valid: true, role: tokenData.role };
    }),
});
