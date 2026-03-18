import { FastifyInstance } from "fastify";
import prisma from "../../utils/prisma";
import { DayOfWeek } from "../../generated/prisma";

export async function scheduleRoutes(app: FastifyInstance) {
  // Jadval olish
  app.get("/schedule", async (req, reply) => {
    const user = req.dbUser;
    const barber = await prisma.barber.findUnique({
      where: { userId: user.id },
      include: { schedules: true },
    });

    if (!barber) return reply.status(404).send({ error: "Barber not found" });

    return {
      slotDuration: barber.slotDuration,
      schedules: barber.schedules,
    };
  });

  // Jadvalni yangilash
  app.put("/schedule", async (req, reply) => {
    const user = req.dbUser;
    const { slotDuration, schedules } = req.body as {
      slotDuration: number;
      schedules: {
        dayOfWeek: DayOfWeek;
        startTime: string;
        endTime: string;
        breakStart?: string;
        breakEnd?: string;
        isDayOff: boolean;
      }[];
    };

    const barber = await prisma.barber.findUnique({ where: { userId: user.id } });
    if (!barber) return reply.status(404).send({ error: "Barber not found" });

    await prisma.barber.update({
      where: { id: barber.id },
      data: { slotDuration },
    });

    for (const s of schedules) {
      await prisma.barberSchedule.upsert({
        where: { barberId_dayOfWeek: { barberId: barber.id, dayOfWeek: s.dayOfWeek } },
        update: {
          startTime: s.startTime,
          endTime: s.endTime,
          breakStart: s.breakStart ?? null,
          breakEnd: s.breakEnd ?? null,
          isDayOff: s.isDayOff,
        },
        create: {
          barberId: barber.id,
          dayOfWeek: s.dayOfWeek,
          startTime: s.startTime,
          endTime: s.endTime,
          breakStart: s.breakStart ?? null,
          breakEnd: s.breakEnd ?? null,
          isDayOff: s.isDayOff,
        },
      });
    }

    return { success: true };
  });
}
