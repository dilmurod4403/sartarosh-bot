import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const telegramId = process.argv[2];
  const name = process.argv[3] ?? "Sartarosh";
  const salonId = parseInt(process.argv[4] ?? "1");

  if (!telegramId) {
    console.error("Ishlatish: npx tsx src/scripts/create-barber.ts <TELEGRAM_ID> <ISM> <SALON_ID>");
    process.exit(1);
  }

  const salon = await prisma.salon.findUnique({ where: { id: salonId } });
  if (!salon) {
    console.error(`Salon topilmadi (id: ${salonId})`);
    process.exit(1);
  }

  const user = await prisma.user.upsert({
    where: { telegramId },
    update: { name },
    create: { telegramId, name, language: "UZ" },
  });

  await prisma.salonUser.upsert({
    where: { userId_salonId: { userId: user.id, salonId } },
    update: { role: "BARBER" },
    create: { userId: user.id, salonId, role: "BARBER" },
  });

  const barber = await prisma.barber.upsert({
    where: { userId: user.id },
    update: { salonId, isActive: true },
    create: { userId: user.id, salonId, slotDuration: 30 },
  });

  // Default haftalik jadval (Du-Shan, 09:00-18:00, 13:00-14:00 tushlik)
  const workDays = ["MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY", "SATURDAY"];
  for (const day of workDays) {
    await prisma.barberSchedule.upsert({
      where: { barberId_dayOfWeek: { barberId: barber.id, dayOfWeek: day as any } },
      update: {},
      create: {
        barberId: barber.id,
        dayOfWeek: day as any,
        startTime: "09:00",
        endTime: "18:00",
        breakStart: "13:00",
        breakEnd: "14:00",
        isDayOff: false,
      },
    });
  }

  // Yakshanba - dam olish
  await prisma.barberSchedule.upsert({
    where: { barberId_dayOfWeek: { barberId: barber.id, dayOfWeek: "SUNDAY" } },
    update: { isDayOff: true },
    create: {
      barberId: barber.id,
      dayOfWeek: "SUNDAY",
      startTime: "09:00",
      endTime: "18:00",
      isDayOff: true,
    },
  });

  console.log(`✅ Sartarosh qo'shildi:`);
  console.log(`   Ism: ${user.name}`);
  console.log(`   Telegram ID: ${user.telegramId}`);
  console.log(`   Salon: ${salon.name}`);
  console.log(`   Jadval: Du-Shan 09:00-18:00 (13:00-14:00 tushlik), Yak - dam olish`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
