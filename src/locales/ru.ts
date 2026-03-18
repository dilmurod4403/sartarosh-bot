export const ru = {
  welcome: "Привет! Добро пожаловать в бот барбершопа 💈\nВведите ваше имя:",
  askPhone: "Отправьте ваш номер телефона 📱",
  shareContact: "📱 Поделиться контактом",
  registered: "Регистрация завершена! Добро пожаловать 🎉",
  chooseSalon: "Выберите салон:",
  chooseBarber: "Выберите барбера:",
  chooseDay: "Выберите день:",
  chooseTime: "Выберите свободное время:",
  confirmAppointment: (barber: string, date: string, time: string) =>
    `✅ Подтвердить запись?\n\n💈 Барбер: ${barber}\n📅 Дата: ${date}\n🕐 Время: ${time}`,
  appointmentCreated: "Запись отправлена! Ожидайте подтверждения барбера ⏳",
  appointmentConfirmed: (date: string, time: string) =>
    `✅ Ваша запись подтверждена!\nЖдём вас ${date} в ${time} 💈`,
  appointmentCancelled: (reason: string) =>
    `❌ Ваша запись отменена.\nПричина: ${reason}`,
  appointmentRescheduled: (date: string, time: string) =>
    `🔄 Барбер предложил новое время:\n📅 ${date} в ${time}\n\nПринять?`,
  reminder1h: (time: string) =>
    `⏰ Напоминание! У вас запись в ${time}. Ждём вас 💈`,
  reminder24h: (date: string, time: string) =>
    `📅 Напоминание! Завтра ${date} в ${time} у вас запись 💈`,
  noSlots: "В этот день нет свободного времени. Выберите другой день.",
  cancelSuccess: "Ваша запись отменена ✅",
  cancelTooLate: "Время отмены истекло (можно отменить за 1 час)",
  myOrders: "Ваши записи:",
  noOrders: "У вас нет активных записей",
  confirm: "✅ Подтвердить",
  decline: "❌ Отклонить",
  back: "⬅️ Назад",
  cancel: "❌ Отмена",
  yes: "✅ Да",
  no: "❌ Нет",
  chooseLanguage: "Tilni tanlang / Выберите язык:",
  settingsSaved: "Настройки сохранены ✅",
  menu: "Главное меню",
  btnNewAppointment: "📅 Записаться",
  btnMyAppointments: "📋 Мои записи",
  btnSettings: "⚙️ Настройки",
  btnAdminPanel: "🛠 Admin panel",
  btnSchedule: "🗓 Мой график",
  btnMenu: "🏠 Главное меню",
};
