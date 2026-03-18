import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../generated/prisma";

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! });
const prisma = new PrismaClient({ adapter });

async function main() {
  const telegramId = process.argv[2];
  const name = process.argv[3] ?? "Super Admin";

  if (!telegramId) {
    console.error("Ishlatish: npx tsx src/scripts/create-super-admin.ts <TELEGRAM_ID> <ISM>");
    process.exit(1);
  }

  // Salon yaratish (default)
  let salon = await prisma.salon.findFirst();
  if (!salon) {
    salon = await prisma.salon.create({
      data: { name: "Asosiy Salon" },
    });
    console.log(`✅ Salon yaratildi: ${salon.name}`);
  }

  // Foydalanuvchi yaratish yoki topish
  const user = await prisma.user.upsert({
    where: { telegramId },
    update: { name },
    create: { telegramId, name, language: "UZ" },
  });

  // SalonUser da ADMIN sifatida qo'shish
  await prisma.salonUser.upsert({
    where: { userId_salonId: { userId: user.id, salonId: salon.id } },
    update: { role: "ADMIN" },
    create: { userId: user.id, salonId: salon.id, role: "ADMIN" },
  });

  console.log(`✅ Super Admin qo'shildi:`);
  console.log(`   Ism: ${user.name}`);
  console.log(`   Telegram ID: ${user.telegramId}`);
  console.log(`   Salon: ${salon.name}`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
