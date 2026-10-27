import { Router } from "express";
import { buyerTypeController } from "./buyer-types.controller.js";
import { isAdmin } from "@shared/middlewares/hasRole.js";

// O isAuthenticated ja e aplicado no core/routes.ts para todo o modulo.
const buyerTypeRouter = Router();

buyerTypeRouter.post("/", isAdmin, buyerTypeController.create);

buyerTypeRouter.get("/", buyerTypeController.getAll);

buyerTypeRouter.get("/:id", buyerTypeController.getById);

buyerTypeRouter.put("/:id", isAdmin, buyerTypeController.update);

export { buyerTypeRouter };
