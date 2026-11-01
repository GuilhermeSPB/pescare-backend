import type { Request, Response } from "express";
import { usersServices } from "./users.services.js";

// Todas as rotas passam pelo isAuthenticated (core/routes.ts), entao
// req.user sempre existe aqui.
export const usersController = {
  async getMe(req: Request, res: Response) {
    const user = await usersServices.getMe(req.user!.id);

    res.json(user);
  },

  async updateMe(req: Request, res: Response) {
    const user = await usersServices.updateMe(req.user!.id, req.body);

    res.json(user);
  },

  async changePassword(req: Request, res: Response) {
    await usersServices.changePassword(req.user!.id, req.body);

    res.status(204).send();
  },

  async getAll(req: Request, res: Response) {
    const users = await usersServices.getAll(req.query);

    res.json(users);
  },

  async getById(req: Request, res: Response) {
    const user = await usersServices.getById(req.user!, req.params.id);

    res.json(user);
  },

  async create(req: Request, res: Response) {
    const user = await usersServices.create(req.body);

    res.status(201).json(user);
  },

  async adminUpdate(req: Request, res: Response) {
    const user = await usersServices.adminUpdate(
      req.user!,
      req.params.id,
      req.body,
    );

    res.json(user);
  },
};
