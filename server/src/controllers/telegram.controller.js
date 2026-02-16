import {
  generateMyTelegramLinkCode,
  getMyTelegramBinding,
  unlinkMyTelegramAccount,
} from "../services/telegramService.js";

export const getMyTelegramBindingState = async (req, res, next) => {
  try {
    const state = await getMyTelegramBinding(req.user.id);
    res.json({
      success: true,
      data: state,
    });
  } catch (error) {
    next(error);
  }
};

export const createMyTelegramLinkCode = async (req, res, next) => {
  try {
    const result = await generateMyTelegramLinkCode(req.user.id);
    res.status(201).json({
      success: true,
      message: "Код привязки Telegram создан",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

export const unlinkMyTelegramBinding = async (req, res, next) => {
  try {
    const result = await unlinkMyTelegramAccount(req.user.id);
    res.json({
      success: true,
      message: result.unlinked
        ? "Telegram отвязан"
        : "Telegram не был привязан",
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
