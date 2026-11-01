import type { Request, Response, NextFunction } from "express";
import type { Role } from "@shared/constants/roles.js";

// Deve ser usado depois do isAuthenticated, que preenche req.user.
const hasRole = (...allowedRoles: Role[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: "Acesso negado" });
    }

    return next();
  };
};

const isAdmin = hasRole("ADMIN");

export { hasRole, isAdmin };
