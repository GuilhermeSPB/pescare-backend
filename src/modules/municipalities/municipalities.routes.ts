import { Router } from "express";
import { municipalitiesController } from "./municipalities.controller.js";

// Rotas publicas: o cadastro (sign-up) precisa listar os municipios antes
// de o usuario ter um token. Os dados vem do IBGE e sao so leitura.
const municipalitiesRouter = Router();

municipalitiesRouter.get("/", municipalitiesController.getAll);

municipalitiesRouter.get("/:ibgeCode", municipalitiesController.getByIbgeCode);

export { municipalitiesRouter };
