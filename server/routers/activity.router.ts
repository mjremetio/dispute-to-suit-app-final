/**
 * Activity router: admin access to activity/audit logs.
 * Single Responsibility: Read-only access to activity logs.
 */
import { router } from "../_core/trpc";
import { z } from "zod";
import { adminProcedure } from "../middleware/procedures";
import { getAllActivityLogs, getActivityLogsByUserId } from "../db";

export const activityRouter = router({
  list: adminProcedure
    .input(z.object({ limit: z.number().default(500) }))
    .query(async ({ input }) => {
      return await getAllActivityLogs(input.limit);
    }),

  byUser: adminProcedure
    .input(z.object({
      userId: z.number(),
      limit: z.number().default(100),
    }))
    .query(async ({ input }) => {
      return await getActivityLogsByUserId(input.userId, input.limit);
    }),
});
