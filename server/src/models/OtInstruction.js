import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const OtInstruction = sequelize.define('OtInstruction', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  text: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  fileId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'file_id'
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
  tableName: 'ot_instructions',
  timestamps: true,
  underscored: true
});

export default OtInstruction;
