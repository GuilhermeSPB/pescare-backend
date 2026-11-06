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

// Só o nome é editável: o código é a chave e a UF vem dele. Sem checar nome
// repetido, porque há municípios com o mesmo nome em UFs diferentes.
export const updateMunicipalitySchema = z.object({
  name: z.string().trim().min(1, "Informe o nome"),
});

export type ListMunicipalitiesType = z.infer<typeof listMunicipalitiesSchema>;
export type UpdateMunicipalityType = z.infer<typeof updateMunicipalitySchema>;
