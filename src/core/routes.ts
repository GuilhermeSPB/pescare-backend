import { Router } from "express";
import { locationFishingRouter } from "@modules/fishing-location-types/location-fishings.routes.js";
import { buyerTypeRouter } from "@modules/buyer-types/buyer-types.routes.js";
import { fishingMethodRouter } from "@modules/fishing-methods/fishing-methods.routes.js";
import { speciesRouter } from "@modules/species/species.routes.js";
import { targetGroupRouter } from "@modules/target-groups/target-groups.routes.js";
import { authRouter } from "@modules/auth/auth.routes.js";

import { isAuthenticated } from "@shared/middlewares/isAuthenticated.js";

const routes = Router();

routes.use("/auth", authRouter);
routes.use("/location-fishings", locationFishingRouter);
routes.use("/buyer-types", isAuthenticated, buyerTypeRouter);
routes.use("/fishing-methods", fishingMethodRouter);
routes.use("/species", speciesRouter);
routes.use("/target-groups", targetGroupRouter);

export { routes };
