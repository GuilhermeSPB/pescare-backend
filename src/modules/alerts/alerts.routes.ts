import { Router } from "express";
import { alertsController } from "./alerts.controller.js";
import { isAdmin } from "@shared/middlewares/hasRole.js";

// O isAuthenticated ja e aplicado no core/routes.ts para todo o modulo.
const alertsRouter = Router();

alertsRouter.get("/", alertsController.getAll);
alertsRouter.post("/", isAdmin, alertsController.create);
alertsRouter.get("/:id", alertsController.getById);
alertsRouter.put("/:id", isAdmin, alertsController.update);

export { alertsRouter };
