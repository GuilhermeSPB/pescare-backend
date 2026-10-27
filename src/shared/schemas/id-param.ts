import { z } from "zod";

// ID numerico vindo da URL (req.params.id chega sempre como string).
export const idParam = z.coerce
  .number({ error: "ID inválido" })
  .int("ID inválido")
  .positive("ID inválido");
