import { DataTypes, Model } from "sequelize";
import sequelize from "../config/database.js";

class SkudSyncJob extends Model {}

SkudSyncJob.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    externalSystem: {
      type: DataTypes.STRING(32),
      allowNull: false,
      defaultValue: "sigur",
      field: "external_system",
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
    operation: {
      type: DataTypes.STRING(64),
      allowNull: false,
    },
    status: {
      type: DataTypes.STRING(32),
      allowNull: false,
      defaultValue: "pending",
      validate: {
        isIn: [["pending", "processing", "success", "failed"]],
      },
    },
    payload: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
    },
    responsePayload: {
      type: DataTypes.JSONB,
      allowNull: true,
      field: "response_payload",
    },
    errorMessage: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: "error_message",
    },
    attempts: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    processedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "processed_at",
    },
    createdBy: {
      type: DataTypes.UUID,
      allowNull: true,
      field: "created_by",
      references: {
        model: "users",
        key: "id",
      },
    },
  },
  {
    sequelize,
    modelName: "SkudSyncJob",
    tableName: "skud_sync_jobs",
    timestamps: true,
    underscored: true,
  },
);

export default SkudSyncJob;
