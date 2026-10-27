import type { Request, Response } from "express";
import { municipalitiesServices } from "./municipalities.services.js";

export const municipalitiesController = {
  async getAll(req: Request, res: Response) {
    const municipalities = await municipalitiesServices.getAll(req.query);

    res.json(municipalities);
  },

  async getByIbgeCode(req: Request, res: Response) {
    const municipality = await municipalitiesServices.getByIbgeCode(
      req.params.ibgeCode,
    );

    res.json(municipality);
  },
};
