import { Router } from "express";
import { productionIndicatorsController } from "./production-indicators.controller.js";
import { hasRole } from "@shared/middlewares/hasRole.js";

// Indicadores são da produção do próprio pescador: o admin não tem pescas.
// O isAuthenticated é aplicado no core/routes.ts para todo o módulo.
const productionIndicatorsRouter = Router();

productionIndicatorsRouter.get("/", hasRole("FISHER"), productionIndicatorsController.get);

export { productionIndicatorsRouter };
