import { Router } from "express";
import { fishingRecordsController } from "./fishing-records.controller.js";
import { hasRole } from "@shared/middlewares/hasRole.js";

// Pesca é coisa do pescador: o admin não registra nem altera pescas.
// O isAuthenticated é aplicado no core/routes.ts para todo o módulo.
const fishingRecordsRouter = Router();

fishingRecordsRouter.post("/", hasRole("FISHER"), fishingRecordsController.create);

fishingRecordsRouter.get("/", fishingRecordsController.getAll);

fishingRecordsRouter.get("/:id", fishingRecordsController.getById);

fishingRecordsRouter.patch("/:id", hasRole("FISHER"), fishingRecordsController.updateStatus);

export { fishingRecordsRouter };
