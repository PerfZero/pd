import { DataTypes } from "sequelize";
import sequelize from "../config/database.js";

const DocumentType = sequelize.define(
  "DocumentType",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    code: {
      type: DataTypes.STRING(64),
      allowNull: false,
      unique: true,
    },
    name: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    description: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    sampleUrl: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: "sample_url",
    },
    sampleMimeType: {
      type: DataTypes.STRING(128),
      allowNull: true,
      field: "sample_mime_type",
    },
    sampleFilePath: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: "sample_file_path",
    },
    sampleOriginalName: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: "sample_original_name",
    },
    sampleHighlightedFields: {
      type: DataTypes.JSONB,
      allowNull: false,
      defaultValue: [],
      field: "sample_highlighted_fields",
    },
    sortOrder: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      field: "sort_order",
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: "is_active",
    },
    isRequired: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      field: "is_required",
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
    tableName: "document_types",
    timestamps: true,
    underscored: true,
    indexes: [
      {
        name: "idx_document_types_active_sort",
        fields: ["is_active", "sort_order"],
      },
      {
        name: "idx_document_types_sample_file_path",
        fields: ["sample_file_path"],
      },
    ],
  },
);

export default DocumentType;
