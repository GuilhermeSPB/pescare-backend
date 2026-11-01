import jwt from "jsonwebtoken";
import type { Request, Response, NextFunction } from "express";
import { env } from "@core/env.js";
import { prisma } from "@core/prisma.js";
import type { Role } from "@shared/constants/roles.js";

interface TokenPayload {
  sub: string;
}

interface AuthUser {
  id: number;
  role: Role;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthUser;
    }
  }
}

const isAuthenticated = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const authToken = req.headers.authorization;

  if (!authToken) {
    return res.status(401).json({ message: "Token não informado" });
  }

  const [scheme, token] = authToken.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ message: "Token não informado" });
  }

  let payload: TokenPayload;

  try {
    payload = jwt.verify(token, env.JWT_SECRET) as TokenPayload;
  } catch {
    return res.status(401).json({ message: "Token inválido" });
  }

  // Busca o usuario a cada requisicao (consulta por PK, barata) pra que
  // desativar um usuario ou trocar a role tenha efeito imediato, sem
  // esperar o token expirar.
  const user = await prisma.users.findUnique({
    where: { id: Number(payload.sub) },
    select: { id: true, role: true, is_active: true },
  });

  if (!user || !user.is_active) {
    return res.status(401).json({ message: "Usuário inativo ou inexistente" });
  }

  req.user = { id: user.id, role: user.role as Role };

  return next();
};

export { isAuthenticated };
