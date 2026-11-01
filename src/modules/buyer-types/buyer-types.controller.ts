import type { Request, Response } from "express";
import { buyerTypesServices } from "./buyer-types.services.js";
import { booleanQueryParam } from "@shared/schemas/boolean-query-param.js";

// Sem try/catch: erros sobem para o errorHandler global (Express 5).
export const buyerTypeController = {
  async create(req: Request, res: Response) {
    const buyerType = await buyerTypesServices.create(req.body);

    res.status(201).json(buyerType);
  },

  async getAll(req: Request, res: Response) {
    const isActive = booleanQueryParam.parse(req.query.isActive);

    const buyerTypes = await buyerTypesServices.getAll(isActive);

    res.json(buyerTypes);
  },

  async getById(req: Request, res: Response) {
    const buyerType = await buyerTypesServices.getById(req.params.id);

    res.json(buyerType);
  },

  async update(req: Request, res: Response) {
    const buyerType = await buyerTypesServices.update({
      id: req.params.id,
      data: req.body,
    });

    res.json(buyerType);
  },
};
