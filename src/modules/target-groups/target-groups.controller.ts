import type { Request, Response } from "express";
import { targetGroupsServices } from "./target-groups.services.js";
import { booleanQueryParam } from "@shared/schemas/boolean-query-param.js";

export const targetGroupController = {
  async create(req: Request, res: Response) {
    try {
      const data = req.body;

      const targetGroup = await targetGroupsServices.create(data);

      res.status(201).json(targetGroup);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to create target group." });
    }
  },

  async getAll(req: Request, res: Response) {
    try {
      const isActive = booleanQueryParam.parse(req.query.isActive);

      const targetGroups = await targetGroupsServices.getAll(isActive);

      res.json(targetGroups);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to fetch target groups." });
    }
  },

  async getById(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id as string);

      const targetGroup = await targetGroupsServices.getById(id);

      res.json(targetGroup);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to fetch target group." });
    }
  },

  async update(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id as string);
      const data = req.body;

      const updateData = { id, data };

      const targetGroup = await targetGroupsServices.update(updateData);

      res.json(targetGroup);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to update target group." });
    }
  },
};
