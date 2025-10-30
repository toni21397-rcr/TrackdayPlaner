import { Request, Response, NextFunction } from "express";

// Middleware to check if the user is an admin
export function isAdmin(req: Request, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  const user = req.user as any;
  if (!user.isAdmin) {
    return res.status(403).json({ error: "Admin access required" });
  }

  next();
}

// Helper function to check if user can modify a resource
export function canModifyResource(userId: string | undefined, createdBy: string | null | undefined, isAdmin: boolean): boolean {
  // System resources (createdBy is null) can only be modified by admins
  if (createdBy === null || createdBy === undefined) {
    return isAdmin;
  }
  
  // User-created resources can be modified by the creator or admins
  return userId === createdBy || isAdmin;
}
