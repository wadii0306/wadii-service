import { Request, Response, NextFunction } from "express";
import { JWTUtils } from "../utils/jwt";

export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  try {
    console.log('[AUTH] Auth middleware called for:', req.path);
    const authHeader = req.headers.authorization ?? "";
    console.log('[AUTH] Auth header:', authHeader ? 'Present' : 'Missing');

    // Strictly accept "Bearer <token>"
    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    if (!match) {
      console.log('[AUTH] No Bearer token found');
      res
        .status(401)
        .json({ success: false, message: "Access denied. No/invalid token." });
      return;
    }

    const token = match[1].trim();
    if (!token) {
      console.log('[AUTH] Empty token');
      res.status(401).json({
        success: false,
        message: "Access denied. Invalid token format.",
      });
      return;
    }

    const decoded = JWTUtils.verifyToken(token); // typed as IJWTPayload
    console.log('[AUTH] Decoded token:', { userId: decoded.userId, email: decoded.email, role: decoded.role });

    if (!decoded || typeof decoded.userId !== "string") {
      console.log('[AUTH] Invalid token payload');
      res
        .status(401)
        .json({ success: false, message: "Invalid token payload." });
      return;
    }

    req.user = decoded;
    console.log('[AUTH] User set in req:', req.user);
    next();
  } catch (error: any) {
    console.log('[AUTH] Error:', error.message);
    if (error?.name === "TokenExpiredError") {
      res.status(401).json({ success: false, message: "Token expired." });
      return;
    }
    if (error?.name === "JsonWebTokenError") {
      res.status(401).json({ success: false, message: "Invalid token." });
      return;
    }
    res
      .status(500)
      .json({ success: false, message: "Token verification failed." });
  }
}
