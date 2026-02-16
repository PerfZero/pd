export const SUPPORTED_TELEGRAM_LANGUAGES = new Set(["ru", "uz", "tj", "kz"]);

const MESSAGES = {
  ru: {
    startNeedCode:
      "Отправьте команду в формате /start <код_привязки>, который вы получили в портале.",
    startBound: "Аккаунт Telegram привязан к сотруднику: {{employee}}.",
    startInvalidCode: "Код привязки недействителен или истек. Сгенерируйте новый код в портале.",
    startAlreadyLinked: "Этот Telegram уже привязан к другому сотруднику. Обратитесь к администратору.",
    notLinked:
      "Telegram не привязан к профилю сотрудника. Сгенерируйте код в портале и отправьте /start <код>.",
    qrCaption: "QR-код сформирован. Срок действия: 5 минут.",
    statusAllowed: "✅ Допущен",
    statusBlocked: "❌ Заблокирован: {{reason}}",
    statusRevoked: "❌ Доступ отозван: {{reason}}",
    statusPending: "⏳ Ожидает допуска",
    statusMissing: "❌ Нет активного допуска",
    languagePrompt: "Выберите язык / Tilni tanlang / Забонро интихоб кунед / Тілді таңдаңыз",
    languageUpdated: "Язык обновлен.",
    help:
      "Доступные команды:\n/qr - получить QR-код\n/status - статус допуска\n/language - сменить язык",
    notifyStatusAllowed: "✅ Статус доступа обновлен: Допущен",
    notifyStatusBlocked: "❌ Статус доступа обновлен: Заблокирован. Причина: {{reason}}",
    notifyStatusOther: "ℹ️ Статус доступа обновлен: {{status}}. {{reason}}",
    notifyDocExpired: "⚠️ Истек срок документа: {{document}} ({{date}})",
  },
  uz: {
    startNeedCode:
      "Portalda olingan kod bilan /start <boglash_kodi> buyrug'ini yuboring.",
    startBound: "Telegram akkaunti xodimga bog'landi: {{employee}}.",
    startInvalidCode: "Bog'lash kodi noto'g'ri yoki muddati tugagan. Portalda yangi kod yarating.",
    startAlreadyLinked: "Bu Telegram boshqa xodimga bog'langan. Administratorga murojaat qiling.",
    notLinked:
      "Telegram xodim profiliga bog'lanmagan. Portalda kod yarating va /start <kod> yuboring.",
    qrCaption: "QR-kod yaratildi. Amal qilish muddati: 5 daqiqa.",
    statusAllowed: "✅ Ruxsat berilgan",
    statusBlocked: "❌ Bloklangan: {{reason}}",
    statusRevoked: "❌ Ruxsat bekor qilingan: {{reason}}",
    statusPending: "⏳ Ruxsat kutilmoqda",
    statusMissing: "❌ Faol ruxsat topilmadi",
    languagePrompt: "Tilni tanlang",
    languageUpdated: "Til yangilandi.",
    help:
      "Buyruqlar:\n/qr - QR-kod olish\n/status - ruxsat holati\n/language - tilni ozgartirish",
    notifyStatusAllowed: "✅ Ruxsat holati yangilandi: Ruxsat berilgan",
    notifyStatusBlocked: "❌ Ruxsat holati yangilandi: Bloklangan. Sabab: {{reason}}",
    notifyStatusOther: "ℹ️ Ruxsat holati yangilandi: {{status}}. {{reason}}",
    notifyDocExpired: "⚠️ Hujjat muddati tugadi: {{document}} ({{date}})",
  },
  tj: {
    startNeedCode:
      "Фармони /start <коди_пайваст> бо код аз порталро фиристед.",
    startBound: "Аккаунти Telegram ба корманд пайваст шуд: {{employee}}.",
    startInvalidCode: "Коди пайваст нодуруст ё муҳлаташ гузашт. Дар портал коди нав созед.",
    startAlreadyLinked: "Ин Telegram ба корманди дигар пайваст аст. Ба администратор муроҷиат кунед.",
    notLinked:
      "Telegram ба профили корманд пайваст нест. Дар портал код созед ва /start <код> фиристед.",
    qrCaption: "QR-код омода шуд. Муҳлати амал: 5 дақиқа.",
    statusAllowed: "✅ Иҷозат дода шуд",
    statusBlocked: "❌ Масдуд: {{reason}}",
    statusRevoked: "❌ Дастрасӣ бекор шуд: {{reason}}",
    statusPending: "⏳ Дар интизори иҷозат",
    statusMissing: "❌ Дастрасии фаъол ёфт нашуд",
    languagePrompt: "Забонро интихоб кунед",
    languageUpdated: "Забон нав шуд.",
    help:
      "Фармонҳо:\n/qr - гирифтани QR-код\n/status - ҳолати дастрасӣ\n/language - ивази забон",
    notifyStatusAllowed: "✅ Ҳолати дастрасӣ нав шуд: Иҷозат дода шуд",
    notifyStatusBlocked: "❌ Ҳолати дастрасӣ нав шуд: Масдуд. Сабаб: {{reason}}",
    notifyStatusOther: "ℹ️ Ҳолати дастрасӣ нав шуд: {{status}}. {{reason}}",
    notifyDocExpired: "⚠️ Муҳлати ҳуҷҷат гузашт: {{document}} ({{date}})",
  },
  kz: {
    startNeedCode:
      "Порталда алынған кодпен /start <байланыстыру_коды> пәрменін жіберіңіз.",
    startBound: "Telegram аккаунты қызметкерге байланыстырылды: {{employee}}.",
    startInvalidCode: "Байланыстыру коды қате немесе мерзімі өткен. Порталда жаңа код жасаңыз.",
    startAlreadyLinked: "Бұл Telegram басқа қызметкерге байланыстырылған. Әкімшіге хабарласыңыз.",
    notLinked:
      "Telegram қызметкер профиліне байланыстырылмаған. Порталда код жасап, /start <код> жіберіңіз.",
    qrCaption: "QR-код жасалды. Жарамдылық мерзімі: 5 минут.",
    statusAllowed: "✅ Рұқсат берілді",
    statusBlocked: "❌ Бұғатталған: {{reason}}",
    statusRevoked: "❌ Қолжетімділік қайтарылды: {{reason}}",
    statusPending: "⏳ Рұқсат күтілуде",
    statusMissing: "❌ Белсенді рұқсат табылмады",
    languagePrompt: "Тілді таңдаңыз",
    languageUpdated: "Тіл жаңартылды.",
    help:
      "Пәрмендер:\n/qr - QR-код алу\n/status - рұқсат күйі\n/language - тілді ауыстыру",
    notifyStatusAllowed: "✅ Рұқсат күйі жаңартылды: Рұқсат берілді",
    notifyStatusBlocked: "❌ Рұқсат күйі жаңартылды: Бұғатталған. Себеп: {{reason}}",
    notifyStatusOther: "ℹ️ Рұқсат күйі жаңартылды: {{status}}. {{reason}}",
    notifyDocExpired: "⚠️ Құжат мерзімі аяқталды: {{document}} ({{date}})",
  },
};

const interpolate = (template, variables = {}) => {
  return Object.entries(variables).reduce(
    (acc, [key, value]) => acc.replaceAll(`{{${key}}}`, String(value ?? "")),
    template,
  );
};

export const normalizeTelegramLanguage = (language) => {
  if (!language) return "ru";
  const normalized = String(language).toLowerCase();

  if (normalized.startsWith("ru")) return "ru";
  if (normalized.startsWith("uz")) return "uz";
  if (normalized.startsWith("tg") || normalized.startsWith("tj")) return "tj";
  if (normalized.startsWith("kk") || normalized.startsWith("kz")) return "kz";

  return SUPPORTED_TELEGRAM_LANGUAGES.has(normalized) ? normalized : "ru";
};

export const tTelegram = (language, key, variables = {}) => {
  const normalized = normalizeTelegramLanguage(language);
  const source = MESSAGES[normalized] || MESSAGES.ru;
  const fallback = MESSAGES.ru[key] || key;
  return interpolate(source[key] || fallback, variables);
};

export const TELEGRAM_LANGUAGE_LABELS = {
  ru: "Русский",
  uz: "O'zbek",
  tj: "Тоҷикӣ",
  kz: "Қазақша",
};
