import { DataTypes } from 'sequelize';
import sequelize from '../config/database.js';

/**
 * Логи попыток несанкционированного доступа (401/403)
 */
const UnauthorizedAccessLog = sequelize.define('UnauthorizedAccessLog', {
  id: {
    type: DataTypes.UUID,
    defaultValue: DataTypes.UUIDV4,
    primaryKey: true,
    comment: 'Уникальный идентификатор записи'
  },
  userId: {
    type: DataTypes.UUID,
    allowNull: true,
    field: 'user_id',
    comment: 'ID пользователя (если удалось определить)'
  },
  statusCode: {
    type: DataTypes.INTEGER,
    allowNull: false,
    field: 'status_code',
    comment: 'HTTP статус (401/403)'
  },
  method: {
    type: DataTypes.STRING(10),
    allowNull: false,
    comment: 'HTTP метод'
  },
  path: {
    type: DataTypes.TEXT,
    allowNull: false,
    comment: 'Запрошенный путь'
  },
  ipAddress: {
    type: DataTypes.STRING(45),
    allowNull: true,
    field: 'ip_address',
    comment: 'IP адрес'
  },
  userAgent: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'user_agent',
    comment: 'User-Agent'
  },
  errorMessage: {
    type: DataTypes.TEXT,
    allowNull: true,
    field: 'error_message',
    comment: 'Сообщение об ошибке'
  },
  details: {
    type: DataTypes.JSONB,
    allowNull: true,
    comment: 'Дополнительные детали запроса (JSON)'
  },
  createdAt: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
    field: 'created_at'
  }
}, {
  tableName: 'unauthorized_access_logs',
  timestamps: false,
  indexes: [
    {
      fields: ['user_id'],
      name: 'idx_unauth_logs_user_id'
    },
    {
      fields: ['status_code'],
      name: 'idx_unauth_logs_status_code'
    },
    {
      fields: ['created_at'],
      name: 'idx_unauth_logs_created_at'
    }
  ]
});

export default UnauthorizedAccessLog;
