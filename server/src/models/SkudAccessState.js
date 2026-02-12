import { DataTypes, Model } from "sequelize";
import sequelize from "../config/database.js";

class SkudAccessState extends Model {}

SkudAccessState.init(
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
    externalSystem: {
      type: DataTypes.STRING(32),
      allowNull: false,
      defaultValue: "sigur",
      field: "external_system",
    },
    status: {
      type: DataTypes.STRING(32),
      allowNull: false,
      defaultValue: "pending",
      validate: {
        isIn: [["pending", "allowed", "blocked", "revoked", "deleted"]],
      },
    },
    statusReason: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: "status_reason",
    },
    reasonCode: {
      type: DataTypes.STRING(64),
      allowNull: true,
      field: "reason_code",
    },
    source: {
      type: DataTypes.STRING(32),
      allowNull: false,
      defaultValue: "manual",
    },
    effectiveFrom: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: "effective_from",
    },
    effectiveTo: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "effective_to",
    },
    changedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      field: "changed_by",
      references: {
        model: "users",
        key: "id",
      },
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
    },
  },
  {
    sequelize,
    modelName: "SkudAccessState",
    tableName: "skud_access_states",
    timestamps: true,
    underscored: true,
  },
);

export default SkudAccessState;
