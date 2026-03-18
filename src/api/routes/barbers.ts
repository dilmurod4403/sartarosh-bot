import { FastifyInstance } from "fastify";
import prisma from "../../utils/prisma";
import { Role } from "../../generated/prisma";

export async function barberRoutes(app: FastifyInstance) {
  // Sartaroshlar ro'yxati (admin uchun)
  app.get("/barbers", async (req, reply) => {
    const user = req.dbUser;
    const role = user.salonUsers[0]?.role;

    if (role !== Role.ADMIN) {
      return reply.status(403).send({ error: "Forbidden" });
    }

    const salonId = user.salonUsers[0]?.salonId;

    const barbers = await prisma.barber.findMany({
      where: { salonId },
      include: {
        user: { select: { id: true, name: true, phone: true, telegramId: true } },
        schedules: true,
      },
    });

    return barbers;
  });

  // Sartaroshni faollashtirish/o'chirish
  app.patch("/barbers/:id", async (req, reply) => {
    const user = req.dbUser;
    const role = user.salonUsers[0]?.role;

    if (role !== Role.ADMIN) {
      return reply.status(403).send({ error: "Forbidden" });
    }

    const { id } = req.params as { id: string };
    const { isActive } = req.body as { isActive: boolean };

    const barber = await prisma.barber.update({
      where: { id: parseInt(id) },
      data: { isActive },
    });

    return barber;
  });

  // Salon ma'lumotlari
  app.get("/salon", async (req, reply) => {
    const user = req.dbUser;
    const salonId = user.salonUsers[0]?.salonId;
    if (!salonId) return reply.status(404).send({ error: "Not found" });

    const salon = await prisma.salon.findUnique({ where: { id: salonId } });
    return salon;
  });

  // Foydalanuvchi roli
  app.get("/me", async (req, reply) => {
    const user = req.dbUser;
    const salonUser = user.salonUsers[0];
    return {
      id: user.id,
      name: user.name,
      telegramId: user.telegramId,
      role: salonUser?.role ?? "CLIENT",
      salonId: salonUser?.salonId,
    };
  });
}
