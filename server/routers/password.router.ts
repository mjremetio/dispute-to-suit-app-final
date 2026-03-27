/**
 * Password router: handles password reset flows.
 * Single Responsibility: Only manages password reset token creation and usage.
 */
import { publicProcedure, protectedProcedure } from "../_core/trpc";
import { router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import {
  getUserByEmail,
  createPasswordResetToken,
  getPasswordResetToken,
  markTokenAsUsed,
  updateUser,
  createActivityLog,
} from "../db";
import { enforceRateLimit, getClientIp } from "../rateLimit";
import { sendPasswordResetEmail } from "../email";

export const passwordRouter = router({
  forgot: publicProcedure
    .input(z.object({
      email: z.string().email(),
      origin: z.string(),
    }))
    .mutation(async ({ input, ctx }) => {
      const clientIp = getClientIp(ctx.req);
      await enforceRateLimit(clientIp, "forgot_password");

      const user = await getUserByEmail(input.email);

      if (user && user.isActive) {
        const resetToken = nanoid(32);
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

        await createPasswordResetToken({
          userId: user.id,
          token: resetToken,
          expiresAt,
        });

        try {
          await sendPasswordResetEmail(input.email, resetToken, input.origin);
        } catch (_) {
          // Silently fail - don't reveal to user
        }
      }

      await createActivityLog({
        action: "password_reset_requested",
        description: `Password reset requested for: ${input.email}`,
        ipAddress: clientIp,
      });

      return { success: true };
    }),

  reset: publicProcedure
    .input(z.object({
      token: z.string(),
      newPassword: z.string().min(6),
    }))
    .mutation(async ({ input, ctx }) => {
      const clientIp = getClientIp(ctx.req);
      await enforceRateLimit(clientIp, "reset_password");

      const tokenData = await getPasswordResetToken(input.token);

      if (!tokenData) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Invalid or expired reset token"
        });
      }

      await markTokenAsUsed(tokenData.id);

      const hashedPassword = await bcrypt.hash(input.newPassword, 10);
      await updateUser(tokenData.userId, { passwordHash: hashedPassword });

      await createActivityLog({
        userId: tokenData.userId,
        action: "password_reset_completed",
        description: "Password successfully reset",
        ipAddress: clientIp,
      });

      return { success: true };
    }),

  change: protectedProcedure
    .input(z.object({
      newPassword: z.string().min(6),
    }))
    .mutation(async ({ input, ctx }) => {
      const hashedPassword = await bcrypt.hash(input.newPassword, 10);
      await updateUser(ctx.user.id, {
        passwordHash: hashedPassword,
        mustChangePassword: false,
      });

      await createActivityLog({
        userId: ctx.user.id,
        action: "password_changed",
        description: "Password changed after first login",
      });

      return { success: true };
    }),
});
