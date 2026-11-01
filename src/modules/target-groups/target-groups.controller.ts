import type { Request, Response } from "express";
import { targetGroupsServices } from "./target-groups.services.js";
import { booleanQueryParam } from "@shared/schemas/boolean-query-param.js";

// Sem try/catch: erros sobem para o errorHandler global (Express 5).
export const targetGroupController = {
  async create(req: Request, res: Response) {
    const targetGroup = await targetGroupsServices.create(req.body);

    res.status(201).json(targetGroup);
  },

  async getAll(req: Request, res: Response) {
    const isActive = booleanQueryParam.parse(req.query.isActive);

    const targetGroups = await targetGroupsServices.getAll(isActive);

    res.json(targetGroups);
  },

  async getById(req: Request, res: Response) {
    const targetGroup = await targetGroupsServices.getById(req.params.id);

    res.json(targetGroup);
  },

  async update(req: Request, res: Response) {
    const targetGroup = await targetGroupsServices.update({
      id: req.params.id,
      data: req.body,
    });

    res.json(targetGroup);
  },
};
