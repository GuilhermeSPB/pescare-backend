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
  // Quantos proxies (Nginx, Render, Cloudflare...) ficam na frente da API.
  // 0 = nenhum: o IP do cliente e o da conexao. So aumentar se houver proxy
  // de fato, senao o cliente forja o X-Forwarded-For e escapa do rate limit.
  TRUST_PROXY: z.coerce.number().int().min(0).default(0),
})

const parsed = envSchema.safeParse(process.env)

if (!parsed.success) {
  console.error('Variaveis de ambiente invalidas:')
  console.error(parsed.error.format())
  process.exit(1)
}

export const env = parsed.data
