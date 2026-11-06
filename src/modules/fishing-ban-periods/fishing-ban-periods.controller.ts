import type { Request, Response } from "express";
import { fishingBanPeriodsServices } from "./fishing-ban-periods.services.js";

export const fishingBanPeriodsController = {
  async getAll(req: Request, res: Response) {
    const periods = await fishingBanPeriodsServices.getAll(req.user?.role);

    res.json(periods);
  },

  async getById(req: Request, res: Response) {
    const period = await fishingBanPeriodsServices.getById(req.params.id, req.user?.role);

    res.json(period);
  },

  async getVersions(req: Request, res: Response) {
    const versions = await fishingBanPeriodsServices.getVersions(req.params.id, req.user?.role);

    res.json(versions);
  },

  async getInEffect(req: Request, res: Response) {
    const species = await fishingBanPeriodsServices.getInEffect(req.query);

    res.json(species);
  },

  async getForMunicipality(req: Request, res: Response) {
    const periods = await fishingBanPeriodsServices.getForMunicipality(req.query);

    res.json(periods);
  },

  async create(req: Request, res: Response) {
    const period = await fishingBanPeriodsServices.create(req.body);

    res.status(201).json(period);
  },

  async createVersion(req: Request, res: Response) {
    const period = await fishingBanPeriodsServices.createVersion(
      req.params.id,
      req.body,
    );

    res.status(201).json(period);
  },

  async activate(req: Request, res: Response) {
    const period = await fishingBanPeriodsServices.activate(req.params.id);

    res.json(period);
  },

  async update(req: Request, res: Response) {
    const period = await fishingBanPeriodsServices.update(
      req.params.id,
      req.body,
    );

    res.json(period);
  },
};
