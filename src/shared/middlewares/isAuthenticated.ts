import jwt from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";
import { env } from "@core/env.js";

interface TokenPayload {
  sub: string;
  role: string;
}

declare global {
  namespace Express {
    interface Request {
      user?: TokenPayload;
    }
  }
}

const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
  const authToken = req.headers.authorization;

  if (!authToken) {
    return res.status(401).json({ message: "Token não informado" });
  }

  const [, token] = authToken.split(" ");

  if (!token) {
    return res.status(401).json({ message: "Token não informado" });
  }

  try {
    const payload = jwt.verify(token, env.JWT_SECRET) as TokenPayload;

    req.user = payload;

    return next();
  } catch (error) {
    return res.status(401).json({ message: "Token inválido" });
  }
};

export { isAuthenticated };
