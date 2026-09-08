import { Router } from "express";
import { locationFishingController } from "./location-fishings.controller.js";

const locationFishingRouter = Router();

locationFishingRouter.post("/", locationFishingController.create);

locationFishingRouter.get("/", locationFishingController.getAll);

export { locationFishingRouter };
