import { Request, Response, NextFunction } from "express";
import { JWTUtils } from "../utils/jwt";

export function authMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  try {
    const authHeader = req.headers.authorization ?? "";

    // Strictly accept "Bearer <token>"
    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    if (!match) {
      res
        .status(401)
        .json({ success: false, message: "Access denied. No/invalid token." });
      return;
    }

    const token = match[1].trim();
    if (!token) {
      res.status(401).json({
        success: false,
        message: "Access denied. Invalid token format.",
      });
      return;
    }

    const decoded = JWTUtils.verifyToken(token); // typed as IJWTPayload

    if (!decoded || typeof decoded.userId !== "string") {
      res
        .status(401)
        .json({ success: false, message: "Invalid token payload." });
      return;
    }

    req.user = decoded;
    next();
  } catch (error: any) {
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
