# Barber Bot — Loyiha Ma'lumotlari

## Nima bu?
Sartaroshxona uchun Telegram navbat boshqaruv tizimi.
- Mijozlar sartarosh tanlab, bo'sh vaqtga navbat oladi
- Sartarosh tasdiqlaydi / vaqt o'zgartiradi / rad etadi
- Admin panel Telegram WebApp (Mini App) orqali ishlaydi

## Papkalar
- **Bot + API:** `/Users/dilmurod/my files/projects/barber-bot`
- **Webapp (React):** `/Users/dilmurod/my files/projects/barber-bot-webapp`

## Texnologiya
- Node.js + TypeScript
- Grammy (Telegram bot)
- Fastify (REST API)
- Prisma v7 + PostgreSQL (adapter-pg bilan)
- React + Vite (Telegram WebApp)
- node-cron (reminder jobs)

## Ma'lumotlar bazasi
- DB: `barber_bot`, user: `dilmurod` (parolsiz)
- `DATABASE_URL=postgresql://dilmurod@localhost:5432/barber_bot?schema=public`

## Foydalanuvchilar
| Ism | Telegram ID | Rol |
|-----|------------|-----|
| Dilmurod Qayyumov | 752634550 | ADMIN |
| Jasur | 117476035 | BARBER |

- Salon: **Salon-1**, Chilonzor 19 (id: 1)
- Bot: @sartaroshxona_navbat_bot

## Ishga tushirish (har safar)
```bash
# 1. Servislar
brew services start postgresql@16
brew services start redis

# 2. ngrok (yangi terminal) — URL har safar o'zgaradi!
ngrok http 3000
# Yangi URL ni quyidagi joylarga yangilash kerak:
#   barber-bot/.env        WEBAPP_URL=https://xxxx.ngrok-free.app/app/index.html?ngrok-skip-browser-warning=true
#   barber-bot-webapp/.env VITE_API_URL=https://xxxx.ngrok-free.app/api

# 3. Webapp rebuild (URL o'zgarsa)
cd "/Users/dilmurod/my files/projects/barber-bot-webapp" && npm run build

# 4. Bot + API server
cd "/Users/dilmurod/my files/projects/barber-bot" && npm run dev
```

## Foydali buyruqlar
```bash
npm run db:studio     # Prisma Studio
npm run db:migrate    # Yangi migration
npm run db:generate   # Prisma client generate

# Yangi sartarosh qo'shish
npx tsx src/scripts/create-barber.ts <TELEGRAM_ID> <ISM> <SALON_ID>

# Super admin qo'shish
npx tsx src/scripts/create-super-admin.ts <TELEGRAM_ID> <ISM>
```

## Loyiha holati

### Qilingan
- Prisma schema + migration
- Til tanlash + ro'yxatdan o'tish (O'zbek/Rus)
- Navbat olish oqimi (sartarosh > kun > vaqt > zakaz)
- Sartarosh: tasdiqlash / rad etish / vaqt o'zgartirish
- Mijoz: zakazlarni ko'rish, bekor qilish (1 soat oldin)
- Reminder (1 soat va 24 soat oldin)
- Role-based menyu (ADMIN/BARBER/CLIENT)
- Admin panel WebApp: Zakazlar, Jadval, Sartaroshlar
- Fastify API + Telegram initData auth

### Qolgan
- Admin panel to'liq test (ngrok URL muammosi bor)
- ngrok o'rniga doimiy URL (Cloudflare Tunnel)
- Reschedule oqimini to'liq test
- Production deploy

## Muhim texnik eslatmalar
- Prisma v7: `datasourceUrl` constructorda, schemada `url` yo'q
- Prisma adapter: `@prisma/adapter-pg`
- WebApp URL: `?ngrok-skip-browser-warning=true` qo'shilgan
- API auth: `x-telegram-init-data` header, dev rejimda hash tekshirilmaydi
- tsx watch `.env` o'zgarishini sezmaydi — restart kerak
