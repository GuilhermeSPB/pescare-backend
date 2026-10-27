import { Router } from "express";
import { fishingLocationTypeController } from "./fishing-location-types.controller.js";
import { isAuthenticated } from "@shared/middlewares/isAuthenticated.js";
import { isAdmin } from "@shared/middlewares/hasRole.js";

const fishingLocationTypeRouter = Router();

fishingLocationTypeRouter.post(
  "/",
  isAuthenticated,
  isAdmin,
  fishingLocationTypeController.create,
);

fishingLocationTypeRouter.get("/", fishingLocationTypeController.getAll);

fishingLocationTypeRouter.get("/:id", fishingLocationTypeController.getById);

fishingLocationTypeRouter.put(
  "/:id",
  isAuthenticated,
  isAdmin,
  fishingLocationTypeController.update,
);

export { fishingLocationTypeRouter };
