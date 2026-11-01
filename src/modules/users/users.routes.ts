import { Router } from "express";
import { usersController } from "./users.controller.js";
import { isAdmin } from "@shared/middlewares/hasRole.js";

// O isAuthenticated ja e aplicado no core/routes.ts para todo o modulo.
// As rotas /me precisam vir antes de /:id.
const usersRouter = Router();

usersRouter.get("/me", usersController.getMe);
usersRouter.patch("/me", usersController.updateMe);
usersRouter.patch("/me/password", usersController.changePassword);

usersRouter.get("/", isAdmin, usersController.getAll);
usersRouter.post("/", isAdmin, usersController.create);
usersRouter.get("/:id", usersController.getById);
usersRouter.patch("/:id", isAdmin, usersController.adminUpdate);

export { usersRouter };
