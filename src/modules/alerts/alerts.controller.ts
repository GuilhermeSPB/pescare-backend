import type { Request, Response } from "express";
import { alertsServices } from "./alerts.services.js";

// Todas as rotas passam pelo isAuthenticated (core/routes.ts), entao
// req.user sempre existe aqui.
export const alertsController = {
  async getAll(req: Request, res: Response) {
    const alerts = await alertsServices.getAll(req.user!, req.query);

    res.json(alerts);
  },

  async getById(req: Request, res: Response) {
    const alert = await alertsServices.getById(req.user!, req.params.id);

    res.json(alert);
  },

  async create(req: Request, res: Response) {
    const alert = await alertsServices.create(req.body);

    res.status(201).json(alert);
  },

  async update(req: Request, res: Response) {
    const alert = await alertsServices.update(req.params.id, req.body);

    res.json(alert);
  },

  async getPreferences(req: Request, res: Response) {
    const preferences = await alertsServices.getPreferences(req.user!.id);

    res.json(preferences);
  },

  async updatePreferences(req: Request, res: Response) {
    const preferences = await alertsServices.updatePreferences(
      req.user!.id,
      req.body,
    );

    res.json(preferences);
  },
};
