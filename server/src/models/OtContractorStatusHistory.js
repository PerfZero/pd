import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const OtContractorStatusHistory = sequelize.define(
  "OtContractorStatusHistory",
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
    },
    changedBy: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "changed_by",
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: "is_active",
    },
    createdAt: {
      type: DataTypes.DATE,
      field: "created_at",
    },
  },
  {
    tableName: "ot_contractor_status_history",
    timestamps: false,
    underscored: true,
    indexes: [
      {
        name: "idx_ot_contractor_status_history_pair",
        fields: ["counterparty_id", "construction_site_id"],
      },
      {
        name: "idx_ot_contractor_status_history_active",
        fields: ["is_active"],
      },
    ],
  },
);

export default OtContractorStatusHistory;
