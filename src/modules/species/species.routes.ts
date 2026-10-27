import { Router } from "express";
import { speciesController } from "./species.controller.js";
import { isAuthenticated } from "@shared/middlewares/isAuthenticated.js";
import { isAdmin } from "@shared/middlewares/hasRole.js";

const speciesRouter = Router();

speciesRouter.post("/", isAuthenticated, isAdmin, speciesController.create);

speciesRouter.get("/", speciesController.getAll);

speciesRouter.get("/:id", speciesController.getById);

speciesRouter.put("/:id", isAuthenticated, isAdmin, speciesController.update);

export { speciesRouter };
