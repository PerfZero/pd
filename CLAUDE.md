# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Проект
Портал для управления пропусками сотрудников (регистрация, учёт, контроль).

**Стек:**
- Frontend: React 18.2 + Vite 5.0 + Ant Design 5.28+ + Zustand
- Backend: Node.js + Express + Sequelize
- Database: Yandex Managed PostgreSQL 17.6
- Storage: S3-совместимое хранилище (Cloud.ru/Yandex Cloud/AWS S3)
- Auth: JWT + bcrypt + refresh tokens

## Быстрый старт
```bash
# Client (port 5173 HTTPS)
cd client && npm run dev

# Server (port 5000)
cd server && npm run dev

# Проверка подключения к БД
cd server && npm run db:check

# Lint
cd client && npm run lint

# Build
cd client && npm run build
```

## Архитектура

### Frontend (FSD)
```
client/src/
├── pages/         # Страницы-роуты (→ widgets, features, entities, shared)
├── widgets/       # Сложные блоки (→ features, entities, shared)
├── features/      # Бизнес-функции (→ entities, shared)
├── entities/      # Сущности api/, model/ (→ shared)
├── shared/        # UI-kit, utils, config
├── store/         # Zustand: authStore, employeesStore, referencesStore, pageTitleStore
├── services/      # API сервисы (Axios instance в api.js с auto-refresh)
├── layout/        # Layout компоненты
└── theme/         # Ant Design тема
```

**Path aliases (vite.config.js):**
- `@/` → `./src`
- `@/entities`, `@/widgets`, `@/features`, `@/pages`, `@/shared`

### Backend
```
server/src/
├── controllers/   # Бизнес-логика (*.controller.js)
├── routes/        # API маршруты (*.routes.js)
├── models/        # Sequelize модели
├── services/      # Сервисы, включая storage/ для S3
├── middleware/    # auth, upload, errorHandler, validator
├── config/        # database.js, storage.js
└── scripts/       # Утилиты (recalculateEmployeeStatuses.js)
```

**API:** базовый путь `/api/v1`, сервисы именуются `*Service.js`

## Ключевые сущности БД
Employee, Application, Counterparty, Contract, Pass, Department, Position, Citizenship, ConstructionSite, AuditLog

**Many-to-many:** суффикс `_mapping` (application_employees_mapping, employee_counterparty_mapping)

**Схема:** `sql/schema/bd.json`

## Стиль кода
- **Максимум 600 строк на файл** — разбивать на компоненты
- Functional React components с хуками
- Async/await для асинхронных операций
- camelCase для переменных, PascalCase для компонентов
- **Комментарии ТОЛЬКО на русском языке**
- **Коммуникация в чате ТОЛЬКО на русском языке**

## Коммуникация
- ❌ НЕ выводить код в ответах — только описание изменений
- ✅ Писать лаконично, использовать эмодзи (✅ ❌ 📋 🎯)
- ✅ Указывать какие файлы изменены и что перезапустить

## Переменные окружения
- ❌ НЕ читать, НЕ искать, НЕ модифицировать файлы `.env`
- При необходимости указать какие переменные нужны, но не запрашивать значения

## Ключевые принципы
- Ant Design 5 для всех UI компонентов
- Responsive design (desktop + mobile)
- Все изменения БД — через миграции с подтверждением
- Документация в `temp/`, корень должен быть чистым
- Файлы хранить ТОЛЬКО через S3
- **БД только удалённая** — локальный PostgreSQL запрещён

## Работа с задачами
**ОБЯЗАТЕЛЬНО перед выполнением:**
1. Проанализировать задачу на наличие разных вариантов решения
2. Если есть варианты — описать плюсы/минусы и спросить разработчика
3. Приступать только после подтверждения

**Уточнять:** добавление полей БД, рефакторинг, архитектурные изменения, разные подходы.
**Не уточнять:** очевидные исправления, чёткие задачи, стандартный CRUD.

## База данных

### ❌ ЗАПРЕЩЕНО:
- Локальный PostgreSQL
- `sequelize.sync()` в server.js
- Автоматическое создание таблиц
- Изменения структуры БД без согласования

### ✅ РАЗРЕШЕНО:
- Изменения только через миграции (показать → одобрить → запустить)
- `npm run db:check` для проверки подключения

## Документация

### ❌ ЗАПРЕЩЕНО:
- MD файлы в корне проекта (кроме README.md, CLAUDE.md)
- Отчётные документы о выполненных задачах
- Файлы с инструкциями после работы

### ✅ РАЗРЕШЕНО:
- Временные файлы в `temp/` (при крайней необходимости)
- Все объяснения — в чате

## Git
- ❌ НЕ создавать коммиты
- ❌ НЕ пушить на GitHub
- ✅ Разработчик сам управляет Git
