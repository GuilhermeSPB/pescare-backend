import type { Request, Response } from "express";
import { fishingMethodsServices } from "./fishing-methods.services.js";
import { booleanQueryParam } from "@shared/schemas/boolean-query-param.js";
import { z } from "zod";

export const fishingMethodController = {
  async create(req: Request, res: Response) {
    try {
      const data = req.body;

      const fishingMethod = await fishingMethodsServices.create(data);

      res.status(201).json(fishingMethod);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to create fishing method." });
    }
  },

  async getAll(req: Request, res: Response) {
    try {
      const isActive = booleanQueryParam.parse(req.query.isActive);

      const fishingMethods = await fishingMethodsServices.getAll(isActive);

      res.json(fishingMethods);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to fetch fishing methods." });
    }
  },

  async getById(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id as string);

      const fishingMethod = await fishingMethodsServices.getById(id);

      res.json(fishingMethod);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to fetch fishing method." });
    }
  },

  async update(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id as string);
      const data = req.body;

      const updateData = { id, data };

      const fishingMethod = await fishingMethodsServices.update(updateData);

      res.json(fishingMethod);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to update fishing method." });
    }
  },
};
