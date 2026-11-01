import express from 'express'
import cors from 'cors'
import { env } from './env.js'
import { notFoundHandler } from '../shared/middlewares/not-found.js'
import { errorHandler } from '../shared/middlewares/error-handler.js'
import { routes } from './routes.js'

export function createApp() {
  const app = express()

  // Sem CORS_ORIGINS definida, aceita qualquer origem (dev). Em producao,
  // definir a lista de URLs do front. Sem `credentials`: a autenticacao e
  // por header Authorization, nao por cookie.
  app.use(cors({ origin: env.CORS_ORIGINS ?? '*' }))

  app.use(express.json())

  // Health check: nao depende do Prisma/banco, serve so pra confirmar que
  // o processo do servidor esta de pe.
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' })
  })

  app.use('/api/v1', routes)

  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}
