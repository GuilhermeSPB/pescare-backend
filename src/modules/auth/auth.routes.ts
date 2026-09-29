import { Router } from "express";
import { authController } from "./auth.controller.js";

const authRouter = Router();

authRouter.post("/sign-in", authController.signIn);
authRouter.post("/sign-up", authController.signUp);

export { authRouter };
