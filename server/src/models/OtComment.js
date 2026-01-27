import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

const OtComment = sequelize.define('OtComment', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true
  },
  type: {
    type: DataTypes.ENUM('contractor', 'document'),
    allowNull: false
  },
  counterpartyId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'counterparty_id'
  },
  constructionSiteId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'construction_site_id'
  },
  contractorDocumentId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'contractor_document_id'
  },
  text: {
    type: DataTypes.TEXT,
    allowNull: false
  },
  createdBy: {
    type: DataTypes.UUID,
    allowNull: false,
    field: 'created_by'
  },
  createdAt: {
    type: DataTypes.DATE,
    field: 'created_at'
  }
}, {
  tableName: 'ot_comments',
  timestamps: false,
  underscored: true,
  indexes: [
    {
      name: 'idx_ot_comments_type',
      fields: ['type']
    },
    {
      name: 'idx_ot_comments_counterparty_site',
      fields: ['counterparty_id', 'construction_site_id']
    }
  ]
});

export default OtComment;
