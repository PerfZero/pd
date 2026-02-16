import { DataTypes, Model } from "sequelize";
import sequelize from "../config/database.js";

class TelegramCommandLog extends Model {}

TelegramCommandLog.init(
  {
    id: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
      primaryKey: true,
    },
    employeeId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: "employee_id",
      references: {
        model: "employees",
        key: "id",
      },
    },
    telegramUserId: {
      type: DataTypes.STRING(32),
      allowNull: true,
      field: "telegram_user_id",
    },
    telegramChatId: {
      type: DataTypes.STRING(32),
      allowNull: true,
      field: "telegram_chat_id",
    },
    command: {
      type: DataTypes.STRING(64),
      allowNull: false,
    },
    status: {
      type: DataTypes.STRING(32),
      allowNull: false,
      defaultValue: "received",
    },
    requestPayload: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
      field: "request_payload",
    },
    responsePayload: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
      field: "response_payload",
    },
    errorMessage: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: "error_message",
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: "created_at",
    },
  },
  {
    sequelize,
    modelName: "TelegramCommandLog",
    tableName: "telegram_command_logs",
    timestamps: false,
    underscored: true,
  },
);

export default TelegramCommandLog;
