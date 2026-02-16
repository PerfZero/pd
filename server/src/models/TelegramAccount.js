import { DataTypes, Model } from "sequelize";
import sequelize from "../config/database.js";

class TelegramAccount extends Model {}

TelegramAccount.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    employeeId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "employee_id",
      references: {
        model: "employees",
        key: "id",
      },
    },
    telegramUserId: {
      type: DataTypes.STRING(32),
      allowNull: false,
      field: "telegram_user_id",
    },
    telegramChatId: {
      type: DataTypes.STRING(32),
      allowNull: false,
      field: "telegram_chat_id",
    },
    telegramUsername: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: "telegram_username",
    },
    telegramFirstName: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: "telegram_first_name",
    },
    telegramLastName: {
      type: DataTypes.STRING(255),
      allowNull: true,
      field: "telegram_last_name",
    },
    language: {
      type: DataTypes.STRING(5),
      allowNull: false,
      defaultValue: "ru",
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: "is_active",
    },
    linkedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: "linked_at",
    },
    lastSeenAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "last_seen_at",
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: "created_at",
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: "updated_at",
    },
  },
  {
    sequelize,
    modelName: "TelegramAccount",
    tableName: "telegram_accounts",
    timestamps: true,
    underscored: true,
  },
);

export default TelegramAccount;
