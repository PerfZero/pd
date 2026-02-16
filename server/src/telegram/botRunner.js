import dotenv from "dotenv";
import { sequelize } from "../config/database.js";
import { startTelegramBot } from "./bot.js";

dotenv.config();

const start = async () => {
  try {
    await sequelize.authenticate();
    console.log("✅ Database connected for Telegram bot");
    await startTelegramBot();
  } catch (error) {
    console.error("❌ Telegram bot runner failed:", error.message);
    process.exit(1);
  }
};

start();
