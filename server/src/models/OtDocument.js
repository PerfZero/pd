import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const OtDocument = sequelize.define('OtDocument', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  categoryId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'category_id'
  },
  name: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  isRequired: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false,
    field: 'is_required'
  },
  templateFileId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'template_file_id'
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
  tableName: 'ot_documents',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      name: 'idx_ot_documents_category_id',
      fields: ['category_id']
    },
    {
      name: 'idx_ot_documents_is_required',
      fields: ['is_required']
    },
    {
      name: 'idx_ot_documents_is_deleted',
      fields: ['is_deleted']
    }
  ]
});

export default OtDocument;
