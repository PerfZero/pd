import { DataTypes } from 'sequelize';
import { sequelize } from '../config/database.js';

const RefreshToken = sequelize.define(
  'RefreshToken',
  {
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4
    },
    userId: {
      type: DataTypes.UUID,
      allowNull: false,
      field: 'user_id',
      references: {
        model: 'users',
        key: 'id'
      }
    },
    tokenHash: {
      type: DataTypes.STRING(128),
      allowNull: false,
      unique: true,
      field: 'token_hash'
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false,
      field: 'expires_at'
    },
    revokedAt: {
      type: DataTypes.DATE,
      allowNull: true,
      field: 'revoked_at'
    },
    replacedByTokenId: {
      type: DataTypes.UUID,
      allowNull: true,
      field: 'replaced_by_token_id'
    },
    createdByIp: {
      type: DataTypes.STRING(45),
      allowNull: true,
      field: 'created_by_ip'
    },
    userAgent: {
      type: DataTypes.TEXT,
      allowNull: true,
      field: 'user_agent'
    },
    createdAt: {
      type: DataTypes.DATE,
      field: 'created_at'
    },
    updatedAt: {
      type: DataTypes.DATE,
      field: 'updated_at'
    }
  },
  {
    tableName: 'refresh_tokens',
    timestamps: true,
    underscored: true,
    indexes: [
      {
        name: 'idx_refresh_tokens_user_id',
        fields: ['user_id']
      },
      {
        name: 'idx_refresh_tokens_token_hash',
        fields: ['token_hash']
      },
      {
        name: 'idx_refresh_tokens_expires_at',
        fields: ['expires_at']
      }
    ]
  }
);

export default RefreshToken;
