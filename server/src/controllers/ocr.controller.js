import axios from "axios";
import { AppError } from "../middleware/errorHandler.js";

const OPENROUTER_ENDPOINT = "https://openrouter.ai/api/v1/chat/completions";

export const proxyYandexOcr = async (req, res, next) => {
  try {
    const {
      endpoint,
      apiKey,
      iamToken,
      headers: extraHeaders,
      payload,
    } = req.body || {};

    if (!endpoint) {
      throw new AppError("endpoint обязателен", 400);
    }
    if (!payload) {
      throw new AppError("payload обязателен", 400);
    }

    const headers = {
      "Content-Type": "application/json",
      ...(extraHeaders || {}),
    };

    if (!headers.Authorization) {
      if (iamToken) {
        headers.Authorization = `Bearer ${iamToken}`;
      } else if (apiKey) {
        headers.Authorization = `Api-Key ${apiKey}`;
      } else {
        throw new AppError("apiKey или iamToken обязателен", 400);
      }
    }

    const response = await axios.post(endpoint, payload, {
      headers,
      timeout: 60000,
    });

    res.json({
      success: true,
      data: response.data,
    });
  } catch (error) {
    if (error.response) {
      return res.status(error.response.status).json({
        success: false,
        message: "Yandex OCR error",
        data: error.response.data,
      });
    }

    console.error("Error proxying Yandex OCR:", error.message);
    next(error);
  }
};

export const proxyOpenRouter = async (req, res, next) => {
  try {
    const { endpoint, apiKey, headers: extraHeaders, payload } = req.body || {};

    if (!apiKey) {
      throw new AppError("apiKey обязателен", 400);
    }
    if (!payload) {
      throw new AppError("payload обязателен", 400);
    }

    const headers = {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      ...(extraHeaders || {}),
    };

    const response = await axios.post(
      endpoint || OPENROUTER_ENDPOINT,
      payload,
      {
        headers,
        timeout: 60000,
      },
    );

    res.json({
      success: true,
      data: response.data,
    });
  } catch (error) {
    if (error.response) {
      return res.status(error.response.status).json({
        success: false,
        message: "OpenRouter error",
        data: error.response.data,
      });
    }

    console.error("Error proxying OpenRouter:", error.message);
    next(error);
  }
};
