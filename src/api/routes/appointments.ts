import { FastifyInstance } from "fastify";
import prisma from "../../utils/prisma";
import { AppointmentStatus, Role } from "../../generated/prisma";
import dayjs from "dayjs";

export async function appointmentRoutes(app: FastifyInstance) {
  // Zakazlar ro'yxati
  app.get("/appointments", async (req, reply) => {
    const user = req.dbUser;
    const role = user.salonUsers[0]?.role;
    const { date, status } = req.query as { date?: string; status?: string };

    let where: any = {};

    if (role === Role.BARBER) {
      const barber = await prisma.barber.findUnique({ where: { userId: user.id } });
      if (!barber) return reply.status(404).send({ error: "Barber not found" });
      where.barberId = barber.id;
    } else if (role === Role.ADMIN) {
      const salonId = user.salonUsers[0]?.salonId;
      where.barber = { salonId };
    }

    if (date) {
      const start = dayjs(date).startOf("day").toDate();
      const end = dayjs(date).endOf("day").toDate();
      where.startTime = { gte: start, lte: end };
    }

    if (status) {
      where.status = status;
    }

    const appointments = await prisma.appointment.findMany({
      where,
      include: {
        client: { select: { id: true, name: true, phone: true, telegramId: true } },
        barber: { include: { user: { select: { id: true, name: true } } } },
      },
      orderBy: { startTime: "asc" },
    });

    return appointments;
  });

  // Zakazni yangilash (tasdiqlash / bekor qilish / ko'chirish)
  app.patch("/appointments/:id", async (req, reply) => {
    const { id } = req.params as { id: string };
    const { status, cancelReason, newStartTime } = req.body as {
      status?: string;
      cancelReason?: string;
      newStartTime?: string;
    };

    const appt = await prisma.appointment.findUnique({
      where: { id: parseInt(id) },
      include: { barber: true, client: true },
    });

    if (!appt) return reply.status(404).send({ error: "Not found" });

    const updateData: any = {};

    if (status) updateData.status = status;
    if (cancelReason) updateData.cancelReason = cancelReason;

    if (newStartTime) {
      const barber = await prisma.barber.findUnique({ where: { id: appt.barberId } });
      updateData.startTime = new Date(newStartTime);
      updateData.endTime = dayjs(newStartTime).add(barber!.slotDuration, "minute").toDate();
      updateData.status = AppointmentStatus.RESCHEDULED;
    }

    const updated = await prisma.appointment.update({
      where: { id: parseInt(id) },
      data: updateData,
    });

    // Mijozga notification yuborish
    if (status === AppointmentStatus.CANCELLED && cancelReason) {
      const { setBotInstance } = await import("../../services/notifications");
      // notification yuboriladi
    }

    return updated;
  });

  // Bugungi statistika
  app.get("/appointments/stats", async (req, reply) => {
    const user = req.dbUser;
    const role = user.salonUsers[0]?.role;

    let barberId: number | undefined;
    let salonId: number | undefined;

    if (role === Role.BARBER) {
      const barber = await prisma.barber.findUnique({ where: { userId: user.id } });
      barberId = barber?.id;
    } else if (role === Role.ADMIN) {
      salonId = user.salonUsers[0]?.salonId;
    }

    const today = dayjs().startOf("day").toDate();
    const endOfToday = dayjs().endOf("day").toDate();

    const where: any = {
      startTime: { gte: today, lte: endOfToday },
    };
    if (barberId) where.barberId = barberId;
    if (salonId) where.barber = { salonId };

    const [total, confirmed, pending, cancelled] = await Promise.all([
      prisma.appointment.count({ where }),
      prisma.appointment.count({ where: { ...where, status: "CONFIRMED" } }),
      prisma.appointment.count({ where: { ...where, status: "PENDING" } }),
      prisma.appointment.count({ where: { ...where, status: "CANCELLED" } }),
    ]);

    return { total, confirmed, pending, cancelled };
  });
}
