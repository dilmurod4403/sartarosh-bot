export const uz = {
  welcome: "Salom! Sartaroshxona botiga xush kelibsiz 💈\nIsmingizni kiriting:",
  askPhone: "Telefon raqamingizni yuboring 📱",
  shareContact: "📱 Kontaktni ulashish",
  registered: "Ro'yxatdan o'tdingiz! Xush kelibsiz 🎉",
  chooseBarber: "Sartaroshni tanlang:",
  chooseDay: "Kunni tanlang:",
  chooseTime: "Bo'sh vaqtni tanlang:",
  confirmAppointment: (barber: string, date: string, time: string) =>
    `✅ Zakazni tasdiqlaysizmi?\n\n💈 Sartarosh: ${barber}\n📅 Sana: ${date}\n🕐 Vaqt: ${time}`,
  appointmentCreated: "Zakazingiz yuborildi! Sartarosh tasdiqlashini kuting ⏳",
  appointmentConfirmed: (date: string, time: string) =>
    `✅ Zakazingiz tasdiqlandi!\n📅 ${date} soat ${time} da kutamiz 💈`,
  appointmentCancelled: (reason: string) =>
    `❌ Zakazingiz bekor qilindi.\nSabab: ${reason}`,
  appointmentRescheduled: (date: string, time: string) =>
    `🔄 Sartarosh yangi vaqt taklif qildi:\n📅 ${date} soat ${time}\n\nQabul qilasizmi?`,
  reminder1h: (time: string) =>
    `⏰ Eslatma! ${time} da zakazingiz bor. Kutib qolamiz 💈`,
  reminder24h: (date: string, time: string) =>
    `📅 Eslatma! Ertaga ${date} soat ${time} da zakazingiz bor 💈`,
  noSlots: "Bu kunda bo'sh vaqt yo'q. Boshqa kun tanlang.",
  cancelSuccess: "Zakazingiz bekor qilindi ✅",
  cancelTooLate: "Zakazni bekor qilish vaqti o'tib ketdi (1 soat oldin mumkin)",
  myOrders: "Zakazlaringiz:",
  noOrders: "Sizda aktiv zakaz yo'q",
  confirm: "✅ Tasdiqlash",
  decline: "❌ Rad etish",
  back: "⬅️ Orqaga",
  cancel: "❌ Bekor qilish",
  yes: "✅ Ha",
  no: "❌ Yo'q",
  chooseLanguage: "Tilni tanlang / Выберите язык:",
  settingsSaved: "Sozlamalar saqlandi ✅",
  menu: "Bosh menyu",
  btnNewAppointment: "📅 Navbat olish",
  btnMyAppointments: "📋 Mening zakazlarim",
  btnSettings: "⚙️ Sozlamalar",
  btnAdminPanel: "🛠 Admin panel",
};
