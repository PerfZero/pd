# Охрана труда — роадмап (БД + API)

## 1. Модели данных (БД)

### 1.1. Категории и документы
- `ot_categories`
  - `id` (uuid, pk)
  - `name` (text, not null)
  - `description` (text, null)
  - `parent_id` (uuid, null, fk -> ot_categories.id)
  - `sort_order` (int, default 0)
  - `is_deleted` (boolean, default false)
  - `created_at`, `updated_at`

- `ot_documents`
  - `id` (uuid, pk)
  - `category_id` (uuid, not null, fk -> ot_categories.id)
  - `name` (text, not null)
  - `description` (text, null)
  - `is_required` (boolean, default false)
  - `template_file_id` (uuid, null, fk -> files.id)
  - `is_deleted` (boolean, default false)
  - `created_at`, `updated_at`

### 1.2. Библиотека шаблонов и инструкции
- `ot_templates`
  - `id` (uuid, pk)
  - `name` (text, not null)
  - `file_id` (uuid, not null, fk -> files.id)
  - `description` (text, null)
  - `is_deleted` (boolean, default false)
  - `created_at`, `updated_at`

- `ot_instructions`
  - `id` (uuid, pk)
  - `text` (text, null)
  - `file_id` (uuid, null, fk -> files.id)
  - `created_at`, `updated_at`

### 1.3. Документы подрядчиков
- `ot_contractor_documents`
  - `id` (uuid, pk)
  - `document_id` (uuid, not null, fk -> ot_documents.id)
  - `counterparty_id` (uuid, not null, fk -> counterparties.id)
  - `construction_site_id` (uuid, not null, fk -> construction_sites.id)
  - `file_id` (uuid, not null, fk -> files.id)
  - `status` (enum: not_uploaded | uploaded | approved | rejected)
  - `comment` (text, null) — причина отклонения
  - `uploaded_by` (uuid, not null, fk -> users.id)
  - `checked_by` (uuid, null, fk -> users.id)
  - `checked_at` (timestamp, null)
  - `created_at`, `updated_at`

- `ot_contractor_document_history`
  - `id` (uuid, pk)
  - `contractor_document_id` (uuid, not null, fk -> ot_contractor_documents.id)
  - `status` (enum)
  - `comment` (text, null)
  - `changed_by` (uuid, not null, fk -> users.id)
  - `is_active` (boolean, default true)
  - `created_at`

### 1.4. Статусы допуска подрядчиков
- `ot_contractor_status`
  - `id` (uuid, pk)
  - `counterparty_id` (uuid, not null, fk -> counterparties.id)
  - `construction_site_id` (uuid, not null, fk -> construction_sites.id)
  - `status` (enum: admitted | not_admitted | temp_admitted)
  - `is_manual` (boolean, default false)
  - `created_at`, `updated_at`

- `ot_contractor_status_history`
  - `id` (uuid, pk)
  - `counterparty_id` (uuid, not null, fk -> counterparties.id)
  - `construction_site_id` (uuid, not null, fk -> construction_sites.id)
  - `status` (enum)
  - `changed_by` (uuid, not null, fk -> users.id)
  - `is_active` (boolean, default true)
  - `created_at`

### 1.5. Комментарии
- `ot_comments`
  - `id` (uuid, pk)
  - `type` (enum: contractor | document)
  - `counterparty_id` (uuid, null)
  - `construction_site_id` (uuid, null)
  - `contractor_document_id` (uuid, null)
  - `text` (text, not null)
  - `created_by` (uuid, not null, fk -> users.id)
  - `created_at`

## 2. Роли и доступы (API)

- Администратор ОТ / Администратор портала
  - Полный CRUD категорий, документов, шаблонов, инструкций
  - Проверка документов подрядчиков
  - Загрузка документов от имени подрядчика

- Инженер ОТ
  - Просмотр/проверка документов
  - Загрузка от имени подрядчика

- User подрядчика
  - Только вкладка “Подрядчик”
  - Загрузка своих документов
  - Просмотр статуса

