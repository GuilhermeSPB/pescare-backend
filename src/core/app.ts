import express from 'express'
import { notFoundHandler } from '../shared/middlewares/not-found.js'
import { errorHandler } from '../shared/middlewares/error-handler.js'
import { routes } from './routes.js'

export function createApp() {
  const app = express()

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
