import { Router } from "express";
import { buyerTypeController } from "./buyer-types.controller.js";

const buyerTypeRouter = Router();

buyerTypeRouter.post("/", buyerTypeController.create);

buyerTypeRouter.get("/", buyerTypeController.getAll);

buyerTypeRouter.get("/:id", buyerTypeController.getById);

buyerTypeRouter.put("/:id", buyerTypeController.update);

export { buyerTypeRouter };
