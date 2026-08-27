import bcrypt from "bcryptjs";

export class CredentialsError extends Error {
  constructor(code, message, status = 400) {
    super(message);
    this.name = "CredentialsError";
    this.code = code;
    this.status = status;
  }
}

export const normalizeAuthEmail = (body = {}) =>
  String(body.email || body.login || "").trim().toLowerCase();

export const validateRegistrationInput = ({ name, email, password }) => {
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

export const createUserWithCredentials = async ({ db, input }) => {
  const value = validateRegistrationInput(input);
  const candidate = await db.user.findUnique({ where: { email: value.email } });
  if (candidate) {
    throw new CredentialsError(
      "AUTH_EMAIL_EXISTS",
      "Пользователь с таким email уже существует"
    );
  }
  return db.user.create({
    data: {
      name: value.name,
      email: value.email,
      password: bcrypt.hashSync(value.password, 10),
    },
  });
};

export const verifyUserCredentials = async ({ db, email, password }) => {
  const normalizedEmail = String(email || "").trim().toLowerCase();
  const user = normalizedEmail
    ? await db.user.findUnique({ where: { email: normalizedEmail } })
    : null;
  if (!user || typeof password !== "string" || !bcrypt.compareSync(password, user.password)) {
    throw new CredentialsError(
      "AUTH_INVALID_CREDENTIALS",
      "Неверный email или пароль"
    );
  }
  return user;
};
