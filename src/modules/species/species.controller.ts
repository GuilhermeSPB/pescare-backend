import type { Request, Response } from "express";
import { speciesServices } from "./species.services.js";
import { booleanQueryParam } from "@shared/schemas/boolean-query-param.js";
import { z } from "zod";

export const speciesController = {
  async create(req: Request, res: Response) {
    try {
      const data = req.body;

      const species = await speciesServices.create(data);

      res.status(201).json(species);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to create species." });
    }
  },

  async getAll(req: Request, res: Response) {
    try {
      const isActive = booleanQueryParam.parse(req.query.isActive);

      const species = await speciesServices.getAll(isActive);

      res.json(species);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to fetch species." });
    }
  },

  async getById(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id as string);

      const species = await speciesServices.getById(id);

      res.json(species);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to fetch species." });
    }
  },

  async update(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id as string);
      const data = req.body;

      const updateData = { id, data };

      const species = await speciesServices.update(updateData);

      res.json(species);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to update species." });
    }
  },
};
