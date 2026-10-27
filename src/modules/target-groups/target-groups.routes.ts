import { Router } from "express";
import { targetGroupController } from "./target-groups.controller.js";
import { isAuthenticated } from "@shared/middlewares/isAuthenticated.js";
import { isAdmin } from "@shared/middlewares/hasRole.js";

const targetGroupRouter = Router();

targetGroupRouter.post(
  "/",
  isAuthenticated,
  isAdmin,
  targetGroupController.create,
);

targetGroupRouter.get("/", targetGroupController.getAll);

targetGroupRouter.get("/:id", targetGroupController.getById);

targetGroupRouter.put(
  "/:id",
  isAuthenticated,
  isAdmin,
  targetGroupController.update,
);

export { targetGroupRouter };
