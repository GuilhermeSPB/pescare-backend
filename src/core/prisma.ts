import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'
import { env } from './env.js'

// A partir do Prisma 7, o PrismaClient nao aceita mais uma connection string
// direto - precisa de um "driver adapter" explicito. Isso substitui o antigo
// `url = env("DATABASE_URL")` que ficava no schema.prisma.
const adapter = new PrismaPg({ connectionString: env.DATABASE_URL })

// Evita criar multiplas instancias do PrismaClient durante hot-reload em
// desenvolvimento (cada reload do tsx recriaria uma conexao nova sem isso).
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient }

export const prisma = globalForPrisma.prisma ?? new PrismaClient({ adapter })

if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma
}
