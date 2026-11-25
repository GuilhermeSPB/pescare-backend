import { z } from "zod";

// E-mail normalizado (sem espacos nas pontas, minusculo) antes de validar.
// No Zod 4, `z.email().trim()` valida o formato ANTES do trim, entao
// "a@x.com " era recusado em vez de limpo; por isso o trim vem num z.string()
// e o formato e checado depois, no pipe.
export const emailSchema = z
  .string({ error: "Informe um e-mail válido" })
  .trim()
  .toLowerCase()
  .pipe(z.email("Informe um e-mail válido"));
