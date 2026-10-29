import { Router } from "express";
import { fishingBanPeriodsController } from "./fishing-ban-periods.controller.js";
import { isAdmin } from "@shared/middlewares/hasRole.js";

// O isAuthenticated ja e aplicado no core/routes.ts para todo o modulo.
// A rota /in-effect precisa vir antes de /:id.
const fishingBanPeriodsRouter = Router();

fishingBanPeriodsRouter.get("/in-effect", fishingBanPeriodsController.getInEffect);

fishingBanPeriodsRouter.get("/", fishingBanPeriodsController.getAll);
fishingBanPeriodsRouter.post("/", isAdmin, fishingBanPeriodsController.create);
fishingBanPeriodsRouter.get("/:id", fishingBanPeriodsController.getById);
fishingBanPeriodsRouter.put("/:id", isAdmin, fishingBanPeriodsController.update);

export { fishingBanPeriodsRouter };
