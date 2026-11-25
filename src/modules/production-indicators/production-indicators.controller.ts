import type { Request, Response } from "express";
import { productionIndicatorsServices } from "./production-indicators.services.js";

// Sem try/catch: erros sobem para o errorHandler global (Express 5).
// O usuário vem do isAuthenticated, nunca da query.
export const productionIndicatorsController = {
  async get(req: Request, res: Response) {
    const indicators = await productionIndicatorsServices.getIndicators(req.user!.id, req.query);

    res.json(indicators);
  },
};
