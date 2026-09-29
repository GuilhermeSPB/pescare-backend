import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient, Prisma } from "../../generated/prisma/client.js";
import { env } from "./env.js";

//Cliente Prisma para conexão com o banco de dados PostgreSQL'
const adapter = new PrismaPg({ connectionString: env.DATABASE_URL });
const prisma = new PrismaClient({ adapter });

export { prisma, Prisma };
