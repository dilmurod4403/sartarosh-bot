import { Composer, InlineKeyboard } from "grammy";

import { BotContext, SessionData } from "../types";
import prisma from "../../utils/prisma";
import { t } from "../../locales";
import { notifyBarberRescheduleAccepted } from "../../services/notifications";
import dayjs from "dayjs";
import { AppointmentStatus } from "../../generated/prisma";

const composer = new Composer<BotContext>();

composer.hears([/📋/, /Mening zakazlarim/, /Мои записи/], async (ctx, next) => {
  const telegramId = String(ctx.from!.id);
  const user = await prisma.user.findUnique({
    where: { telegramId },
    include: { salonUsers: true },
  });
  if (!user) return;
  if (user.salonUsers[0]?.role === "BARBER") return next();
  const lang = t(user.language);

  const appointments = await prisma.appointment.findMany({
    where: {
      clientId: user.id,
      status: { in: [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED, AppointmentStatus.RESCHEDULED] },
      startTime: { gte: new Date() },
    },
    include: { barber: { include: { user: true } } },
    orderBy: { startTime: "asc" },
  });

  if (appointments.length === 0) {
    await ctx.reply(lang.noOrders);
    return;
  }

  for (const appt of appointments) {
    const date = dayjs(appt.startTime).format("DD.MM.YYYY");
    const time = dayjs(appt.startTime).format("HH:mm");
    const statusEmoji =
      appt.status === "CONFIRMED" ? "✅" : appt.status === "PENDING" ? "⏳" : "🔄";

    const text =
      `${statusEmoji} ${date} ${time}\n` +
      `💈 ${appt.barber.user.name}`;

    const keyboard = new InlineKeyboard().text(
      lang.cancel,
      `myappt:cancel:${appt.id}`
    );

    await ctx.reply(text, { reply_markup: keyboard });
  }
});

// Zakazni bekor qilish
composer.callbackQuery(/^myappt:cancel:(\d+)$/, async (ctx) => {
  const appointmentId = parseInt(ctx.match[1]);
  const telegramId = String(ctx.from!.id);
  const user = await prisma.user.findUnique({ where: { telegramId } });
  if (!user) return;
  const lang = t(user.language);

  const appt = await prisma.appointment.findUnique({
    where: { id: appointmentId },
  });

  if (!appt || appt.clientId !== user.id) {
    await ctx.answerCallbackQuery("Zakaz topilmadi");
    return;
  }

  // 1 soat oldin tekshirish
  const oneHourBefore = dayjs(appt.startTime).subtract(1, "hour");
  if (dayjs().isAfter(oneHourBefore)) {
    await ctx.answerCallbackQuery();
    await ctx.reply(lang.cancelTooLate);
    return;
  }

  await prisma.appointment.update({
    where: { id: appointmentId },
    data: { status: AppointmentStatus.CANCELLED, cancelReason: "Mijoz tomonidan bekor qilindi" },
  });

  await ctx.answerCallbackQuery();
  await ctx.editMessageText(lang.cancelSuccess);
});

// Sartarosh taklif qilgan yangi vaqtni tasdiqlash/rad etish
composer.callbackQuery(/^myappt:reschedule:(accept|decline):(\d+)$/, async (ctx) => {
  const action = ctx.match[1];
  const appointmentId = parseInt(ctx.match[2]);
  const telegramId = String(ctx.from!.id);
  const user = await prisma.user.findUnique({ where: { telegramId } });
  if (!user) return;
  const lang = t(user.language);

  if (action === "accept") {
    await prisma.appointment.update({
      where: { id: appointmentId },
      data: { status: AppointmentStatus.CONFIRMED },
    });
    await notifyBarberRescheduleAccepted(appointmentId);
    await ctx.answerCallbackQuery();
    await ctx.editMessageText("✅ Yangi vaqt tasdiqlandi!");
  } else {
    await prisma.appointment.update({
      where: { id: appointmentId },
      data: { status: AppointmentStatus.CANCELLED, cancelReason: "Mijoz yangi vaqtni rad etdi" },
    });
    await ctx.answerCallbackQuery();
    await ctx.editMessageText(lang.cancelSuccess);
  }
});

export const myAppointmentsHandler = composer;
