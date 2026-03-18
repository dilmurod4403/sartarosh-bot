import { Composer, InlineKeyboard } from "grammy";
import { BotContext, SessionData } from "../types";

import prisma from "../../utils/prisma";
import { t } from "../../locales";
import { Language } from "../../generated/prisma";
import { mainMenuKeyboard } from "./start";

const composer = new Composer<BotContext>();

composer.hears([/⚙️/, /Настройки/, /Sozlamalar/], async (ctx) => {
  const telegramId = String(ctx.from!.id);
  const user = await prisma.user.findUnique({ where: { telegramId } });
  if (!user) return;

  const keyboard = new InlineKeyboard()
    .text("🇺🇿 O'zbek", "settings:lang:UZ")
    .text("🇷🇺 Русский", "settings:lang:RU");

  await ctx.reply(t(user.language).chooseLanguage, { reply_markup: keyboard });
});

composer.callbackQuery(/^settings:lang:(UZ|RU)$/, async (ctx) => {
  const telegramId = String(ctx.from!.id);
  const lang = ctx.match[1] as Language;

  const user = await prisma.user.update({
    where: { telegramId },
    data: { language: lang },
    include: { salonUsers: true },
  });

  await ctx.answerCallbackQuery();
  const l = t(user.language);
  const role = user.salonUsers[0]?.role;
  await ctx.editMessageText(l.settingsSaved);
  await ctx.reply(l.menu(user.name), { reply_markup: mainMenuKeyboard(l, role) });
});

export const settingsHandler = composer;
