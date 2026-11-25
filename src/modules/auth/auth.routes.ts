import { Router } from "express";
import { authController } from "./auth.controller.js";
import {
  signInEmailLimiter,
  signInIpLimiter,
  signUpLimiter,
} from "@shared/middlewares/rate-limit.js";

const authRouter = Router();

authRouter.post(
  "/sign-in",
  signInIpLimiter,
  signInEmailLimiter,
  authController.signIn,
);
authRouter.post("/sign-up", signUpLimiter, authController.signUp);

export { authRouter };
