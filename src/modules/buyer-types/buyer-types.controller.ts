import type { Request, Response } from "express";
import { buyerTypesServices } from "./buyer-types.services.js";
import { booleanQueryParam } from "@shared/schemas/boolean-query-param.js";
import { z } from "zod";

export const buyerTypeController = {
  async create(req: Request, res: Response) {
    try {
      const data = req.body;

      const buyerType = await buyerTypesServices.create(data);

      res.status(201).json(buyerType);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to create buyer type." });
    }
  },

  async getAll(req: Request, res: Response) {
    try {
      const isActive = booleanQueryParam.parse(req.query.isActive);

      const buyerTypes = await buyerTypesServices.getAll(isActive);

      res.json(buyerTypes);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to fetch buyer types." });
    }
  },

  async getById(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id as string);

      const buyerType = await buyerTypesServices.getById(id);

      res.json(buyerType);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to fetch buyer type." });
    }
  },

  async update(req: Request, res: Response) {
    try {
      const id = parseInt(req.params.id as string);
      const data = req.body;

      const updateData = { id, data };

      const buyerType = await buyerTypesServices.update(updateData);

      res.json(buyerType);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to update buyer type." });
    }
  },
};
