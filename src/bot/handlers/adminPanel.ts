import { Composer, InlineKeyboard } from "grammy";
import { BotContext } from "../types";

const composer = new Composer<BotContext>();

composer.hears([/🛠/, /Admin panel/], async (ctx) => {
  const webappUrl = process.env.WEBAPP_URL!;

  const keyboard = new InlineKeyboard().webApp("🛠 Admin panelni ochish", webappUrl);

  await ctx.reply("Admin panelni ochish uchun tugmani bosing:", {
    reply_markup: keyboard,
  });
});

export const adminPanelHandler = composer;
