import { z } from "zod";

export const createLocationFishingSchema = z.object({
  name: z.string().min(1, "Informe o nome do tipo de local de pesca"),
});
