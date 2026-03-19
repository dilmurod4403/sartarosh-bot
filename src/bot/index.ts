import { Bot, session } from "grammy";
import { BotContext, SessionData } from "./types";
import { startHandler } from "./handlers/start";
import { registrationHandler } from "./handlers/registration";
import { adminPanelHandler } from "./handlers/adminPanel";
import { appointmentHandler } from "./handlers/appointment";
import { myAppointmentsHandler } from "./handlers/myAppointments";
import { settingsHandler } from "./handlers/settings";
import { barberHandler } from "./handlers/barber";
import logger from "../utils/logger";
import { sendAdminAlert } from "../services/adminNotifier";

export function createBot(token: string) {
  const bot = new Bot<BotContext>(token);

  bot.use(
    session({
      initial: (): SessionData => ({
        step: "idle",
        data: {},
      }),
    })
  );

  bot.command("start", startHandler);
  bot.command("menu", startHandler);
  bot.hears(["🏠 Bosh menyu", "🏠 Главное меню"], startHandler);
  bot.command("reset", async (ctx) => {
    ctx.session.step = "idle";
    ctx.session.data = {};
    await ctx.reply("Sessiya tiklandi ✅");
  });
  bot.use(registrationHandler);
  bot.use(adminPanelHandler);
  bot.use(appointmentHandler);
  bot.use(myAppointmentsHandler);
  bot.use(settingsHandler);
  bot.use(barberHandler);

  bot.catch((err) => {
    const ctx = err.ctx;
    const context: Record<string, unknown> = {
      update_id: ctx.update.update_id,
      from_id: ctx.from?.id,
      chat_id: ctx.chat?.id,
    };

    logger.error(
      { context, error: err.error instanceof Error ? err.error.message : String(err.error) },
      "Bot unhandled error"
    );

    void sendAdminAlert(
      "Bot unhandled error",
      err.error instanceof Error ? err.error : new Error(String(err.error)),
      context
    );
  });

  return bot;
}
