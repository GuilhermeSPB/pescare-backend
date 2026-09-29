import { Router } from "express";
import { fishingMethodController } from "./fishing-methods.controller.js";

const fishingMethodRouter = Router();

fishingMethodRouter.post("/", fishingMethodController.create);

fishingMethodRouter.get("/", fishingMethodController.getAll);

fishingMethodRouter.get("/:id", fishingMethodController.getById);

fishingMethodRouter.put("/:id", fishingMethodController.update);

export { fishingMethodRouter };
