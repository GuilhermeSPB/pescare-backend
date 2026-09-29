import type { Request, Response, NextFunction } from "express";

const hasRole = (...allowedRoles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user || !allowedRoles.includes(req.user.role)) {
      return res.status(403).json({ message: "Acesso negado" });
    }

    return next();
  };
};

export { hasRole };
