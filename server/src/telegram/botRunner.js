import dotenv from "dotenv";
import { sequelize } from "../config/database.js";
import { startTelegramBot } from "./bot.js";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, "..", "..", "..");
const serverRoot = path.resolve(__dirname, "..", "..");

dotenv.config({ path: path.join(projectRoot, ".env") });
dotenv.config({ path: path.join(serverRoot, ".env"), override: false });

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
