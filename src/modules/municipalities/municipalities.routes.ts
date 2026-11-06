import { Router } from "express";
import { municipalitiesController } from "./municipalities.controller.js";
import { isAuthenticated } from "@shared/middlewares/isAuthenticated.js";
import { isAdmin } from "@shared/middlewares/hasRole.js";

// Leitura publica: o cadastro (sign-up) precisa listar os municipios antes
// de o usuario ter um token. Os dados vem da carga do IBGE
// (npm run seed-municipalities); o admin so corrige o nome.
const municipalitiesRouter = Router();

municipalitiesRouter.get("/", municipalitiesController.getAll);

municipalitiesRouter.get("/:ibgeCode", municipalitiesController.getByIbgeCode);

municipalitiesRouter.put(
  "/:ibgeCode",
  isAuthenticated,
  isAdmin,
  municipalitiesController.update,
);

export { municipalitiesRouter };
