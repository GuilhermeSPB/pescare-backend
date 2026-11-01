import { z } from 'zod'

// Valida as variaveis de ambiente uma unica vez, no boot da aplicacao.
// Se algo estiver faltando/errado, o servidor nem sobe - evita descobrir
// isso em produção no meio de uma requisição.
const envSchema = z.object({
  DATABASE_URL: z.string().min(1, 'DATABASE_URL e obrigatoria'),
  PORT: z.coerce.number().int().positive().default(3000),
  JWT_SECRET: z.string().min(1, 'JWT_SECRET e obrigatoria'),
  // Origens do front separadas por virgula. Sem ela, o CORS aceita qualquer origem.
  CORS_ORIGINS: z
    .string()
    .optional()
    .transform((value) =>
      value
        ?.split(',')
        .map((origin) => origin.trim())
        .filter(Boolean),
    ),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  console.error('Variaveis de ambiente invalidas:')
  console.error(parsed.error.format())
  process.exit(1)
}

export const env = parsed.data
