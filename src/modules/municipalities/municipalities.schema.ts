import { z } from "zod";

export const listMunicipalitiesSchema = z.object({
  uf: z
    .string()
    .trim()
    .length(2, "Informe a UF com 2 letras")
    .toUpperCase()
    .optional(),
  name: z.string().trim().min(1).optional(),
});

export const ibgeCodeParam = z
  .string()
  .regex(/^[0-9]{7}$/, "Código IBGE do município inválido");

export type ListMunicipalitiesType = z.infer<typeof listMunicipalitiesSchema>;
