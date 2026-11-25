import express from "express";
import cors from "cors";
import { env } from "./env.js";
import { notFoundHandler } from "../shared/middlewares/not-found.js";
import { errorHandler } from "../shared/middlewares/error-handler.js";
import { globalLimiter } from "../shared/middlewares/rate-limit.js";
import { routes } from "./routes.js";

export function createApp() {
  const app = express();

  // Define de onde sai o req.ip (usado como chave do rate limit). Precisa
  // vir antes de qualquer limiter.
  app.set("trust proxy", env.TRUST_PROXY);

  // Sem CORS_ORIGINS definida, aceita qualquer origem (dev). Em producao,
  // definir a lista de URLs do front. Sem `credentials`: a autenticacao e
  // por header Authorization, nao por cookie.
  //
  // Vem antes do rate limit pra que o 429 tambem leve os headers de CORS
  // (senao o navegador mostra erro de CORS no lugar do 429). Os headers
  // expostos deixam o front ler quanto tempo falta pra tentar de novo.
  app.use(
    cors({
      origin: env.CORS_ORIGINS ?? "*",
      exposedHeaders: ["Retry-After", "RateLimit", "RateLimit-Policy"],
    }),
  );

  // Antes do express.json: requisicao barrada nao chega a ter o corpo parseado.
  app.use("/api/v1", globalLimiter);

  app.use(express.json());

  // Valida se a API está rodando
  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/api/v1", routes);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
