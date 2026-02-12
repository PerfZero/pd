import { DataTypes, Model } from "sequelize";
import sequelize from "../config/database.js";

class OcrMvdTestRun extends Model {}

OcrMvdTestRun.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "user_id",
      references: {
        model: "users",
        key: "id",
      },
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
    startedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: "started_at",
    },
    fileName: {
      type: DataTypes.TEXT,
      allowNull: false,
      field: "file_name",
    },
    documentType: {
      type: DataTypes.STRING(64),
      allowNull: false,
      field: "document_type",
    },
    promptUsed: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: "prompt_used",
    },
    modelUsed: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: "model_used",
    },
    ocrStatus: {
      type: DataTypes.STRING(32),
      allowNull: false,
      field: "ocr_status",
    },
    ocrMissingFields: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
      field: "ocr_missing_fields",
    },
    ocrNormalized: {
      type: DataTypes.JSONB,
      allowNull: true,
      field: "ocr_normalized",
    },
    ocrRaw: {
      type: DataTypes.JSONB,
      allowNull: true,
      field: "ocr_raw",
    },
    ocrError: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: "ocr_error",
    },
    ocrProvider: {
      type: DataTypes.STRING(64),
      allowNull: true,
      field: "ocr_provider",
    },
    mvdType: {
      type: DataTypes.STRING(64),
      allowNull: true,
      field: "mvd_type",
    },
    mvdStatus: {
      type: DataTypes.STRING(32),
      allowNull: true,
      field: "mvd_status",
    },
    mvdParams: {
      type: DataTypes.JSONB,
      allowNull: true,
      field: "mvd_params",
    },
    mvdMissingParams: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
      field: "mvd_missing_params",
    },
    mvdResult: {
      type: DataTypes.JSONB,
      allowNull: true,
      field: "mvd_result",
    },
    mvdError: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: "mvd_error",
    },
  },
  {
    sequelize,
    modelName: "OcrMvdTestRun",
    tableName: "ocr_mvd_test_runs",
    timestamps: true,
    underscored: true,
  },
);

export default OcrMvdTestRun;
