import { FastifyInstance } from "fastify";
import prisma from "../../utils/prisma";
import { Role } from "../../generated/prisma";

export async function salonRoutes(app: FastifyInstance) {
  // Admin salonlari ro'yxati
  app.get("/salons", async (req, reply) => {
    const user = req.dbUser;
    const role = user.salonUsers[0]?.role;
    if (role !== Role.ADMIN) return reply.status(403).send({ error: "Forbidden" });

    const salonIds = user.salonUsers.map((su) => su.salonId);
    const salons = await prisma.salon.findMany({
      where: { id: { in: salonIds } },
      include: { _count: { select: { barbers: true } } },
    });
    return salons;
  });

  // Yangi salon qo'shish
  app.post("/salons", async (req, reply) => {
    const user = req.dbUser;
    const role = user.salonUsers[0]?.role;
    if (role !== Role.ADMIN) return reply.status(403).send({ error: "Forbidden" });

    const { name, address } = req.body as { name: string; address?: string };
    if (!name) return reply.status(400).send({ error: "name required" });

    const salon = await prisma.salon.create({ data: { name, address } });

    await prisma.salonUser.create({
      data: { userId: user.id, salonId: salon.id, role: "ADMIN" },
    });

    return salon;
  });

  // Salonga yangi admin qo'shish
  app.post("/admins", async (req, reply) => {
    const user = req.dbUser;
    const role = user.salonUsers[0]?.role;
    if (role !== Role.ADMIN) return reply.status(403).send({ error: "Forbidden" });

    const { telegramId, name, salonId: bodyId } = req.body as {
      telegramId: string;
      name?: string;
      salonId?: number;
    };

    if (!telegramId) return reply.status(400).send({ error: "telegramId required" });

    const salonId = bodyId ?? user.salonUsers[0]?.salonId;
    const isAdmin = user.salonUsers.some((su) => su.salonId === salonId && su.role === Role.ADMIN);
    if (!isAdmin) return reply.status(403).send({ error: "Bu salonga ruxsat yo'q" });

    const newAdmin = await prisma.user.upsert({
      where: { telegramId },
      update: name ? { name } : {},
      create: { telegramId, name: name ?? "Admin", language: "UZ" },
    });

    await prisma.salonUser.upsert({
      where: { userId_salonId: { userId: newAdmin.id, salonId } },
      update: { role: "ADMIN" },
      create: { userId: newAdmin.id, salonId, role: "ADMIN" },
    });

    return { id: newAdmin.id, name: newAdmin.name, telegramId: newAdmin.telegramId, salonId };
  });

  // Salon ma'lumotlarini yangilash
  app.put("/salons/:id", async (req, reply) => {
    const user = req.dbUser;
    const { id } = req.params as { id: string };
    const salonId = parseInt(id);

    const isAdmin = user.salonUsers.some(
      (su) => su.salonId === salonId && su.role === Role.ADMIN
    );
    if (!isAdmin) return reply.status(403).send({ error: "Forbidden" });

    const { name, address } = req.body as { name?: string; address?: string };
    const salon = await prisma.salon.update({
      where: { id: salonId },
      data: { ...(name && { name }), ...(address !== undefined && { address }) },
    });
    return salon;
  });
}
