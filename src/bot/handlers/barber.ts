import { Composer, InlineKeyboard } from "grammy";

import { BotContext, SessionData } from "../types";
import prisma from "../../utils/prisma";
import { t } from "../../locales";
import dayjs from "dayjs";
import { AppointmentStatus } from "../../generated/prisma";

const composer = new Composer<BotContext>();

// Barber o'z zakazlarini ko'rish
composer.hears([/📋/, /Mening zakazlarim/, /Мои записи/], async (ctx) => {
  const telegramId = String(ctx.from!.id);
  const user = await prisma.user.findUnique({
    where: { telegramId },
    include: { salonUsers: true, barberProfile: true },
  });
  if (!user || user.salonUsers[0]?.role !== "BARBER") return;
  if (!user.barberProfile) return;

  const lang = t(user.language);

  const appointments = await prisma.appointment.findMany({
    where: {
      barberId: user.barberProfile.id,
      status: { in: [AppointmentStatus.PENDING, AppointmentStatus.CONFIRMED, AppointmentStatus.RESCHEDULED] },
      startTime: { gte: new Date() },
    },
    include: { client: true },
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

    const keyboard = new InlineKeyboard();
    if (appt.status === "PENDING") {
      keyboard.text("✅ Tasdiqlash", `barber:confirm:${appt.id}`).row();
    }
    keyboard
      .text("🔄 Vaqtni o'zgartirish", `barber:reschedule:${appt.id}`)
      .row()
      .text("❌ Rad etish", `barber:decline:${appt.id}`);

    await ctx.reply(
      `${statusEmoji} ${date} ${time}\n👤 ${appt.client.name}\n📞 ${appt.client.phone ?? "Noma'lum"}`,
      { reply_markup: keyboard }
    );
  }
});

// Jadval ko'rish
composer.hears([/🗓/, /Mening jadvalim/, /Мой график/], async (ctx) => {
  const telegramId = String(ctx.from!.id);
  const user = await prisma.user.findUnique({
    where: { telegramId },
    include: { salonUsers: true, barberProfile: { include: { schedules: true } } },
  });
  if (!user || user.salonUsers[0]?.role !== "BARBER" || !user.barberProfile) return;

  const days = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY", "SUNDAY"];
  const dayNames: Record<string, string> = {
    MONDAY: "Dushanba", TUESDAY: "Seshanba", WEDNESDAY: "Chorshanba",
    THURSDAY: "Payshanba", FRIDAY: "Juma", SATURDAY: "Shanba", SUNDAY: "Yakshanba",
  };

  const keyboard = new InlineKeyboard();
  days.forEach((day) => {
    const schedule = user.barberProfile!.schedules.find((s) => s.dayOfWeek === day as any);
    const status = schedule?.isDayOff === false ? `${schedule.startTime}-${schedule.endTime}` : "Dam olish";
    keyboard.text(`${dayNames[day]}: ${status}`, `sched:day:${day}`).row();
  });

  await ctx.reply("Jadvalingiz. Kunni bosib o'zgartiring:", { reply_markup: keyboard });
});

// Kun tanlash — dam olish/ish kuni toggle
composer.callbackQuery(/^sched:day:(.+)$/, async (ctx) => {
  const dayOfWeek = ctx.match[1];
  const telegramId = String(ctx.from!.id);
  const user = await prisma.user.findUnique({
    where: { telegramId },
    include: { barberProfile: { include: { schedules: true } } },
  });
  if (!user?.barberProfile) return;

  const schedule = user.barberProfile.schedules.find((s) => s.dayOfWeek === dayOfWeek as any);
  const dayNames: Record<string, string> = {
    MONDAY: "Dushanba", TUESDAY: "Seshanba", WEDNESDAY: "Chorshanba",
    THURSDAY: "Payshanba", FRIDAY: "Juma", SATURDAY: "Shanba", SUNDAY: "Yakshanba",
  };

  const keyboard = new InlineKeyboard()
    .text("✅ Ish kuni", `sched:setwork:${dayOfWeek}`).row()
    .text("🚫 Dam olish", `sched:setoff:${dayOfWeek}`).row()
    .text("⬅️ Orqaga", "sched:back");

  const currentStatus = schedule?.isDayOff === false
    ? `${schedule.startTime} — ${schedule.endTime}`
    : "Dam olish";

  await ctx.answerCallbackQuery();
  await ctx.editMessageText(
    `${dayNames[dayOfWeek]}: ${currentStatus}\n\nNimani o'zgartirmoqchisiz?`,
    { reply_markup: keyboard }
  );
});

// Dam olish kuni qilish
composer.callbackQuery(/^sched:setoff:(.+)$/, async (ctx) => {
  const dayOfWeek = ctx.match[1];
  const telegramId = String(ctx.from!.id);
  const user = await prisma.user.findUnique({
    where: { telegramId },
    include: { barberProfile: true },
  });
  if (!user?.barberProfile) return;

  await prisma.barberSchedule.upsert({
    where: { barberId_dayOfWeek: { barberId: user.barberProfile.id, dayOfWeek: dayOfWeek as any } },
    update: { isDayOff: true },
    create: { barberId: user.barberProfile.id, dayOfWeek: dayOfWeek as any, startTime: "09:00", endTime: "18:00", isDayOff: true },
  });

  await ctx.answerCallbackQuery("🚫 Dam olish kuni qilindi");
  await ctx.editMessageText(`🚫 ${dayOfWeek} — Dam olish kuni qilindi`);
});

// Ish kuni qilish — vaqt so'rash
composer.callbackQuery(/^sched:setwork:(.+)$/, async (ctx) => {
  const dayOfWeek = ctx.match[1];
  const telegramId = String(ctx.from!.id);
  const user = await prisma.user.findUnique({
    where: { telegramId },
    include: { barberProfile: { include: { schedules: true } } },
  });
  if (!user?.barberProfile) return;

  const schedule = user.barberProfile.schedules.find((s) => s.dayOfWeek === dayOfWeek as any);
  const start = schedule?.startTime ?? "09:00";
  const end = schedule?.endTime ?? "18:00";

  // Umumiy vaqt variantlari
  const timeOptions = ["08:00", "09:00", "10:00"];
  const endOptions = ["17:00", "18:00", "19:00", "20:00"];

  const keyboard = new InlineKeyboard();
  timeOptions.forEach((t) => keyboard.text(`Boshlanish: ${t}`, `sched:start:${dayOfWeek}:${t}`));
  keyboard.row();
  endOptions.forEach((t) => keyboard.text(`Tugash: ${t}`, `sched:end:${dayOfWeek}:${t}`));
  keyboard.row().text("✅ Saqlash", `sched:save:${dayOfWeek}:${start}:${end}`);

  ctx.session.data.schedDay = dayOfWeek;
  ctx.session.data.schedStart = start;
  ctx.session.data.schedEnd = end;

  await ctx.answerCallbackQuery();
  await ctx.editMessageText(
    `Ish vaqtini tanlang:\nBoshlanish: ${start}\nTugash: ${end}`,
    { reply_markup: keyboard }
  );
});

// Boshlanish vaqti tanlash
composer.callbackQuery(/^sched:start:([^:]+):(.+)$/, async (ctx) => {
  const dayOfWeek = ctx.match[1];
  const startTime = ctx.match[2];
  const endTime = ctx.session.data.schedEnd ?? "18:00";

  ctx.session.data.schedStart = startTime;

  const timeOptions = ["08:00", "09:00", "10:00"];
  const endOptions = ["17:00", "18:00", "19:00", "20:00"];
  const keyboard = new InlineKeyboard();
  timeOptions.forEach((t) => keyboard.text(`Boshlanish: ${t}`, `sched:start:${dayOfWeek}:${t}`));
  keyboard.row();
  endOptions.forEach((t) => keyboard.text(`Tugash: ${t}`, `sched:end:${dayOfWeek}:${t}`));
  keyboard.row().text("✅ Saqlash", `sched:save:${dayOfWeek}:${startTime}:${endTime}`);

  await ctx.answerCallbackQuery();
  await ctx.editMessageText(
    `Ish vaqtini tanlang:\nBoshlanish: ${startTime}\nTugash: ${endTime}`,
    { reply_markup: keyboard }
  );
});

// Tugash vaqti tanlash
composer.callbackQuery(/^sched:end:([^:]+):(.+)$/, async (ctx) => {
  const dayOfWeek = ctx.match[1];
  const endTime = ctx.match[2];
  const startTime = ctx.session.data.schedStart ?? "09:00";

  ctx.session.data.schedEnd = endTime;

  const timeOptions = ["08:00", "09:00", "10:00"];
  const endOptions = ["17:00", "18:00", "19:00", "20:00"];
  const keyboard = new InlineKeyboard();
  timeOptions.forEach((t) => keyboard.text(`Boshlanish: ${t}`, `sched:start:${dayOfWeek}:${t}`));
  keyboard.row();
  endOptions.forEach((t) => keyboard.text(`Tugash: ${t}`, `sched:end:${dayOfWeek}:${t}`));
  keyboard.row().text("✅ Saqlash", `sched:save:${dayOfWeek}:${startTime}:${endTime}`);

  await ctx.answerCallbackQuery();
  await ctx.editMessageText(
    `Ish vaqtini tanlang:\nBoshlanish: ${startTime}\nTugash: ${endTime}`,
    { reply_markup: keyboard }
  );
});

// Saqlash
composer.callbackQuery(/^sched:save:([^:]+):([^:]+):([^:]+)$/, async (ctx) => {
  const dayOfWeek = ctx.match[1];
  const startTime = ctx.match[2];
  const endTime = ctx.match[3];
  const telegramId = String(ctx.from!.id);
  const user = await prisma.user.findUnique({
    where: { telegramId },
    include: { barberProfile: true },
  });
  if (!user?.barberProfile) return;

  await prisma.barberSchedule.upsert({
    where: { barberId_dayOfWeek: { barberId: user.barberProfile.id, dayOfWeek: dayOfWeek as any } },
    update: { startTime, endTime, isDayOff: false },
    create: { barberId: user.barberProfile.id, dayOfWeek: dayOfWeek as any, startTime, endTime, isDayOff: false },
  });

  await ctx.answerCallbackQuery("✅ Saqlandi");
  await ctx.editMessageText(`✅ ${dayOfWeek}: ${startTime} — ${endTime}`);
});

// Orqaga
composer.callbackQuery("sched:back", async (ctx) => {
  await ctx.answerCallbackQuery();
  await ctx.deleteMessage();
});

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
    const slotKey = slot.replace(":", "-"); // "09:00" → "09-00"
    keyboard.text(slot, `barber:newtime:${appointmentId}:${date}:${slotKey}`);
    if ((i + 1) % 3 === 0) keyboard.row();
  });

  await ctx.answerCallbackQuery();
  await ctx.editMessageText("Yangi vaqt tanlang:", { reply_markup: keyboard });
});

composer.callbackQuery(/^barber:newtime:(\d+):([\d-]+):([\d-]+)$/, async (ctx) => {
  const appointmentId = parseInt(ctx.match[1]);
  const date = ctx.match[2];
  const time = ctx.match[3].replace("-", ":"); // "09-00" → "09:00"

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
