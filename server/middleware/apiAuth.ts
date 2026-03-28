import { Request, Response, NextFunction } from "express";
import bcrypt from "bcryptjs";
import { getApiKeysByPrefix, updateApiKeyLastUsed, getPartnerById } from "../db";
import { checkRateLimit, getClientIp } from "../rateLimit";
import type { ApiKey } from "../../drizzle/schema";
import type { Partner } from "../../drizzle/schema";

// Extend Express Request to include API auth context
declare global {
  namespace Express {
    interface Request {
      apiKey?: ApiKey;
      apiPartner?: Partner;
    }
  }
}

const API_KEY_PREFIX = "d2s_";

/**
 * Express middleware that validates API key from Authorization header.
 * Sets req.apiKey and req.apiPartner for downstream route handlers.
 */
export async function apiKeyAuth(req: Request, res: Response, next: NextFunction) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({
        success: false,
        error: "Missing or invalid Authorization header. Use: Bearer <api_key>",
      });
    }

    const rawKey = authHeader.slice(7).trim();
    if (!rawKey.startsWith(API_KEY_PREFIX)) {
      return res.status(401).json({
        success: false,
        error: "Invalid API key format.",
      });
    }

    // Extract the prefix used for DB lookup (first 12 chars: "d2s_" + 8 random chars)
    const keyPrefix = rawKey.slice(0, 12);

    // Rate limit check by API key prefix
    const ip = getClientIp(req);
    const isLimited = await checkRateLimit(keyPrefix, "api_v1");
    if (isLimited) {
      return res.status(429).json({
        success: false,
        error: "Rate limit exceeded. Please try again later.",
      });
    }

    // Look up candidate keys by prefix
    const candidates = await getApiKeysByPrefix(keyPrefix);
    if (candidates.length === 0) {
      return res.status(401).json({
        success: false,
        error: "Invalid API key.",
      });
    }

    // Verify the full key against stored hashes
    let matchedKey: ApiKey | null = null;
    for (const candidate of candidates) {
      const isMatch = await bcrypt.compare(rawKey, candidate.keyHash);
      if (isMatch) {
        matchedKey = candidate;
        break;
      }
    }

    if (!matchedKey) {
      return res.status(401).json({
        success: false,
        error: "Invalid API key.",
      });
    }

    // Check if key is active
    if (!matchedKey.isActive) {
      return res.status(403).json({
        success: false,
        error: "API key has been revoked.",
      });
    }

    // Check expiration
    if (matchedKey.expiresAt && new Date(matchedKey.expiresAt) < new Date()) {
      return res.status(403).json({
        success: false,
        error: "API key has expired.",
      });
    }

    // Load the partner for data scoping
    const partner = await getPartnerById(matchedKey.partnerId);
    if (!partner) {
      return res.status(403).json({
        success: false,
        error: "Partner account not found.",
      });
    }

    // Attach to request
    req.apiKey = matchedKey;
    req.apiPartner = partner;

    // Update last used timestamp (fire and forget)
    updateApiKeyLastUsed(matchedKey.id).catch(() => {});

    next();
  } catch (error) {
    console.error("[API Auth] Error:", error);
    return res.status(500).json({
      success: false,
      error: "Internal server error.",
    });
  }
}

/**
 * Middleware to check if the API key has a specific permission scope.
 */
export function requirePermission(scope: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.apiKey) {
      return res.status(401).json({ success: false, error: "Not authenticated." });
    }

    // If no permissions set, allow all (backward-compatible default)
    if (!req.apiKey.permissions) {
      return next();
    }

    try {
      const permissions: string[] = JSON.parse(req.apiKey.permissions);
      if (permissions.includes("*") || permissions.includes(scope)) {
        return next();
      }
    } catch {
      // Invalid JSON in permissions — treat as no permissions
    }

    return res.status(403).json({
      success: false,
      error: `Insufficient permissions. Required: ${scope}`,
    });
  };
}
