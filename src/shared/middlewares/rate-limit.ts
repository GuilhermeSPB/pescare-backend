import type { Request } from "express";
import { rateLimit, type Options } from "express-rate-limit";

// Os contadores ficam na memoria do processo (store padrao da lib): servem
// enquanto a API roda em uma unica instancia e zeram quando o servidor
// reinicia. Com varias instancias, trocar o `store` aqui por um compartilhado
// (ex.: rate-limit-redis), senao cada instancia conta separado.
//
// Sem `keyGenerator`, a chave e o IP do cliente (req.ip, que depende do
// TRUST_PROXY no env); a lib ja agrupa IPv6 por sub-rede.

const MINUTE = 60 * 1000;
const HOUR = 60 * MINUTE;

type LimiterOptions = Pick<
  Partial<Options>,
  "keyGenerator" | "skip" | "skipSuccessfulRequests"
> & {
  windowMs: number;
  limit: number;
  message: string;
};

function createLimiter({ message, ...options }: LimiterOptions) {
  return rateLimit({
    ...options,
    // Headers RateLimit/RateLimit-Policy (padrao IETF atual) e Retry-After no 429.
    standardHeaders: "draft-8",
    legacyHeaders: false,
    // Mesmo formato de erro do errorHandler: { message }.
    message: { message },
  });
}

// Normaliza como o signInSchema, pra "A@x.com " e "a@x.com" caírem no mesmo
// contador.
function signInEmail(req: Request): string | undefined {
  const email: unknown = req.body?.email;

  return typeof email === "string" && email.trim()
    ? email.trim().toLowerCase()
    : undefined;
}

/**
 * Limite leve para toda a API. Folgado porque usuarios de rede movel ou do
 * mesmo Wi-Fi costumam compartilhar IP.
 */
export const globalLimiter = createLimiter({
  windowMs: MINUTE,
  limit: 300,
  message: "Muitas requisições. Tente novamente em instantes.",
});

/**
 * Login, por IP: barra um mesmo cliente testando varias contas.
 * So conta tentativas que falharam (status >= 400).
 */
export const signInIpLimiter = createLimiter({
  windowMs: 15 * MINUTE,
  limit: 20,
  skipSuccessfulRequests: true,
  message: "Muitas tentativas de login. Tente novamente em alguns minutos.",
});

/**
 * Login, por e-mail: barra forca bruta distribuida (varios IPs) contra uma
 * mesma conta. So conta tentativas que falharam. Sem e-mail no corpo, nao
 * conta: o Zod responde 400 no service.
 */
export const signInEmailLimiter = createLimiter({
  windowMs: 15 * MINUTE,
  limit: 5,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => `email:${signInEmail(req)}`,
  skip: (req) => !signInEmail(req),
  message: "Muitas tentativas de login. Tente novamente em alguns minutos.",
});

/**
 * Cadastro, por IP: conta todas as requisicoes, inclusive o 409 de e-mail
 * ja cadastrado (que serviria pra descobrir quais e-mails existem).
 */
export const signUpLimiter = createLimiter({
  windowMs: HOUR,
  limit: 10,
  message: "Muitos cadastros a partir desta rede. Tente novamente mais tarde.",
});

/**
 * Troca de senha, por usuario: impede que um token roubado sirva pra testar
 * a senha atual. Precisa rodar depois do isAuthenticated.
 */
export const changePasswordLimiter = createLimiter({
  windowMs: 15 * MINUTE,
  limit: 5,
  skipSuccessfulRequests: true,
  keyGenerator: (req) => `user:${req.user!.id}`,
  message: "Muitas tentativas de troca de senha. Tente novamente em alguns minutos.",
});
