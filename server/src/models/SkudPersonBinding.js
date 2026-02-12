import { DataTypes, Model } from "sequelize";
import sequelize from "../config/database.js";

class SkudPersonBinding extends Model {}

SkudPersonBinding.init(
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
    externalEmpId: {
      type: DataTypes.STRING(128),
      allowNull: false,
      field: "external_emp_id",
    },
    source: {
      type: DataTypes.STRING(32),
      allowNull: false,
      defaultValue: "manual",
    },
    isActive: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      field: "is_active",
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
    modelName: "SkudPersonBinding",
    tableName: "skud_person_bindings",
    timestamps: true,
    underscored: true,
  },
);

export default SkudPersonBinding;
