import type { NextFunction, Request, Response } from 'express'

// Middleware de erro do Express precisa ter exatamente estes 4 parametros
// pra ele ser reconhecido como error handler (senao o Express trata como
// middleware normal e ele nunca e chamado).
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  console.error(err)

  const message = err instanceof Error ? err.message : 'Erro interno do servidor'

  res.status(500).json({ message })
}
