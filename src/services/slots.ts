import dayjs from "dayjs";
import prisma from "../utils/prisma";
import { DayOfWeek } from "../generated/prisma";

const DAY_MAP: Record<number, DayOfWeek> = {
  0: DayOfWeek.SUNDAY,
  1: DayOfWeek.MONDAY,
  2: DayOfWeek.TUESDAY,
  3: DayOfWeek.WEDNESDAY,
  4: DayOfWeek.THURSDAY,
  5: DayOfWeek.FRIDAY,
  6: DayOfWeek.SATURDAY,
};

export async function getAvailableDays(barberId: number): Promise<string[]> {
  const barber = await prisma.barber.findUnique({
    where: { id: barberId },
    include: { schedules: true },
  });

  if (!barber) return [];

  const days: string[] = [];
  const today = dayjs();

  for (let i = 0; i <= 5; i++) {
    const date = today.add(i, "day");
    const dayOfWeek = DAY_MAP[date.day()];
    const schedule = barber.schedules.find(
      (s) => s.dayOfWeek === dayOfWeek && !s.isDayOff
    );
    if (schedule) {
      days.push(date.format("YYYY-MM-DD"));
    }
  }

  return days;
}

export async function getAvailableSlots(
  barberId: number,
  date: string
): Promise<string[]> {
  const barber = await prisma.barber.findUnique({
    where: { id: barberId },
    include: { schedules: true },
  });

  if (!barber) return [];

  const day = dayjs(date);
  const dayOfWeek = DAY_MAP[day.day()];
  const schedule = barber.schedules.find(
    (s) => s.dayOfWeek === dayOfWeek && !s.isDayOff
  );

  if (!schedule) return [];

  // Mavjud zakazlarni olish
  const startOfDay = day.startOf("day").toDate();
  const endOfDay = day.endOf("day").toDate();

  const bookedAppointments = await prisma.appointment.findMany({
    where: {
      barberId,
      startTime: { gte: startOfDay, lte: endOfDay },
      status: { notIn: ["CANCELLED"] },
    },
  });

  const slots: string[] = [];
  const slotDuration = barber.slotDuration;

  let current = dayjs(`${date} ${schedule.startTime}`);
  const end = dayjs(`${date} ${schedule.endTime}`);
  const breakStart = schedule.breakStart
    ? dayjs(`${date} ${schedule.breakStart}`)
    : null;
  const breakEnd = schedule.breakEnd
    ? dayjs(`${date} ${schedule.breakEnd}`)
    : null;

  while (current.add(slotDuration, "minute").isBefore(end) || current.add(slotDuration, "minute").isSame(end)) {
    const slotEnd = current.add(slotDuration, "minute");

    // Dam olish vaqtiga to'g'ri kelmasin
    const isDuringBreak =
      breakStart &&
      breakEnd &&
      current.isBefore(breakEnd) &&
      slotEnd.isAfter(breakStart);

    // Boshqa zakaz yo'qligini tekshir
    const isBooked = bookedAppointments.some((appt) => {
      const apptStart = dayjs(appt.startTime);
      const apptEnd = dayjs(appt.endTime);
      return current.isBefore(apptEnd) && slotEnd.isAfter(apptStart);
    });

    // O'tib ketgan vaqtlarni ko'rsatma
    const isPast = current.isBefore(dayjs());

    if (!isDuringBreak && !isBooked && !isPast) {
      slots.push(current.format("HH:mm"));
    }

    current = current.add(slotDuration, "minute");
  }

  return slots;
}
