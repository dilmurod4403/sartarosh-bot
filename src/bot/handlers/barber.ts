import { Composer, InlineKeyboard } from "grammy";

import { BotContext, SessionData } from "../types";
import prisma from "../../utils/prisma";
import { t } from "../../locales";
import dayjs from "dayjs";
import { AppointmentStatus } from "../../generated/prisma";

const composer = new Composer<BotContext>();

// Sartaroshga yangi zakaz kelganda inline buttonlar orqali boshqaruv
composer.callbackQuery(/^barber:confirm:(\d+)$/, async (ctx) => {
  const appointmentId = parseInt(ctx.match[1]);

  const appt = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: { client: true },
  });

  if (!appt) {
    await ctx.answerCallbackQuery("Zakaz topilmadi");
    return;
  }

  await prisma.appointment.update({
    where: { id: appointmentId },
    data: { status: AppointmentStatus.CONFIRMED },
  });

  const date = dayjs(appt.startTime).format("DD.MM.YYYY");
  const time = dayjs(appt.startTime).format("HH:mm");
  const clientLang = t(appt.client.language);

  // Mijozga xabar yuborish
  await ctx.api.sendMessage(
    appt.client.telegramId,
    clientLang.appointmentConfirmed(date, time)
  );

  await ctx.answerCallbackQuery("✅ Tasdiqlandi");
  await ctx.editMessageReplyMarkup({ reply_markup: new InlineKeyboard() });
  await ctx.reply(`✅ Zakaz tasdiqlandi — ${appt.client.name}, ${date} ${time}`);
});

// Vaqtni o'zgartirish — barber yangi slot tanlaydi
composer.callbackQuery(/^barber:reschedule:(\d+)$/, async (ctx) => {
  const appointmentId = parseInt(ctx.match[1]);
  ctx.session.data.appointmentId = appointmentId;
  ctx.session.step = "barber_reschedule_select_day";

  const appt = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: { barber: true },
  });

  if (!appt) return;

  const { getAvailableDays } = await import("../../services/slots");
  const days = await getAvailableDays(appt.barberId);

  const keyboard = new InlineKeyboard();
  days.forEach((day) => {
    const label = dayjs(day).format("DD.MM (ddd)");
    keyboard.text(label, `barber:newday:${appointmentId}:${day}`).row();
  });

  await ctx.answerCallbackQuery();
  await ctx.editMessageText("Yangi kun tanlang:", { reply_markup: keyboard });
});

composer.callbackQuery(/^barber:newday:(\d+):(.+)$/, async (ctx) => {
  const appointmentId = parseInt(ctx.match[1]);
  const date = ctx.match[2];

  const appt = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: { barber: true },
  });

  if (!appt) return;

  const { getAvailableSlots } = await import("../../services/slots");
  const slots = await getAvailableSlots(appt.barberId, date);

  const keyboard = new InlineKeyboard();
  slots.forEach((slot, i) => {
    keyboard.text(slot, `barber:newtime:${appointmentId}:${date}:${slot}`);
    if ((i + 1) % 3 === 0) keyboard.row();
  });

  await ctx.answerCallbackQuery();
  await ctx.editMessageText("Yangi vaqt tanlang:", { reply_markup: keyboard });
});

composer.callbackQuery(/^barber:newtime:(\d+):(.+):(.+)$/, async (ctx) => {
  const appointmentId = parseInt(ctx.match[1]);
  const date = ctx.match[2];
  const time = ctx.match[3];

  const appt = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: { barber: true, client: true },
  });

  if (!appt) return;

  const newStart = dayjs(`${date} ${time}`).toDate();
  const newEnd = dayjs(newStart).add(appt.barber.slotDuration, "minute").toDate();

  await prisma.appointment.update({
    where: { id: appointmentId },
    data: {
      startTime: newStart,
      endTime: newEnd,
      status: AppointmentStatus.RESCHEDULED,
    },
  });

  const clientLang = t(appt.client.language);
  const keyboard = new InlineKeyboard()
    .text(clientLang.yes, `myappt:reschedule:accept:${appointmentId}`)
    .text(clientLang.no, `myappt:reschedule:decline:${appointmentId}`);

  // Mijozga yangi vaqt taklifi
  await ctx.api.sendMessage(
    appt.client.telegramId,
    clientLang.appointmentRescheduled(dayjs(newStart).format("DD.MM.YYYY"), time),
    { reply_markup: keyboard }
  );

  await ctx.answerCallbackQuery();
  await ctx.editMessageText(`🔄 Yangi vaqt taklif qilindi: ${date} ${time}. Mijoz javobini kutmoqda.`);
});

// Rad etish
composer.callbackQuery(/^barber:decline:(\d+)$/, async (ctx) => {
  const appointmentId = parseInt(ctx.match[1]);

  const appt = await prisma.appointment.findUnique({
    where: { id: appointmentId },
    include: { client: true },
  });

  if (!appt) return;

  await prisma.appointment.update({
    where: { id: appointmentId },
    data: {
      status: AppointmentStatus.CANCELLED,
      cancelReason: "Sartarosh tomonidan rad etildi",
    },
  });

  const clientLang = t(appt.client.language);
  await ctx.api.sendMessage(
    appt.client.telegramId,
    clientLang.appointmentCancelled("Sartarosh band")
  );

  await ctx.answerCallbackQuery("❌ Rad etildi");
  await ctx.editMessageReplyMarkup({ reply_markup: new InlineKeyboard() });
  await ctx.reply(`❌ Zakaz rad etildi — ${appt.client.name}`);
});

export const barberHandler = composer;
