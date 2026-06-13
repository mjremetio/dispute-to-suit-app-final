import { z } from "zod";
import { notifyOwner } from "./notification";
import { adminProcedure, protectedProcedure, publicProcedure, router } from "./trpc";
import { getUserById, updateUser } from "../db";

export const systemRouter = router({
  health: publicProcedure
    .input(
      z.object({
        timestamp: z.number().min(0, "timestamp cannot be negative"),
      })
    )
    .query(() => ({
      ok: true,
    })),

  /** Returns which tours the current user has already seen */
  getTourStatus: protectedProcedure
    .query(async ({ ctx }) => {
      const user = await getUserById(ctx.user.id);
      return {
        tourSeenCro: user?.tourSeenCro ?? false,
        tourSeenClient: user?.tourSeenClient ?? false,
      };
    }),

  /** Mark a portal tour as seen so it doesn't auto-trigger again */
  markTourSeen: protectedProcedure
    .input(z.object({
      portal: z.enum(["cro", "client"]),
    }))
    .mutation(async ({ input, ctx }) => {
      const updates = input.portal === "cro"
        ? { tourSeenCro: true as const }
        : { tourSeenClient: true as const };
      await updateUser(ctx.user.id, updates);
      return { success: true };
    }),

  notifyOwner: adminProcedure
    .input(
      z.object({
        title: z.string().min(1, "title is required"),
        content: z.string().min(1, "content is required"),
      })
    )
    .mutation(async ({ input }) => {
      const delivered = await notifyOwner(input);
      return {
        success: delivered,
      } as const;
    }),
});
