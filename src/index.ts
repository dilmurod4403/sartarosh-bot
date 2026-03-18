import "dotenv/config";
import { createBot } from "./bot";
import { setBotInstance } from "./services/notifications";
import { startReminderJobs } from "./jobs/reminders";
import { createServer } from "./api/server";

const token = process.env.BOT_TOKEN;
if (!token) throw new Error("BOT_TOKEN is required in .env");

const bot = createBot(token);
setBotInstance(bot);
startReminderJobs();

// API server
createServer().then((app) => {
  const port = parseInt(process.env.PORT ?? "3000");
  app.listen({ port, host: "0.0.0.0" }, (err) => {
    if (err) throw err;
    console.log(`✅ API server: http://localhost:${port}`);
  });
});

bot.start({
  onStart: async (info) => {
    console.log(`✅ Bot started: @${info.username}`);
    await bot.api.setMyCommands([
      { command: "start", description: "Botni ishga tushirish" },
      { command: "menu", description: "🏠 Bosh menyuga qaytish" },
    ]);
  },
});
