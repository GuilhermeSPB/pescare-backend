import { Router } from "express";
import { speciesController } from "./species.controller.js";

const speciesRouter = Router();

speciesRouter.post("/", speciesController.create);

speciesRouter.get("/", speciesController.getAll);

speciesRouter.get("/:id", speciesController.getById);

speciesRouter.put("/:id", speciesController.update);

export { speciesRouter };
