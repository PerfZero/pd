# TODO по задаче 2.1.1 (Рефакторинг компонентов)

Цель: закрыть требования по читаемости, поддерживаемости и производительности клиентской части.

## 1. Аудит и приоритизация крупных компонентов

- [ ] Обновить список самых больших файлов `client/src` и зафиксировать baseline LOC.
- [ ] Выделить приоритет-1 для декомпозиции:
  - [ ] `client/src/components/Employees/EmployeeFormModal.jsx`
  - [ ] `client/src/components/Employees/MobileEmployeeForm.jsx`
  - [ ] `client/src/pages/SkudAdministrationPage.jsx`
  - [ ] `client/src/pages/AnalyticsPage.jsx`
  - [ ] `client/src/pages/UserProfilePage.jsx`

## 2. Декомпозиция форм сотрудников (обязательный блок ТЗ)

- [ ] Разделить `EmployeeFormModal` на контейнер + подкомпоненты по доменным зонам (данные, документы, патент, файлы, контрагенты, OCR/MVD).
- [ ] Разделить `MobileEmployeeForm` на подкомпоненты секций (персональные данные, документы, статусы, контрагент, действия).
- [ ] Вынести повторяющуюся логику desktop/mobile в общие хуки/утилиты.
- [ ] Снизить размер каждого формы-компонента до целевого диапазона (ориентир: < 1000 LOC на файл).

## 3. Удаление неиспользуемого и закомментированного кода

- [ ] Удалить неиспользуемые импорты и переменные:
  - [ ] `client/src/pages/OcrMvdTestPage.jsx` (`Alert`)
  - [ ] `client/src/pages/OccupationalSafetyPage.jsx` (`isDefaultCounterpartyUser`)
  - [ ] `client/src/widgets/occupational-safety/instructions-card/InstructionsCard.jsx` (`Text`)
- [ ] Удалить закомментированные JSX-блоки из рабочих компонентов:
  - [ ] `client/src/widgets/occupational-safety/instructions-card/InstructionsCard.jsx`
- [ ] Пройтись по предупреждениям `unused-imports/no-unused-vars` и закрыть их в целевых модулях.

## 4. Оптимизация рендеринга и hooks

- [ ] Закрыть `react-hooks/exhaustive-deps` в формах сотрудников:
  - [ ] `client/src/components/Employees/EmployeeFormModal.jsx` (инициализация и autosave callback)
- [ ] Проверить стабильность callback/derived values:
  - [ ] Вынести тяжелые вычисления в `useMemo`.
  - [ ] Обработчики, передаваемые вниз по дереву, стабилизировать через `useCallback` (где это влияет на ререндеры).
- [ ] Добавить `React.memo` для тяжелых дочерних компонент, если пропсы стабильны и есть подтвержденный выигрыш.

## 5. Технический долг линтера и quality gates

- [ ] Исключить `client/dist` из линта (через `.eslintignore` или конфиг), чтобы линтер проверял только исходники.
- [ ] Добиться прохождения `npm run lint` без ошибок по исходному коду.
- [ ] После рефакторинга прогнать smoke-проверку:
  - [ ] Создание/редактирование сотрудника (desktop)
  - [ ] Создание/редактирование сотрудника (mobile)
  - [ ] OCR/MVD сценарии в формах

## 6. Критерии приемки по 2.1.1

- [ ] Крупные компоненты разбиты на меньшие без регрессий поведения.
- [ ] Удалены неиспользуемые импорты, мертвый и закомментированный код.
- [ ] Снижено количество лишних ререндеров (подтверждено через React DevTools Profiler на ключевых сценариях).
- [ ] Линт проходит на исходниках клиентской части.

