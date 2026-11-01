import type { Request, Response } from "express";
import { authServices } from "./auth.services.js";

// Sem try/catch: erros sobem para o errorHandler global (Express 5).
export const authController = {
  signUp: async (req: Request, res: Response) => {
    const user = await authServices.signUp(req.body);

    res.status(201).json(user);
  },
  signIn: async (req: Request, res: Response) => {
    const result = await authServices.signIn(req.body);

    res.json(result);
  },
};
