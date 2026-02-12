import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const OtContractorStatus = sequelize.define(
  "OtContractorStatus",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    counterpartyId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "counterparty_id",
    },
    constructionSiteId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "construction_site_id",
    },
    status: {
      type: DataTypes.ENUM(
        "admitted",
        "not_admitted",
        "temp_admitted",
        "blocked",
      ),
      allowNull: false,
      defaultValue: "not_admitted",
    },
    isManual: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: "is_manual",
    },
    createdAt: {
      type: DataTypes.DATE,
      field: "created_at",
    },
    updatedAt: {
      type: DataTypes.DATE,
      field: "updated_at",
    },
  },
  {
    tableName: "ot_contractor_status",
    timestamps: true,
    underscored: true,
    indexes: [
      {
        name: "idx_ot_contractor_status_unique",
        fields: ["counterparty_id", "construction_site_id"],
        unique: true,
      },
      {
        name: "idx_ot_contractor_status_status",
        fields: ["status"],
      },
    ],
  },
);

export default OtContractorStatus;
