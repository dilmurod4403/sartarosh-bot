import { Composer, InlineKeyboard } from "grammy";

import { BotContext, SessionData } from "../types";
import prisma from "../../utils/prisma";
import { t } from "../../locales";
import { getAvailableDays, getAvailableSlots } from "../../services/slots";
import { notifyBarberNewAppointment } from "../../services/notifications";
import dayjs from "dayjs";

const composer = new Composer<BotContext>();

// Navbat olish tugmasi
composer.hears([/📅/, /Записаться/, /Navbat/], async (ctx) => {
  const telegramId = String(ctx.from!.id);
  const user = await prisma.user.findUnique({ where: { telegramId } });
  if (!user) return;
  const lang = t(user.language);

  // Til tanlash callbackdan keyin name so'rash bosqichiga o'tish
  // Avval sartaroshlarni ko'rsatamiz
  const barbers = await prisma.barber.findMany({
    where: { isActive: true },
    include: { user: true },
  });

  if (barbers.length === 0) {
    await ctx.reply("Hozircha sartaroshlar yo'q");
    return;
  }

  const keyboard = new InlineKeyboard();
  barbers.forEach((b) => {
    keyboard.text(b.user.name, `appt:barber:${b.id}`).row();
  });

  await ctx.reply(lang.chooseBarber, { reply_markup: keyboard });
});

// Sartarosh tanlash
composer.callbackQuery(/^appt:barber:(\d+)$/, async (ctx) => {
  const barberId = parseInt(ctx.match[1]);
  const telegramId = String(ctx.from!.id);
  const user = await prisma.user.findUnique({ where: { telegramId } });
  if (!user) return;
  const lang = t(user.language);

  ctx.session.data.barberId = barberId;

  const days = await getAvailableDays(barberId);

  if (days.length === 0) {
    await ctx.answerCallbackQuery();
    await ctx.editMessageText(lang.noSlots);
    return;
  }

  const keyboard = new InlineKeyboard();
  days.forEach((day) => {
    const label = dayjs(day).format("DD.MM (ddd)");
    keyboard.text(label, `appt:day:${day}`).row();
  });
  keyboard.text(lang.back, "appt:back:barbers");

  await ctx.answerCallbackQuery();
  await ctx.editMessageText(lang.chooseDay, { reply_markup: keyboard });
});

// Kun tanlash
composer.callbackQuery(/^appt:day:(.+)$/, async (ctx) => {
  const date = ctx.match[1];
  const telegramId = String(ctx.from!.id);
  const user = await prisma.user.findUnique({ where: { telegramId } });
  if (!user) return;
  const lang = t(user.language);

  ctx.session.data.selectedDate = date;

  const barberId = ctx.session.data.barberId!;
  const slots = await getAvailableSlots(barberId, date);

  if (slots.length === 0) {
    await ctx.answerCallbackQuery();
    await ctx.editMessageText(lang.noSlots);
    return;
  }

  const keyboard = new InlineKeyboard();
  slots.forEach((slot, i) => {
    keyboard.text(slot, `appt:time:${slot}`);
    if ((i + 1) % 3 === 0) keyboard.row();
  });
  keyboard.row().text(lang.back, `appt:barber:${barberId}`);

  await ctx.answerCallbackQuery();
  await ctx.editMessageText(lang.chooseTime, { reply_markup: keyboard });
});

// Vaqt tanlash — tasdiqlash
composer.callbackQuery(/^appt:time:(.+)$/, async (ctx) => {
  const time = ctx.match[1];
  const telegramId = String(ctx.from!.id);
  const user = await prisma.user.findUnique({
    where: { telegramId },
    include: { barberProfile: true },
  });
  if (!user) return;
  const lang = t(user.language);

  ctx.session.data.selectedTime = time;

  const barberId = ctx.session.data.barberId!;
  const date = ctx.session.data.selectedDate!;
  const barber = await prisma.barber.findUnique({
    where: { id: barberId },
    include: { user: true },
  });

  if (!barber) return;

  const keyboard = new InlineKeyboard()
    .text(lang.confirm, "appt:confirm")
    .text(lang.back, `appt:day:${date}`);

  await ctx.answerCallbackQuery();
  await ctx.editMessageText(
    lang.confirmAppointment(barber.user.name, dayjs(date).format("DD.MM.YYYY"), time),
    { reply_markup: keyboard }
  );
});

// Zakaz yaratish
composer.callbackQuery("appt:confirm", async (ctx) => {
  const telegramId = String(ctx.from!.id);
  const user = await prisma.user.findUnique({ where: { telegramId } });
  if (!user) return;
  const lang = t(user.language);

  const { barberId, selectedDate, selectedTime } = ctx.session.data;
  if (!barberId || !selectedDate || !selectedTime) return;

  const barber = await prisma.barber.findUnique({ where: { id: barberId } });
  if (!barber) return;

  const startTime = dayjs(`${selectedDate} ${selectedTime}`).toDate();
  const endTime = dayjs(startTime).add(barber.slotDuration, "minute").toDate();

  const appointment = await prisma.appointment.create({
    data: {
      clientId: user.id,
      barberId,
      startTime,
      endTime,
      status: "PENDING",
    },
  });

  // Sessiyani tozalash
  ctx.session.data = {};
  ctx.session.step = "idle";

  await ctx.answerCallbackQuery();
  await ctx.editMessageText(lang.appointmentCreated);

  // Sartaroshga notification yuborish
  await notifyBarberNewAppointment(appointment.id);
});

export const appointmentHandler = composer;
