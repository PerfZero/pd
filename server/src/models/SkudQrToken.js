import { DataTypes, Model } from "sequelize";
import sequelize from "../config/database.js";

class SkudQrToken extends Model {}

SkudQrToken.init(
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
    jti: {
      type: DataTypes.STRING(128),
      allowNull: false,
    },
    tokenHash: {
      type: DataTypes.STRING(128),
      allowNull: false,
      field: "token_hash",
    },
    tokenType: {
      type: DataTypes.STRING(32),
      allowNull: false,
      defaultValue: "persistent",
      field: "token_type",
      validate: {
        isIn: [["persistent", "one_time"]],
      },
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: "expires_at",
    },
    usedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "used_at",
    },
    revokedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "revoked_at",
    },
    issuedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      field: "issued_by",
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
    modelName: "SkudQrToken",
    tableName: "skud_qr_tokens",
    timestamps: true,
    underscored: true,
  },
);

export default SkudQrToken;
