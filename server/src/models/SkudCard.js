import { DataTypes, Model } from "sequelize";
import sequelize from "../config/database.js";

class SkudCard extends Model {}

SkudCard.init(
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
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
    externalSystem: {
      type: DataTypes.STRING(32),
      allowNull: false,
      defaultValue: "sigur",
      field: "external_system",
    },
    externalCardId: {
      type: DataTypes.STRING(128),
      allowNull: true,
      field: "external_card_id",
    },
    cardNumber: {
      type: DataTypes.STRING(128),
      allowNull: false,
      field: "card_number",
    },
    cardNumberNormalized: {
      type: DataTypes.STRING(128),
      allowNull: false,
      field: "card_number_normalized",
    },
    cardType: {
      type: DataTypes.STRING(32),
      allowNull: false,
      defaultValue: "rfid",
      field: "card_type",
    },
    status: {
      type: DataTypes.STRING(32),
      allowNull: false,
      defaultValue: "active",
      validate: {
        isIn: [["active", "blocked", "unbound", "revoked", "lost"]],
      },
    },
    issuedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "issued_at",
    },
    blockedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "blocked_at",
    },
    lastSeenAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: "last_seen_at",
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: {},
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
    updatedBy: {
      type: DataTypes.UUID,
      allowNull: true,
      field: "updated_by",
      references: {
        model: "users",
        key: "id",
      },
    },
  },
  {
    sequelize,
    modelName: "SkudCard",
    tableName: "skud_cards",
    timestamps: true,
    underscored: true,
  },
);

export default SkudCard;
