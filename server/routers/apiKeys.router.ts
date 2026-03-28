import { z } from "zod";
import { nanoid } from "nanoid";
import bcrypt from "bcryptjs";
import { router } from "../_core/trpc";
import { adminProcedure } from "../middleware/procedures";
import {
  createApiKey,
  getAllApiKeys,
  getApiKeyById,
  updateApiKey,
  deleteApiKey,
  createActivityLog,
} from "../db";

const API_KEY_PREFIX = "d2s_";

export const apiKeysRouter = router({
  /** Create a new API key — returns the plaintext key ONCE */
  create: adminProcedure
    .input(z.object({
      partnerId: z.number(),
      name: z.string().min(1).max(255),
      permissions: z.array(z.string()).optional(),
      expiresAt: z.string().datetime().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      // Generate a secure random key: d2s_ + 40 random chars
      const randomPart = nanoid(40);
      const rawKey = `${API_KEY_PREFIX}${randomPart}`;
      const keyPrefix = rawKey.slice(0, 12);

      // Hash the full key for storage
      const keyHash = await bcrypt.hash(rawKey, 10);

      const id = await createApiKey({
        partnerId: input.partnerId,
        keyHash,
        keyPrefix,
        name: input.name,
        permissions: input.permissions ? JSON.stringify(input.permissions) : null,
        expiresAt: input.expiresAt ? new Date(input.expiresAt) : null,
        createdBy: ctx.user.id,
      });

      await createActivityLog({
        userId: ctx.user.id,
        action: "api_key_created",
        description: `API key "${input.name}" created for partner ${input.partnerId}`,
        metadata: JSON.stringify({ apiKeyId: id, partnerId: input.partnerId }),
      });

      return {
        id,
        key: rawKey, // Only returned once — cannot be retrieved again
        keyPrefix,
        name: input.name,
        partnerId: input.partnerId,
        message: "Store this API key securely. It will not be shown again.",
      };
    }),

  /** List all API keys (without hashes) */
  list: adminProcedure.query(async () => {
    const keys = await getAllApiKeys();
    return keys.map(({ keyHash, ...k }) => ({
      ...k,
      permissions: k.permissions ? JSON.parse(k.permissions) : null,
    }));
  }),

  /** Revoke (deactivate) an API key */
  revoke: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const key = await getApiKeyById(input.id);
      if (!key) {
        throw new Error("API key not found");
      }

      await updateApiKey(input.id, { isActive: false });

      await createActivityLog({
        userId: ctx.user.id,
        action: "api_key_revoked",
        description: `API key "${key.name}" (${key.keyPrefix}...) revoked`,
        metadata: JSON.stringify({ apiKeyId: input.id }),
      });

      return { success: true };
    }),

  /** Reactivate a revoked API key */
  activate: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const key = await getApiKeyById(input.id);
      if (!key) {
        throw new Error("API key not found");
      }

      await updateApiKey(input.id, { isActive: true });

      await createActivityLog({
        userId: ctx.user.id,
        action: "api_key_activated",
        description: `API key "${key.name}" (${key.keyPrefix}...) reactivated`,
        metadata: JSON.stringify({ apiKeyId: input.id }),
      });

      return { success: true };
    }),

  /** Permanently delete an API key */
  delete: adminProcedure
    .input(z.object({ id: z.number() }))
    .mutation(async ({ ctx, input }) => {
      const key = await getApiKeyById(input.id);
      if (!key) {
        throw new Error("API key not found");
      }

      await deleteApiKey(input.id);

      await createActivityLog({
        userId: ctx.user.id,
        action: "api_key_deleted",
        description: `API key "${key.name}" (${key.keyPrefix}...) permanently deleted`,
        metadata: JSON.stringify({ apiKeyId: input.id }),
      });

      return { success: true };
    }),
});
