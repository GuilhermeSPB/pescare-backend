import type { Request, Response } from "express";
import { speciesServices } from "./species.services.js";
import { booleanQueryParam } from "@shared/schemas/boolean-query-param.js";

// Sem try/catch: erros sobem para o errorHandler global (Express 5).
export const speciesController = {
  async create(req: Request, res: Response) {
    const species = await speciesServices.create(req.body);

    res.status(201).json(species);
  },

  async getAll(req: Request, res: Response) {
    const isActive = booleanQueryParam.parse(req.query.isActive);

    const species = await speciesServices.getAll(isActive);

    res.json(species);
  },

  async getById(req: Request, res: Response) {
    const species = await speciesServices.getById(req.params.id);

    res.json(species);
  },

  async update(req: Request, res: Response) {
    const species = await speciesServices.update({
      id: req.params.id,
      data: req.body,
    });

    res.json(species);
  },
};
