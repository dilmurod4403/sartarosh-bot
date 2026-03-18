import { Composer, Keyboard } from "grammy";

import { BotContext, SessionData } from "../types";
import prisma from "../../utils/prisma";
import { t } from "../../locales";
import { Language, Role } from "../../generated/prisma";
import { mainMenuKeyboard } from "./start";

const composer = new Composer<BotContext>();

// Til tanlash callback
composer.callbackQuery(/^lang:(UZ|RU)$/, async (ctx) => {
  const lang = ctx.match[1] as Language;
  ctx.session.data = { name: undefined };
  ctx.session.step = `register_name:${lang}`;

  const l = t(lang);
  await ctx.answerCallbackQuery();
  await ctx.editMessageText(l.welcome);
});

// Ism kiritish
composer.on("message:text", async (ctx, next) => {
  const step = ctx.session.step;

  if (!step.startsWith("register_name:")) return next();

  const lang = step.split(":")[1] as Language;
  const l = t(lang);
  const name = ctx.message.text.trim();

  ctx.session.data.name = name;
  ctx.session.step = `register_phone:${lang}`;

  const keyboard = new Keyboard()
    .requestContact(l.shareContact)
    .resized()
    .oneTime();

  await ctx.reply(l.askPhone, { reply_markup: keyboard });
});

// Telefon raqam
composer.on("message:contact", async (ctx) => {
  const step = ctx.session.step;
  if (!step.startsWith("register_phone:")) return;

  const lang = step.split(":")[1] as Language;
  const l = t(lang);

  const telegramId = String(ctx.from!.id);
  const name = ctx.session.data.name ?? ctx.from!.first_name;
  const phone = ctx.message.contact.phone_number;

  const user = await prisma.user.upsert({
    where: { telegramId },
    update: { name, phone, language: lang },
    create: { telegramId, name, phone, language: lang },
    include: { salonUsers: true },
  });

  ctx.session.step = "idle";
  ctx.session.data = {};

  const role = user.salonUsers[0]?.role ?? Role.CLIENT;

  await ctx.reply(l.registered, {
    reply_markup: mainMenuKeyboard(l, role),
  });
});

export const registrationHandler = composer;
