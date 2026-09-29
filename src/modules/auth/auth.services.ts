import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { Prisma } from "@core/prisma.js";
import { env } from "@core/env.js";
import { AppError } from "@shared/errors/app-error.js";
import { authRepository } from "./auth.repository.js";
import { signInSchema, signUpSchema } from "./auth.schema.js";

const SALT_ROUNDS = 10;

export const authServices = {
  /**
   * Cria um novo usuário (sempre com role FISHER via cadastro público).
   */
  signUp: async (payload: unknown) => {
    const data = signUpSchema.parse(payload);

    const existingUser = await authRepository.getUserByEmail(data.email);

    if (existingUser) {
      throw new AppError("E-mail já cadastrado", 409);
    }

    const hashedPassword = await bcrypt.hash(data.password, SALT_ROUNDS);

    try {
      const user = await authRepository.createUser({
        name: data.name,
        email: data.email,
        password: hashedPassword,
        fk_municipality_ibge_code: data.fk_municipality_ibge_code,
        role: "FISHER",
      });

      const { password: _password, ...safeUser } = user;

      return safeUser;
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        if (error.code === "P2003") {
          throw new AppError("Município informado não existe", 400);
        }

        if (error.code === "P2002") {
          throw new AppError("E-mail já cadastrado", 409);
        }
      }

      throw error;
    }
  },

  /**
   * Autentica o usuário e retorna um token JWT.
   */
  signIn: async (payload: unknown) => {
    const data = signInSchema.parse(payload);

    const user = await authRepository.getUserByEmail(data.email);

    if (!user) {
      throw new AppError("Credenciais inválidas", 401);
    }

    const passwordMatches = await bcrypt.compare(
      data.password,
      user.password,
    );

    if (!passwordMatches) {
      throw new AppError("Credenciais inválidas", 401);
    }

    const token = jwt.sign(
      { sub: String(user.id), role: user.role },
      env.JWT_SECRET,
      { expiresIn: "1d" },
    );

    const { password: _password, ...safeUser } = user;

    return { token, user: safeUser };
  },
};
