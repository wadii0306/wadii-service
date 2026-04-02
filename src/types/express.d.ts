import "express";
declare module "express-serve-static-core" {
  interface Request {
    user?: {
      userId: string;
      email?: string;
      role?: string;
      iat?: number;
      exp?: number;
    };
    userRole: {
      role: "developer" | "owner" | "manager" | "admin" | "marketing";
      permissions?: string[] | undefined;
    };
  }
}
