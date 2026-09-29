import type { Request, Response } from "express";
import { ZodError } from "zod";
import { AppError } from "@shared/errors/app-error.js";
import { authServices } from "./auth.services.js";

function handleError(error: unknown, res: Response) {
  if (error instanceof ZodError) {
    return res
      .status(400)
      .json({ message: "Dados inválidos", issues: error.issues });
  }

  if (error instanceof AppError) {
    return res.status(error.statusCode).json({ message: error.message });
  }

  console.error(error);
  return res.status(500).json({ message: "Erro interno do servidor" });
}

export const authController = {
  signUp: async (req: Request, res: Response) => {
    try {
      const user = await authServices.signUp(req.body);
      res.status(201).json(user);
    } catch (error) {
      handleError(error, res);
    }
  },
  signIn: async (req: Request, res: Response) => {
    try {
      const result = await authServices.signIn(req.body);
      res.json(result);
    } catch (error) {
      handleError(error, res);
    }
  },
};
