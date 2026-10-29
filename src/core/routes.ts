import { Router } from "express";
import { fishingLocationTypeRouter } from "@modules/fishing-location-types/fishing-location-types.routes.js";
import { buyerTypeRouter } from "@modules/buyer-types/buyer-types.routes.js";
import { fishingMethodRouter } from "@modules/fishing-methods/fishing-methods.routes.js";
import { speciesRouter } from "@modules/species/species.routes.js";
import { targetGroupRouter } from "@modules/target-groups/target-groups.routes.js";
import { authRouter } from "@modules/auth/auth.routes.js";
import { usersRouter } from "@modules/users/users.routes.js";
import { municipalitiesRouter } from "@modules/municipalities/municipalities.routes.js";
import { alertsRouter } from "@modules/alerts/alerts.routes.js";
import { fishingBanPeriodsRouter } from "@modules/fishing-ban-periods/fishing-ban-periods.routes.js";

import { isAuthenticated } from "@shared/middlewares/isAuthenticated.js";

const routes = Router();

routes.use("/auth", authRouter);
routes.use("/municipalities", municipalitiesRouter);
routes.use("/fishing-location-types", fishingLocationTypeRouter);
routes.use("/buyer-types", isAuthenticated, buyerTypeRouter);
routes.use("/fishing-methods", fishingMethodRouter);
routes.use("/species", speciesRouter);
routes.use("/target-groups", targetGroupRouter);
routes.use("/users", isAuthenticated, usersRouter);
routes.use("/alerts", isAuthenticated, alertsRouter);
routes.use("/fishing-ban-periods", isAuthenticated, fishingBanPeriodsRouter);

export { routes };
