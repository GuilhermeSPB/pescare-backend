import { Router } from "express";
import { alertsController } from "./alerts.controller.js";
import { isAdmin } from "@shared/middlewares/hasRole.js";

// O isAuthenticated ja e aplicado no core/routes.ts para todo o modulo.
// As rotas /preferences precisam vir antes de /:id.
const alertsRouter = Router();

alertsRouter.get("/preferences", alertsController.getPreferences);
alertsRouter.put("/preferences", alertsController.updatePreferences);

alertsRouter.get("/", alertsController.getAll);
alertsRouter.post("/", isAdmin, alertsController.create);
alertsRouter.get("/:id", alertsController.getById);
alertsRouter.put("/:id", isAdmin, alertsController.update);

export { alertsRouter };
