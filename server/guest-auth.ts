import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { db } from "./db";
import { guestTokens } from "@shared/schema";
import { eq } from "drizzle-orm";

// Extend Express Request to include guest user info
declare global {
  namespace Express {
    interface Request {
      guestUser?: {
        tokenId: string;
        scopes: {
          despacho?: string[];
          inventario?: string[];
        };
      };
    }
  }
}

const JWT_SECRET = process.env.JWT_SECRET || "boxisleep-guest-token-secret-2024";

interface GuestTokenPayload {
  tokenId: string;
  scopes: {
    despacho?: string[];
    inventario?: string[];
  };
}

/**
 * Middleware to validate guest tokens
 * Accepts either session auth OR valid guest token
 */
export const validateGuestToken = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // If user is already authenticated via session, allow access
    if (req.session?.user?.isAuthenticated) {
      return next();
    }

    // Check for guest token in Authorization header
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No authentication provided" });
    }

    const token = authHeader.substring(7); // Remove "Bearer " prefix

    // Verify JWT signature and decode payload
    let payload: GuestTokenPayload;
    try {
      payload = jwt.verify(token, JWT_SECRET) as GuestTokenPayload;
    } catch (error) {
      return res.status(401).json({ error: "Invalid or expired token" });
    }

    // Check if token exists in database and is not revoked
    const [tokenRecord] = await db
      .select()
      .from(guestTokens)
      .where(eq(guestTokens.id, payload.tokenId))
      .limit(1);

    if (!tokenRecord) {
      return res.status(401).json({ error: "Token not found" });
    }

    if (tokenRecord.isRevoked) {
      return res.status(401).json({ error: "Token has been revoked" });
    }

    // Check expiry if set
    if (tokenRecord.expiresAt && new Date(tokenRecord.expiresAt) < new Date()) {
      return res.status(401).json({ error: "Token has expired" });
    }

    // Attach guest user info to request
    req.guestUser = {
      tokenId: payload.tokenId,
      scopes: payload.scopes,
    };

    next();
  } catch (error) {
    console.error("Guest token validation error:", error);
    res.status(500).json({ error: "Authentication error" });
  }
};

/**
 * Middleware to check if guest has specific scope permission
 */
export const requireGuestScope = (section: "despacho" | "inventario", field?: string) => {
  return (req: Request, res: Response, next: NextFunction) => {
    // If authenticated user, allow all access
    if (req.session?.user?.isAuthenticated) {
      return next();
    }

    // Check guest user permissions
    if (!req.guestUser) {
      return res.status(403).json({ error: "Access denied" });
    }

    const scopes = req.guestUser.scopes[section];
    if (!scopes) {
      return res.status(403).json({ error: `No access to ${section}` });
    }

    // If field is specified, check if it's allowed
    if (field) {
      // "full" scope means all fields are allowed
      if (scopes.includes("full") || scopes.includes(field)) {
        return next();
      }
      return res.status(403).json({ 
        error: `Not allowed to modify field: ${field}` 
      });
    }

    // No specific field required, just need section access
    next();
  };
};

/**
 * Generate a new guest token
 */
export const generateGuestToken = (
  tokenId: string,
  scopes: { despacho?: string[]; inventario?: string[] }
): string => {
  const payload: GuestTokenPayload = {
    tokenId,
    scopes,
  };

  // Sign token (no expiry in JWT since we check DB expiry)
  return jwt.sign(payload, JWT_SECRET);
};
