import { InlineKeyboard } from "grammy";
import prisma from "../utils/prisma";
import { t } from "../locales";
import dayjs from "dayjs";

let botInstance: any = null;

export function setBotInstance(bot: any) {
  botInstance = bot;
}

export async function notifyBarberNewAppointment(appointmentId: number) {
  if (!botInstance) return;

  const appt = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      client: true,
      barber: { include: { user: true } },
    },
  });

  if (!appt) return;

  const date = dayjs(appt.startTime).format("DD.MM.YYYY");
  const time = dayjs(appt.startTime).format("HH:mm");

  const keyboard = new InlineKeyboard()
    .text("✅ Tasdiqlash", `barber:confirm:${appointmentId}`)
    .text("🔄 Vaqtni o'zgartirish", `barber:reschedule:${appointmentId}`)
    .row()
    .text("❌ Rad etish", `barber:decline:${appointmentId}`);

  const text =
    `📅 Yangi zakaz!\n\n` +
    `👤 Mijoz: ${appt.client.name}\n` +
    `📞 Tel: ${appt.client.phone ?? "Noma'lum"}\n` +
    `🕐 Vaqt: ${date}, ${time}`;

  await botInstance.api.sendMessage(appt.barber.user.telegramId, text, {
    reply_markup: keyboard,
  });

  await prisma.notification.create({
    data: {
      appointmentId,
      type: "NEW_APPOINTMENT",
    },
  });
}

export async function sendReminderNotification(
  appointmentId: number,
  type: "1H" | "24H"
) {
  if (!botInstance) return;

  const appt = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: {
      client: true,
      barber: { include: { user: true } },
    },
  });

  if (!appt || appt.status !== "CONFIRMED") return;

  const date = dayjs(appt.startTime).format("DD.MM.YYYY");
  const time = dayjs(appt.startTime).format("HH:mm");
  const clientLang = t(appt.client.language);

  const message =
    type === "1H"
      ? clientLang.reminder1h(time)
      : clientLang.reminder24h(date, time);

  // Mijozga
  await botInstance.api.sendMessage(appt.client.telegramId, message);

  // Sartaroshga ham 1 soat oldin eslatma
  if (type === "1H") {
    await botInstance.api.sendMessage(
      appt.barber.user.telegramId,
      `⏰ ${appt.client.name} — ${time} da keladi`
    );
  }

  await prisma.notification.create({
    data: {
      appointmentId,
      type: `REMINDER_${type}`,
    },
  });
}
