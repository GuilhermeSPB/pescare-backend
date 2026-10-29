import type { Request, Response } from "express";
import { fishingBanPeriodsServices } from "./fishing-ban-periods.services.js";

export const fishingBanPeriodsController = {
  async getAll(_req: Request, res: Response) {
    const periods = await fishingBanPeriodsServices.getAll();

    res.json(periods);
  },

  async getById(req: Request, res: Response) {
    const period = await fishingBanPeriodsServices.getById(req.params.id);

    res.json(period);
  },

  async getInEffect(req: Request, res: Response) {
    const species = await fishingBanPeriodsServices.getInEffect(req.query);

    res.json(species);
  },

  async create(req: Request, res: Response) {
    const period = await fishingBanPeriodsServices.create(req.body);

    res.status(201).json(period);
  },

  async update(req: Request, res: Response) {
    const period = await fishingBanPeriodsServices.update(
      req.params.id,
      req.body,
    );

    res.json(period);
  },
};
