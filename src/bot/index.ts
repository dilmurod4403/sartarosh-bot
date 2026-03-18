import { Bot, session } from "grammy";
import { BotContext, SessionData } from "./types";
import { startHandler } from "./handlers/start";
import { registrationHandler } from "./handlers/registration";
import { adminPanelHandler } from "./handlers/adminPanel";
import { appointmentHandler } from "./handlers/appointment";
import { myAppointmentsHandler } from "./handlers/myAppointments";
import { settingsHandler } from "./handlers/settings";
import { barberHandler } from "./handlers/barber";

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
  bot.use(registrationHandler);
  bot.use(adminPanelHandler);
  bot.use(appointmentHandler);
  bot.use(myAppointmentsHandler);
  bot.use(settingsHandler);
  bot.use(barberHandler);

  bot.catch((err) => {
    console.error("Bot error:", err);
  });

  return bot;
}