- Менеджер и User контрагента default — доступа нет

## 3. API: эндпоинты

### 3.1. Категории
- `GET /api/v1/ot/categories` — список (дерево1)
- `POST /api/v1/ot/categories` — создать
- `PATCH /api/v1/ot/categories/:id` — обновить
- `DELETE /api/v1/ot/categories/:id` — soft delete
- `PATCH /api/v1/ot/categories/:id/order` — reorder

### 3.2. Документы
- `GET /api/v1/ot/documents` — список
- `POST /api/v1/ot/documents` — создать
- `PATCH /api/v1/ot/documents/:id` — обновить
- `DELETE /api/v1/ot/documents/:id` — soft delete
- `POST /api/v1/ot/documents/:id/template` — загрузка бланка
- `GET /api/v1/ot/documents/:id/template` — скачать бланк

### 3.3. Библиотека шаблонов
- `GET /api/v1/ot/templates`
- `POST /api/v1/ot/templates`
- `DELETE /api/v1/ot/templates/:id`

### 3.4. Инструкции
- `GET /api/v1/ot/instructions`
- `POST /api/v1/ot/instructions`

### 3.5. Документы подрядчиков
- `GET /api/v1/ot/contractor-docs` (фильтры по объекту/контрагенту)
- `POST /api/v1/ot/contractor-docs` (загрузка подрядчика)
- `POST /api/v1/ot/contractor-docs/:id/approve`
- `POST /api/v1/ot/contractor-docs/:id/reject` (с комментарием)
- `GET /api/v1/ot/contractor-docs/:id/file` (скачать)

### 3.6. Статусы допуска подрядчиков
- `GET /api/v1/ot/contractor-status` (по объекту)
- `POST /api/v1/ot/contractor-status/:counterpartyId/:siteId/override` (temp_admitted)
- `POST /api/v1/ot/contractor-status/:counterpartyId/:siteId/recalculate`

### 3.7. Комментарии
- `GET /api/v1/ot/comments?type=contractor&counterpartyId=&siteId=`
- `POST /api/v1/ot/comments` — добавить

## 4. Сервисная логика

### 4.1. Расчет статуса допуска
- Если `is_manual=true` и статус `temp_admitted` — перекрывает авторасчет
- Авторасчет:
  - admitted: все обязательные документы подтверждены
  - not_admitted: есть незагруженный или отклоненный обязательный

### 4.2. Уведомления
- При переходе в `not_admitted`:
  - Email менеджеру контрагента
  - Уведомление в портале
  - Текст: объект + список недостающих документов

## 5. Этапы внедрения

1) Миграции БД + модели
2) Базовые CRUD API
3) Проверка/отклонение документов
4) Расчет статусов допусков + история
5) Уведомления
6) Комментарии


## 6. Прогресс по фронту (сделано)

### Раздел и маршрутизация
- Добавлен раздел «Охрана труда» в боковое меню и мобильное меню
- Добавлен маршрут `/ot` и страница `OccupationalSafetyPage`
- Ограничение доступа по ролям (admin / user‑подрядчик; запрет для default‑контрагента)
- Заголовок страницы в мобильном хедере

### Вкладка «Подрядчик»
- Summary‑карточка со статистикой документов
- Фильтры (для админа)
- Дерево категорий/документов
- Статусы документов и кнопки (загрузить / подтвердить / отклонить)

### Вкладка «Объект»
- Выбор объекта
- Сводка допусков
- Карточки подрядчиков со статусом и заполнением категорий

### Вкладка «Все объекты»
- Карточный список объектов со сводной статистикой и кнопкой «Открыть»

### Вкладка «Настройка»
- Управление категориями (дерево)
- Список документов в категориях
- Библиотека шаблонов
- Инструкции для подрядчиков

## 7. Файлы
- `client/src/components/Layout/Sidebar.jsx`
- `client/src/components/Layout/MobileDrawerMenu.jsx`
- `client/src/App.jsx`
- `client/src/pages/OccupationalSafetyPage.jsx`
