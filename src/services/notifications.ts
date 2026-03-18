import { InlineKeyboard, Bot, Context } from "grammy";
import prisma from "../utils/prisma";
import { t } from "../locales";
import dayjs from "dayjs";
import logger from "../utils/logger";
import { sendAdminAlert } from "./adminNotifier";

let botInstance: Bot<Context> | null = null;

export function setBotInstance(bot: Bot<Context>) {
  botInstance = bot;
}

export async function notifyBarberRescheduleAccepted(appointmentId: number) {
  if (!botInstance) return;

  const appt = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: { client: true, barber: { include: { user: true } } },
  });

  if (!appt) return;

  const date = dayjs(appt.startTime).format("DD.MM.YYYY");
  const time = dayjs(appt.startTime).format("HH:mm");

  try {
    await botInstance.api.sendMessage(
      appt.barber.user.telegramId,
      `✅ Mijoz yangi vaqtni qabul qildi!\n👤 ${appt.client.name}\n📅 ${date}, ${time}`
    );
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    logger.error(
      { error: error.message, appointmentId },
      "notifyBarberRescheduleAccepted: sendMessage xatosi"
    );
    await sendAdminAlert(
      "notifyBarberRescheduleAccepted: sendMessage xatosi",
      error,
      { appointmentId, barberId: appt.barber.user.telegramId }
    );
  }
}

export async function notifyCancelledToClient(appointmentId: number, reason: string) {
  if (!botInstance) return;

  const appt = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: { client: true },
  });

  if (!appt) return;

  const clientLang = t(appt.client.language);
  try {
    await botInstance.api.sendMessage(
      appt.client.telegramId,
      clientLang.appointmentCancelled(reason)
    );
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    logger.error(
      { error: error.message, appointmentId },
      "notifyCancelledToClient: sendMessage xatosi"
    );
    await sendAdminAlert(
      "notifyCancelledToClient: sendMessage xatosi",
      error,
      { appointmentId, clientId: appt.client.telegramId }
    );
  }
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

  try {
    await botInstance.api.sendMessage(appt.barber.user.telegramId, text, {
      reply_markup: keyboard,
    });
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    logger.error(
      { error: error.message, appointmentId },
      "notifyBarberNewAppointment: sendMessage xatosi"
    );
    await sendAdminAlert(
      "notifyBarberNewAppointment: sendMessage xatosi",
      error,
      { appointmentId, barberId: appt.barber.user.telegramId }
    );
  }

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

  try {
    // Mijozga
    await botInstance.api.sendMessage(appt.client.telegramId, message);

    // Sartaroshga ham 1 soat oldin eslatma
    if (type === "1H") {
      await botInstance.api.sendMessage(
        appt.barber.user.telegramId,
        `⏰ ${appt.client.name} — ${time} da keladi`
      );
    }
  } catch (err) {
    const error = err instanceof Error ? err : new Error(String(err));
    logger.error(
      { error: error.message, appointmentId, type },
      "sendReminderNotification: sendMessage xatosi"
    );
    await sendAdminAlert(
      "sendReminderNotification: sendMessage xatosi",
      error,
      { appointmentId, type, clientId: appt.client.telegramId }
    );
  }

  await prisma.notification.create({
    data: {
      appointmentId,
      type: `REMINDER_${type}`,
    },
  });
}
