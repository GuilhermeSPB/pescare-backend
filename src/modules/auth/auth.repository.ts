import { prisma } from "@core/prisma.js";

export interface CreateUserData {
  email: string;
  name: string;
  password: string;
  fk_municipality_ibge_code: string;
  role: "FISHER";
}

export const authRepository = {
  getUserByEmail: async (email: string) => {
    return await prisma.users.findUnique({
      where: { email },
    });
  },
  createUser: async (data: CreateUserData) => {
    return await prisma.users.create({
      data,
    });
  },
};
