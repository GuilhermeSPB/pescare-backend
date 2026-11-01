import type { Request, Response } from "express";
import { fishingMethodsServices } from "./fishing-methods.services.js";
import { booleanQueryParam } from "@shared/schemas/boolean-query-param.js";

// Sem try/catch: erros sobem para o errorHandler global (Express 5).
export const fishingMethodController = {
  async create(req: Request, res: Response) {
    const fishingMethod = await fishingMethodsServices.create(req.body);

    res.status(201).json(fishingMethod);
  },

  async getAll(req: Request, res: Response) {
    const isActive = booleanQueryParam.parse(req.query.isActive);

    const fishingMethods = await fishingMethodsServices.getAll(isActive);

    res.json(fishingMethods);
  },

  async getById(req: Request, res: Response) {
    const fishingMethod = await fishingMethodsServices.getById(req.params.id);

    res.json(fishingMethod);
  },

  async update(req: Request, res: Response) {
    const fishingMethod = await fishingMethodsServices.update({
      id: req.params.id,
      data: req.body,
    });

    res.json(fishingMethod);
  },
};
