import { Router } from "express";
import { targetGroupController } from "./target-groups.controller.js";

const targetGroupRouter = Router();

targetGroupRouter.post("/", targetGroupController.create);

targetGroupRouter.get("/", targetGroupController.getAll);

targetGroupRouter.get("/:id", targetGroupController.getById);

targetGroupRouter.put("/:id", targetGroupController.update);

export { targetGroupRouter };
