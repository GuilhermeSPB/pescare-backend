import { Router } from "express";
import { fishingMethodController } from "./fishing-methods.controller.js";
import { isAuthenticated } from "@shared/middlewares/isAuthenticated.js";
import { isAdmin } from "@shared/middlewares/hasRole.js";

const fishingMethodRouter = Router();

fishingMethodRouter.post(
  "/",
  isAuthenticated,
  isAdmin,
  fishingMethodController.create,
);

fishingMethodRouter.get("/", fishingMethodController.getAll);

fishingMethodRouter.get("/:id", fishingMethodController.getById);

fishingMethodRouter.put(
  "/:id",
  isAuthenticated,
  isAdmin,
  fishingMethodController.update,
);

export { fishingMethodRouter };
