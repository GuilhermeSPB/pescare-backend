import type { Request, Response } from "express";
import { fishingRecordsServices } from "./fishing-records.services.js";

// Sem try/catch: erros sobem para o errorHandler global (Express 5).
// O usuário vem do isAuthenticated, nunca do corpo da requisição.
export const fishingRecordsController = {
  async create(req: Request, res: Response) {
    const fishingRecord = await fishingRecordsServices.create(req.user!.id, req.body);

    res.status(201).json(fishingRecord);
  },

  async getAll(req: Request, res: Response) {
    const fishingRecords = await fishingRecordsServices.getAll(req.user!.id, req.query);

    res.json(fishingRecords);
  },

  async getById(req: Request, res: Response) {
    const fishingRecord = await fishingRecordsServices.getById(req.user!.id, req.params.id);

    res.json(fishingRecord);
  },

  async updateStatus(req: Request, res: Response) {
    const fishingRecord = await fishingRecordsServices.updateStatus(req.user!.id, {
      id: req.params.id,
      data: req.body,
    });

    res.json(fishingRecord);
  },
};
