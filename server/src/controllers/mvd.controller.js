import { checkMvd, getSupportedMvdTypes } from "../services/mvdService.js";
import { AppError } from "../middleware/errorHandler.js";

export const getMvdMetadata = async (req, res, next) => {
  try {
    return res.json({
      success: true,
      data: {
        provider: "api-cloud.ru/mvd",
        endpoint: process.env.MVD_API_URL || "https://api-cloud.ru/api/mvd.php",
        supportedTypes: getSupportedMvdTypes(),
      },
    });
  } catch (error) {
    next(error);
  }
};

export const checkMvdRecord = async (req, res, next) => {
  try {
    const { type, params } = req.body || {};
    if (!type) {
      throw new AppError("type обязателен", 400);
    }

    const result = await checkMvd({ type, params });

    return res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};
