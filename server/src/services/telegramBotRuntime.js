let telegramBot = null;
let expiryCheckerTimer = null;

export const setTelegramBotInstance = (bot) => {
  telegramBot = bot;
};

export const getTelegramBotInstance = () => telegramBot;

export const setTelegramExpiryCheckerTimer = (timer) => {
  expiryCheckerTimer = timer;
};

export const stopTelegramRuntime = () => {
  if (expiryCheckerTimer) {
    clearInterval(expiryCheckerTimer);
    expiryCheckerTimer = null;
  }

  if (telegramBot) {
    try {
      telegramBot.stop("shutdown");
    } catch (error) {
      console.error("Failed to stop Telegram bot runtime:", error.message);
    }
    telegramBot = null;
  }
};
