import { InlineKeyboard, Keyboard } from "grammy";
import { BotContext } from "../types";
import prisma from "../../utils/prisma";
import { t } from "../../locales";
import { Role } from "../../generated/prisma";

export async function startHandler(ctx: BotContext) {
  const telegramId = String(ctx.from!.id);

  const user = await prisma.user.findUnique({
    where: { telegramId },
    include: { salonUsers: true },
  });

  if (user) {
    const role = user.salonUsers[0]?.role ?? Role.CLIENT;
    const lang = t(user.language);
    await ctx.reply(lang.menu, { reply_markup: mainMenuKeyboard(lang, role) });
    return;
  }

  const keyboard = new InlineKeyboard()
    .text("🇺🇿 O'zbek", "lang:UZ")
    .text("🇷🇺 Русский", "lang:RU");

  await ctx.reply("Tilni tanlang / Выберите язык:", { reply_markup: keyboard });
}

export function mainMenuKeyboard(lang: ReturnType<typeof t>, role: Role = Role.CLIENT) {
  const kb = new Keyboard();

  if (role === Role.ADMIN) {
    kb.text(lang.btnAdminPanel).row()
      .text(lang.btnNewAppointment).row()
      .text(lang.btnMyAppointments)
      .text(lang.btnSettings);
  } else if (role === Role.BARBER) {
    kb.text(lang.btnAdminPanel).row()
      .text(lang.btnMyAppointments).row()
      .text(lang.btnSchedule).row()
      .text(lang.btnSettings);
  } else {
    kb.text(lang.btnNewAppointment)
      .row()
      .text(lang.btnMyAppointments)
      .text(lang.btnSettings);
  }

  return kb.resized();
}
