import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const OtContractorDocument = sequelize.define('OtContractorDocument', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  documentId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'document_id'
  },
  counterpartyId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'counterparty_id'
  },
  constructionSiteId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'construction_site_id'
  },
  fileId: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'file_id'
  },
  status: {
    type: DataTypes.ENUM('not_uploaded', 'uploaded', 'approved', 'rejected'),
    allowNull: false,
    defaultValue: 'not_uploaded'
  },
  comment: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  uploadedBy: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'uploaded_by'
  },
  checkedBy: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'checked_by'
  },
  checkedAt: {
    type: DataTypes.DATE,
    allowNull: true,
    field: 'checked_at'
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
  tableName: 'ot_contractor_documents',
  timestamps: true,
  underscored: true,
  indexes: [
    {
      name: 'idx_ot_contractor_documents_unique',
      fields: ['document_id', 'counterparty_id', 'construction_site_id'],
      unique: true
    },
    {
      name: 'idx_ot_contractor_documents_status',
      fields: ['status']
    }
  ]
});

export default OtContractorDocument;
