import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const OtCategory = sequelize.define('OtCategory', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  name: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  parentId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'parent_id'
  },
  sortOrder: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 0,
    field: 'sort_order'
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
  tableName: 'ot_categories',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      name: 'idx_ot_categories_parent_id',
      fields: ['parent_id']
    },
    {
      name: 'idx_ot_categories_is_deleted',
      fields: ['is_deleted']
    }
  ]
});

export default OtCategory;
