import { Request, Response, NextFunction } from "express";
import { storage } from "./storage";

// Middleware to check if the user is an admin
export async function isAdmin(req: any, res: Response, next: NextFunction) {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Not authenticated" });
  }

  try {
    const userId = req.user.claims.sub;
    const user = await storage.getUser(userId);
    
    if (!user || !user.isAdmin) {
      return res.status(403).json({ error: "Admin access required" });
    }

    next();
  } catch (error) {
    return res.status(500).json({ error: "Failed to verify admin status" });
  }
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
