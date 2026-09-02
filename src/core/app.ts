import express from 'express'
import { notFoundHandler } from '../shared/middlewares/not-found.js'
import { errorHandler } from '../shared/middlewares/error-handler.js'

export function createApp() {
  const app = express()

  app.use(express.json())

  // Health check: nao depende do Prisma/banco, serve so pra confirmar que
  // o processo do servidor esta de pe.
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok' })
  })

  // TODO: montar as rotas de cada modulo aqui conforme forem implementados,
  // ex: app.use('/api/v1/especies', especiesRouter)

  app.use(notFoundHandler)
  app.use(errorHandler)

  return app
}
