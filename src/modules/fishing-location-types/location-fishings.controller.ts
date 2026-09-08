import type { Request, Response } from "express";
import { locationFishingsServices } from "./location-fishings.services.js";
import { booleanQueryParam } from "@shared/schemas/boolean-query-param.js";

export const locationFishingController = {
  async create(req: Request, res: Response) {
    try {
      const data = req.body;

      const locationFishing =
        await locationFishingsServices.createLocationFishing(data);

      res.status(201).json(locationFishing);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to create location fishing." });
    }
  },

  async getAll(req: Request, res: Response) {
    try {
      const isActive = booleanQueryParam.parse(req.query.isActive);

      const locationFishings =
        await locationFishingsServices.getAllLocationFishings(isActive);

      res.json(locationFishings);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to fetch location fishings." });
    }
  },
};
