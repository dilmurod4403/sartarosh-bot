import cron from "node-cron";
import dayjs from "dayjs";
import prisma from "../utils/prisma";
import { sendReminderNotification } from "../services/notifications";
import { AppointmentStatus } from "../generated/prisma";

export function startReminderJobs() {
  // Har 5 daqiqada tekshiramiz
  cron.schedule("*/5 * * * *", async () => {
    const now = dayjs();

    // 24 soat oldin eslatma
    const in24h = now.add(24, "hour");
    const appointments24h = await prisma.appointment.findMany({
      where: {
        status: AppointmentStatus.CONFIRMED,
        startTime: {
          gte: in24h.subtract(5, "minute").toDate(),
          lte: in24h.add(5, "minute").toDate(),
        },
      },
      include: {
        notifications: true,
      },
    });

    for (const appt of appointments24h) {
      const alreadySent = appt.notifications.some((n) => n.type === "REMINDER_24H");
      if (!alreadySent) {
        await sendReminderNotification(appt.id, "24H");
      }
    }

    // 1 soat oldin eslatma
    const in1h = now.add(1, "hour");
    const appointments1h = await prisma.appointment.findMany({
      where: {
        status: AppointmentStatus.CONFIRMED,
        startTime: {
          gte: in1h.subtract(5, "minute").toDate(),
          lte: in1h.add(5, "minute").toDate(),
        },
      },
      include: {
        notifications: true,
      },
    });

    for (const appt of appointments1h) {
      const alreadySent = appt.notifications.some((n) => n.type === "REMINDER_1H");
      if (!alreadySent) {
        await sendReminderNotification(appt.id, "1H");
      }
    }
  });

  console.log("✅ Reminder jobs started");
}
