/**
 * Users router: admin-only user management.
 * Single Responsibility: CRUD operations for user accounts.
 */
import { router } from "../_core/trpc";
import { TRPCError } from "@trpc/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { nanoid } from "nanoid";
import { adminProcedure } from "../middleware/procedures";
import {
  getAllUsers,
  getUserById,
  getUserByEmail,
  updateUser,
  deleteUser,
  createActivityLog,
  getActivityLogsByUserId,
} from "../db";

export const usersRouter = router({
  list: adminProcedure.query(async () => {
    return await getAllUsers();
  }),

  getById: adminProcedure
    .input(z.object({ id: z.number() }))
    .query(async ({ input }) => {
      const user = await getUserById(input.id);
      if (!user) {
        throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      }
      return user;
    }),

  create: adminProcedure
    .input(z.object({
      name: z.string().min(1, "Name is required"),
      email: z.string().email("Valid email is required"),
      password: z.string().min(8, "Password must be at least 8 characters"),
      role: z.enum(["user", "admin", "cro", "paralegal"]),
      isActive: z.boolean().default(true),
    }))
    .mutation(async ({ input, ctx }) => {
      const existing = await getUserByEmail(input.email);
      if (existing) {
        throw new TRPCError({ code: "CONFLICT", message: "A user with this email already exists" });
      }

      const passwordHash = await bcrypt.hash(input.password, 10);
      const openId = nanoid(16);

      const { upsertUser } = await import("../db");
      await upsertUser({
        openId,
        name: input.name,
        email: input.email,
        role: input.role,
        passwordHash,
        isActive: input.isActive,
      });

      const newUser = await getUserByEmail(input.email);

      await createActivityLog({
        userId: ctx.user.id,
        action: "user_created",
        description: `User created: ${input.name} (${input.email}) with role ${input.role}`,
      });

      return { success: true, userId: newUser?.id };
    }),

  update: adminProcedure
    .input(z.object({
      id: z.number(),
      name: z.string().optional(),
      email: z.string().email().optional(),
      role: z.enum(["user", "admin", "cro", "paralegal"]).optional(),
      trialDays: z.number().optional(),
      isActive: z.boolean().optional(),
    }))
    .mutation(async ({ input, ctx }) => {
      const { id, ...updates } = input;
      await updateUser(id, updates);

      await createActivityLog({
        userId: ctx.user.id,
        action: "user_updated",
        description: `User updated: ID ${id}`,
        metadata: JSON.stringify(updates),
      });

      return { success: true };
    }),

  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ input, ctx }) => {
      await deleteUser(input.id);

      await createActivityLog({
        userId: ctx.user.id,
        action: "user_deleted",
        description: `User deleted: ID ${input.id}`,
      });

      return { success: true };
    }),

  timeline: adminProcedure
    .input(z.object({ userId: z.number() }))
    .query(async ({ input }) => {
      return await getActivityLogsByUserId(input.userId);
    }),
});
