import 'dotenv/config'
import { env } from './core/env.js'
import { createApp } from './core/app.js'
import { prisma } from './core/prisma.js'

const app = createApp()

const server = app.listen(env.PORT, () => {
  console.log(`Servidor rodando em http://localhost:${env.PORT}`)
})

async function shutdown() {
  console.log('Encerrando servidor...')
  server.close()
  await prisma.$disconnect()
  process.exit(0)
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
