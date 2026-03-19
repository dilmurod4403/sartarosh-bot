import { Composer, InlineKeyboard } from "grammy";
import { BotContext } from "../types";
import prisma from "../../utils/prisma";
import { t } from "../../locales";

const composer = new Composer<BotContext>();

composer.hears([/🛠 Admin panel/, /📊 Boshqaruv paneli/, /📊 Панель управления/], async (ctx) => {
  const telegramId = String(ctx.from!.id);
  const user = await prisma.user.findUnique({ where: { telegramId }, include: { salonUsers: true } });
  if (!user) return;
  const role = user.salonUsers[0]?.role;
  if (role !== "ADMIN" && role !== "BARBER") return;
  const lang = t(user.language);

  const webappUrl = process.env.WEBAPP_URL!;
  const keyboard = new InlineKeyboard().webApp("🛠 Admin panelni ochish", webappUrl);

  await ctx.reply(lang.openAdminPanel, {
    reply_markup: keyboard,
  });
});

export const adminPanelHandler = composer;
