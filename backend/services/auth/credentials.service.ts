import bcrypt from "bcryptjs";
import type { PrismaClient, User } from "@prisma/client";
import { isUnknownRecord } from "../../types/boundaries.js";

export class CredentialsError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(code: string, message: string, status = 400) {
    super(message);
    this.name = "CredentialsError";
    this.code = code;
    this.status = status;
  }
}

export const normalizeAuthEmail = (body: unknown = {}): string => {
  if (!isUnknownRecord(body)) return "";
  return String(body.email || body.login || "").trim().toLowerCase();
};

interface RegistrationInput {
  name?: unknown;
  email?: unknown;
  password?: unknown;
}

export const validateRegistrationInput = ({
  name,
  email,
  password,
}: RegistrationInput): { name: string; email: string; password: string } => {
  const normalizedName = typeof name === "string" ? name.trim() : "";
  const normalizedEmail = String(email || "").trim().toLowerCase();
  if (
    !normalizedName ||
    normalizedName.length > 100 ||
    !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizedEmail) ||
    typeof password !== "string" ||
    password.length < 8 ||
    password.length > 20
  ) {
    throw new CredentialsError("AUTH_INVALID_INPUT", "Некорректные данные");
  }
  return { name: normalizedName, email: normalizedEmail, password };
};

type CredentialsDb = Pick<PrismaClient, "user">;

export const createUserWithCredentials = async ({
  db,
  input,
}: {
  db: CredentialsDb;
  input: RegistrationInput;
}): Promise<User> => {
  const value = validateRegistrationInput(input);
  const candidate = await db.user.findUnique({ where: { email: value.email } });
  if (candidate) {
    throw new CredentialsError(
      "AUTH_REGISTRATION_REJECTED",
      "Не удалось зарегистрироваться. Проверьте данные или попробуйте войти."
    );
  }
  return db.user.create({
    data: {
      name: value.name,
      email: value.email,
      password: await bcrypt.hash(value.password, 10),
    },
  });
};

export const verifyUserCredentials = async ({
  db,
  email,
  password,
}: {
  db: CredentialsDb;
  email: unknown;
  password: unknown;
}): Promise<User> => {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  const user = normalizedEmail
    ? await db.user.findUnique({ where: { email: normalizedEmail } })
    : null;
  if (!user || typeof password !== "string" || password.length > 128 || !await bcrypt.compare(password, user.password)) {
    throw new CredentialsError(
      "AUTH_INVALID_CREDENTIALS",
      "Неверный email или пароль"
    );
  }
  return user;
};
