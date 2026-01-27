import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const OtContractorDocumentHistory = sequelize.define(
  "OtContractorDocumentHistory",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    contractorDocumentId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: "contractor_document_id",
    },
    status: {
      type: DataTypes.ENUM("not_uploaded", "uploaded", "approved", "rejected"),
      allowNull: false,
    },
    comment: {
      type: DataTypes.TEXT,
      allowNull: true,
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
      allowNull: false,
      defaultValue: DataTypes.NOW,
      field: "created_at",
    },
  },
  {
    tableName: "ot_contractor_document_history",
    timestamps: false,
    underscored: true,
    indexes: [
      {
        name: "idx_ot_contractor_document_history_doc_id",
        fields: ["contractor_document_id"],
      },
      {
        name: "idx_ot_contractor_document_history_active",
        fields: ["is_active"],
      },
    ],
  },
);

export default OtContractorDocumentHistory;
