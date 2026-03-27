/**
 * Notifications router: manages in-app notification operations.
 * Single Responsibility: Only handles notification CRUD.
 */
import { protectedProcedure } from "../_core/trpc";
import { router } from "../_core/trpc";
import { z } from "zod";
import {
  getNotificationsByUserId,
  getUnreadNotificationCount,
  markNotificationRead,
  markAllNotificationsRead,
} from "../db";

export const notificationsRouter = router({
  list: protectedProcedure
    .input(z.object({ limit: z.number().default(50) }))
    .query(async ({ input, ctx }) => {
      return await getNotificationsByUserId(ctx.user.id, input.limit);
    }),

  unreadCount: protectedProcedure.query(async ({ ctx }) => {
    return await getUnreadNotificationCount(ctx.user.id);
  }),

  markRead: protectedProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input }) => {
      await markNotificationRead(input.id);
      return { success: true };
    }),

  markAllRead: protectedProcedure.mutation(async ({ ctx }) => {
    await markAllNotificationsRead(ctx.user.id);
    return { success: true };
  }),
});
