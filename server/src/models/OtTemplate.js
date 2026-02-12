import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const OtTemplate = sequelize.define('OtTemplate', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  fileId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'file_id'
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  isDeleted: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    field: 'is_deleted'
  },
  createdAt: {
    type: DataTypes.DATE,
    field: 'created_at'
  },
  updatedAt: {
    type: DataTypes.DATE,
    field: 'updated_at'
  }
}, {
  tableName: 'ot_templates',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      name: 'idx_ot_templates_is_deleted',
      fields: ['is_deleted']
    }
  ]
});

export default OtTemplate;
