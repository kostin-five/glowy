import express from "express";
import { body, validationResult } from "express-validator";
import { prisma } from "../lib/prisma.js";
import { authMiddleware } from "../middleware/auth.middleware.js";

const router = express.Router();

router.use(authMiddleware);

router.get("/progress", async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        xp: true,
        level: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: "Пользователь не найден" });
    }

    res.json(user);
  } catch (e) {
    res.status(500).json({ error: "Ошибка при загрузке прогресса" });
  }
});

router.put(
  "/energy",
  [
    body("currentEnergy").optional().isNumeric().withMessage("Должно быть числом"),
    body("energyLimit").optional().isNumeric().withMessage("Должно быть числом"),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }
      const rawEnergy = req.body.currentEnergy ?? req.body.energyLimit;
    const currentEnergy = Math.min(100, Math.max(0, Number(rawEnergy)));

    if (Number.isNaN(currentEnergy)) {
      return res.status(400).json({ error: "Некорректный уровень энергии" });
    }

    const updatedUser = await prisma.user.update({
      where: { id: req.user.id },
      data: { currentEnergy },
    });
    res.json(updatedUser);
  } catch (e) {
    res.status(500).json({ error: "Ошибка при обновлении" });
  }
});

export default router;
