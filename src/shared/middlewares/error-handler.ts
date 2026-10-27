import type { NextFunction, Request, Response } from 'express'
import { ZodError } from 'zod'
import { Prisma } from '@core/prisma.js'
import { AppError } from '@shared/errors/app-error.js'

// Erros lancados pelo body-parser (express.json) carregam o status HTTP e,
// no caso de JSON malformado, o corpo cru da requisicao em `body`.
interface HttpError extends Error {
  status?: number
  type?: string
}

// Erros conhecidos do Prisma que sao causados pela requisicao, e nao por
// falha do servidor.
const prismaErrors: Record<string, { status: number; message: string }> = {
  P2002: { status: 409, message: 'Já existe um registro com esses dados' },
  P2003: { status: 400, message: 'Registro relacionado não encontrado' },
  P2025: { status: 404, message: 'Registro não encontrado' },
}

// Middleware de erro do Express precisa ter exatamente estes 4 parametros
// pra ele ser reconhecido como error handler (senao o Express trata como
// middleware normal e ele nunca e chamado).
//
// Os controllers nao fazem try/catch: o Express 5 encaminha pra ca qualquer
// promise rejeitada de um handler async.
export function errorHandler(err: unknown, _req: Request, res: Response, _next: NextFunction) {
  if (err instanceof ZodError) {
    return res.status(400).json({
      message: 'Dados inválidos',
      issues: err.issues.map((issue) => ({
        path: issue.path.map(String).join('.'),
        message: issue.message,
      })),
    })
  }

  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ message: err.message })
  }

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    const known = prismaErrors[err.code]

    if (known) {
      return res.status(known.status).json({ message: known.message })
    }
  }

  const error = err instanceof Error ? (err as HttpError) : undefined

  // JSON malformado: nao loga nem a mensagem, porque o V8 inclui trechos do
  // corpo nela (ex.: "Unexpected token ..., "{"password":"..." is not valid JSON").
  if (error?.type === 'entity.parse.failed') {
    console.error('JSON malformado recebido (corpo omitido do log)')
    return res.status(400).json({ message: 'JSON inválido' })
  }

  // Loga so o stack: logar o objeto inteiro vazaria propriedades como `body`.
  console.error(error?.stack ?? err)

  if (error?.type === 'entity.too.large') {
    return res.status(413).json({ message: 'Requisição muito grande' })
  }

  if (error?.status && error.status >= 400 && error.status < 500) {
    return res.status(error.status).json({ message: 'Requisição inválida' })
  }

  res.status(500).json({ message: 'Erro interno do servidor' })
}
