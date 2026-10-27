import type { Request, Response } from "express";
import { fishingLocationTypesServices } from "./fishing-location-types.services.js";
import { booleanQueryParam } from "@shared/schemas/boolean-query-param.js";

// Sem try/catch: erros sobem para o errorHandler global (Express 5).
export const fishingLocationTypeController = {
  async create(req: Request, res: Response) {
    const locationType = await fishingLocationTypesServices.create(req.body);

    res.status(201).json(locationType);
  },

  async getAll(req: Request, res: Response) {
    const isActive = booleanQueryParam.parse(req.query.isActive);

    const locationTypes = await fishingLocationTypesServices.getAll(isActive);

    res.json(locationTypes);
  },

  async getById(req: Request, res: Response) {
    const locationType = await fishingLocationTypesServices.getById(
      req.params.id,
    );

    res.json(locationType);
  },

  async update(req: Request, res: Response) {
    const locationType = await fishingLocationTypesServices.update({
      id: req.params.id,
      data: req.body,
    });

    res.json(locationType);
  },
};
