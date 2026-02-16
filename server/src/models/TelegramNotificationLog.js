import { DataTypes, Model } from "sequelize";
import sequelize from "../config/database.js";

class TelegramNotificationLog extends Model {}

TelegramNotificationLog.init(
  {
    id: {
      type: DataTypes.BIGINT,
      autoIncrement: true,
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
    eventType: {
      type: DataTypes.STRING(64),
      allowNull: false,
      field: "event_type",
    },
    eventKey: {
      type: DataTypes.STRING(128),
      allowNull: false,
      field: "event_key",
    },
    payload: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
    },
    deliveredAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: "delivered_at",
    },
  },
  {
    sequelize,
    modelName: "TelegramNotificationLog",
    tableName: "telegram_notification_logs",
    timestamps: false,
    underscored: true,
  },
);

export default TelegramNotificationLog;
