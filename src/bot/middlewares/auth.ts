import { NextFunction } from "grammy";
import { BotContext } from "../types";
import prisma from "../../utils/prisma";
import { Language } from "../../generated/prisma";
import { t } from "../../locales";

export async function authMiddleware(ctx: BotContext, next: NextFunction) {
  if (!ctx.from) return next();

  const telegramId = String(ctx.from.id);
  const user = await prisma.user.findUnique({ where: { telegramId } });

  if (!user && ctx.message?.text !== "/start") {
    await ctx.reply(t(Language.UZ).welcome);
    return;
  }

  return next();
}
