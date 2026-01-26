
### Высокий риск

1) IDOR / доступ к чужим сотрудникам через создание/обновление заявок  
Влияние: любой авторизованный пользователь может подставить произвольные `employeeIds`, что приводит к изменению статусов и маппингов сотрудников, которыми он не должен управлять.  
Доказательство: `server/src/controllers/application.controller.js:275`, `server/src/controllers/application.controller.js:402`, `server/src/controllers/application.controller.js:533`

2) IDOR / утечка файлов согласий  
Влияние: любой авторизованный пользователь может скачать согласия по произвольным `employeeIds`, без проверки принадлежности к заявке/прав.  
Доказательство: `server/src/controllers/application.controller.js:1034`, `server/src/controllers/application.controller.js:1070`

3) Эскалация прав для пользователей контрагента по умолчанию (привязка + обновление)  
Влияние: пользователь может привязать/обновить сотрудника без подтверждения, что тот относится к контрагенту по умолчанию; автоматическая привязка создаётся до проверки доступа.  
Доказательство: `server/src/controllers/employee.controller.js:562`, `server/src/controllers/employee.controller.js:888`

4) Обход проверки прав при смене/указании контрагента у сотрудника  
Влияние: обычный пользователь может передать `counterpartyId` при создании/обновлении сотрудника и тем самым привязать сотрудника к чужому контрагенту, обходя админский перевод.  
Доказательство: `server/src/controllers/employee.controller.js:562`, `server/src/controllers/employee.controller.js:929`

5) Изменение статусов сотрудников без проверки прав  
Влияние: любой авторизованный пользователь может обновлять флаг `isUpload` и устанавливать статус "Редактирован" для чужих сотрудников.  
Доказательство: `server/src/controllers/employee.controller.js:1463`, `server/src/controllers/employee.controller.js:1499`, `server/src/controllers/employee.controller.js:1545`

### Средний риск

6) Нет контроля доступа в помощнике выбора сотрудников для заявки  
Влияние: любой авторизованный пользователь может получить список сотрудников любого `counterpartyId` (утечка ФИО/должностей, перечисление).  
Доказательство: `server/src/controllers/application.controller.js:946`

7) Широкий доступ на чтение для контрагента по умолчанию  
Влияние: `getEmployeeById` разрешает чтение любых сотрудников контрагента по умолчанию (PII) через `checkEmployeeAccess(..., 'read')`.  
Доказательство: `server/src/controllers/employee.controller.js:458`, `server/src/utils/permissionUtils.js:13`

8) Договоры и объекты строительства доступны всем авторизованным  
Влияние: нет ограничений по контрагенту/роли для чтения договоров и объектов, возможна утечка данных между контрагентами.  
Доказательство: `server/src/controllers/contract.controller.js:5`, `server/src/controllers/constructionSite.controller.js:5`

9) Статусы сотрудников доступны без проверки прав  
Влияние: любой авторизованный пользователь может получать статусы по чужим сотрудникам и списки сотрудников со статусами без контроля доступа.  
Доказательство: `server/src/controllers/employeeStatus.controller.js:22`, `server/src/controllers/employeeStatus.controller.js:35`, `server/src/controllers/employeeStatus.controller.js:53`, `server/src/controllers/employeeStatus.controller.js:86`, `server/src/controllers/employeeStatus.controller.js:99`, `server/src/controllers/employeeStatus.controller.js:115`

10) Хранение access/refresh токенов в localStorage  
Влияние: при XSS злоумышленник может считать токены и получить доступ к аккаунтам; refresh токен также доступен JS-коду.  
Доказательство: `client/src/store/authStore.js:7`, `client/src/store/authStore.js:112`

11) Создание должностей через импорт без проверки прав  
Влияние: любой пользователь, имеющий доступ к импорту сотрудников, может создавать новые должности, обходя ограничения на управление должностями.  
Доказательство: `server/src/utils/importValidation.js:526`, `server/src/utils/importValidation.js:541`

12) Mass assignment при создании контрагента  
Влияние: создание выполняется через `Counterparty.create({ ...counterpartyData })` без allowlist; пользователь может установить чувствительные поля (например, `registrationCode`, `createdBy`).  
Доказательство: `server/src/controllers/counterparty.controller.js:210`, `server/src/controllers/counterparty.controller.js:240`

13) Утечка данных при валидации импорта сотрудников  
Влияние: ответ `validateEmployeesImport` включает данные существующих сотрудников (ФИО, ИНН, СНИЛС), даже если они из других контрагентов; можно собирать PII по ИНН.  
Доказательство: `server/src/services/employeeImportService.js:213`, `server/src/services/employeeImportService.js:221`

14) Refresh-токены не отслеживаются и не инвалидируются  
Влияние: refresh токены не хранятся в БД и не отзываются при logout/смене пароля, возможен replay и длительный доступ при компрометации.  
Доказательство: `server/src/controllers/auth.controller.js:220`, `server/src/controllers/auth.controller.js:241`, `server/src/controllers/auth.controller.js:265`

15) Смена пароля не инвалидирует активные JWT  
Влияние: действующие access/refresh токены продолжают работать после смены пароля, что снижает эффект компрометации.  
Доказательство: `server/src/controllers/user.controller.js:175`, `server/src/controllers/user.controller.js:323`

16) Долгоживущие access/refresh токены по умолчанию  
Влияние: access токен живет до 7 дней, refresh до 30; при компрометации окно доступа очень большое.  
Доказательство: `server/src/controllers/auth.controller.js:9`

### Низкий риск

17) Слабая политика паролей при создании/сбросе пользователей админом  
Влияние: админ может задать пароль длиной от 6 символов и без проверки на запрещенные пароли, что снижает стойкость аккаунтов.  
Доказательство: `server/src/routes/user.routes.js:27`, `server/src/controllers/user.controller.js:98`

18) Логирование персональных данных в проде  
Влияние: `createApplication` логирует полный `req.body` без проверки `NODE_ENV`, возможна утечка PII в логи.  
Доказательство: `server/src/controllers/application.controller.js:275`

19) Риск исчерпания памяти при загрузках  
Влияние: `multer.memoryStorage()` + большие лимиты (до 100MB на файл, до 10 файлов) могут привести к OOM под нагрузкой.  
Доказательство: `server/src/middleware/upload.js:33`, `server/src/routes/employee.routes.js:91`, `server/src/routes/application.routes.js:35`

20) Потенциально чувствительные материалы в репозитории  
Влияние: `cert/cert.pfx` может содержать приватный ключ. Это критичный секрет, который нельзя хранить в репозитории.  
Доказательство: `cert/cert.pfx`

21) Перечисление сотрудников по ИНН (факт существования)  
Влияние: для не-админов `checkEmployeeByInn` возвращает 409, если сотрудник найден в другом контрагенте, что позволяет подтверждать существование записей по ИНН.  
Доказательство: `server/src/controllers/employee.controller.js:2047`, `server/src/controllers/employee.controller.js:2060`

22) Mass assignment при обновлении контрагента  
Влияние: обновление выполняется через `counterparty.update(updates)` без allowlist; пользователь (не admin) может менять чувствительные поля (например, `registrationCode`, `type`) у своих субподрядчиков.  
Доказательство: `server/src/controllers/counterparty.controller.js:304`, `server/src/controllers/counterparty.controller.js:356`

23) Статистика по контрагентам доступна всем авторизованным  
Влияние: агрегированные данные по типам контрагентов доступны любому пользователю без ограничений; может раскрывать объемы/структуру базы.  
Доказательство: `server/src/controllers/counterparty.controller.js:477`

24) Долгоживущие публичные ссылки на файлы (Yandex Disk)  
Влияние: `getPublicUrl` публикует файл через API и возвращает постоянную ссылку, без механизма отзыва; пользователь с доступом может навсегда сделать файл публичным.  
Доказательство: `server/src/services/storage/providers/yandexDiskProvider.js:147`, `server/src/controllers/file.controller.js:248`, `server/src/controllers/employeeFile.controller.js:389`

25) Возможен Zip Slip при выгрузке согласий  
Влияние: имя файла берется из `file.fileName` и используется как имя записи в ZIP без очистки; при наличии `../` в имени возможна запись вне целевой директории при распаковке.  
Доказательство: `server/src/controllers/application.controller.js:1138`

26) Mass assignment в режиме привязки сотрудника  
Влияние: при привязке существующего сотрудника обновление выполняется без allowlist; пользователь может перезаписать чувствительные поля (например, `createdBy`).  
Доказательство: `server/src/controllers/employee.controller.js:619`, `server/src/controllers/employee.controller.js:633`

27) Проверка типа загружаемых файлов только по mimetype  
Влияние: злоумышленник может подменить `mimetype` и загрузить нежелательный контент; при выдаче публичных ссылок это повышает риск XSS/малвари.  
Доказательство: `server/src/middleware/upload.js:36`

28) Публичные настройки раскрывают внутренние конфиги  
Влияние: `getPublicSettings` возвращает детальные конфигурации обязательных полей; это может облегчить подбор/обход процессов и раскрывать внутреннюю логику.  
Доказательство: `server/src/controllers/settings.controller.js:26`

29) Избыточные логи с персональными данными при импорте  
Влияние: в логах остаются ФИО, даты и идентификаторы сотрудников; при утечке логов это раскрывает PII.  
Доказательство: `server/src/services/employeeImportService.js:370`, `server/src/services/employeeImportService.js:399`, `server/src/services/employeeImportService.js:415`

30) window.open / target="_blank" без noopener/noreferrer  
Влияние: при открытии внешних ссылок в новом окне возможен reverse tabnabbing (страница может получить доступ к `window.opener`).  
Доказательство: `client/src/components/Applications/ApplicationViewModal.jsx:69`, `client/src/components/Applications/ApplicationFileUpload.jsx:90`, `client/src/components/Applications/ApplicationFileUpload.jsx:124`, `client/src/components/Employees/EmployeeFilesModal.jsx:91`, `client/src/components/Employees/EmployeeFilesModal.jsx:102`, `client/src/components/Employees/EmployeeFilesModal.jsx:134`, `client/src/components/Employees/EmployeeImportModal.jsx:328`, `client/src/components/Employees/EmployeeFileUpload.jsx:143`, `client/src/components/Employees/EmployeeFileUpload.jsx:177`, `client/src/components/Employees/EmployeeDocumentUpload.jsx:187`, `client/src/components/Employees/DocumentTypeUploader.jsx:284`, `client/src/pages/LoginPage.jsx:350`, `client/src/pages/LoginPage.jsx:433`, `client/src/pages/ProfilePage.jsx:280`

31) Логи с персональными данными при обновлении профиля сотрудника  
Влияние: `updateMyProfile` логирует весь `req.body` и отфильтрованные данные, что может записать PII в логи.  
Доказательство: `server/src/controllers/employee.controller.js:2244`, `server/src/controllers/employee.controller.js:2280`

32) Логи загрузки файлов содержат имена файлов и пути  
Влияние: в логах фиксируются оригинальные имена файлов и пути хранения, что может раскрывать ПДн и внутреннюю структуру хранилища.  
Доказательство: `server/src/controllers/employeeFile.controller.js:32`, `server/src/controllers/employeeFile.controller.js:125`, `server/src/controllers/employeeFile.controller.js:153`, `server/src/controllers/applicationFile.controller.js:26`, `server/src/controllers/applicationFile.controller.js:78`, `server/src/controllers/applicationFile.controller.js:96`

33) Пользовательская регистрация раскрывает факт существования email  
Влияние: ответ `409` позволяет атакующему подтвердить зарегистрированные email (user enumeration).  
Доказательство: `server/src/controllers/auth.controller.js:91`

34) Примерные секреты и дефолтные пароли в репозитории  
Влияние: даже если это "пример", есть риск случайного использования в проде или утечки настоящих ключей из документации.  
Доказательство: `docker-compose.yml:8`, `docker-compose.yml:25`, `docker-compose.yml:50`, `Docs/PRODUCTION_ARCHITECTURE.md:284`

35) Утечка внутренних ошибок в ответах API  
Влияние: `error.message` возвращается клиенту в 500-ответах, что может раскрывать внутренние детали БД/инфраструктуры и упрощать атаки.  
Доказательство: `server/src/controllers/application.controller.js:169`, `server/src/controllers/counterparty.controller.js:125`

36) Назначение объектов/подразделений без проверки принадлежности  
Влияние: пользователь может привязать сотрудника к произвольным `constructionSiteId`/`departmentId`, даже если объект/подразделение не относится к его контрагенту. Это нарушает tenant-изоляцию и может искажать данные.  
Доказательство: `server/src/controllers/employee.controller.js:1181`, `server/src/controllers/employee.controller.js:1276`

37) Критичные действия по сотруднику доступны обычным пользователям  
Влияние: увольнение/активация/деактивация сотрудников доступны всем авторизованным без роли, при наличии доступа к сотруднику; это может позволить неавторизованные кадровые изменения.  
Доказательство: `server/src/routes/employee.routes.js:123`, `server/src/controllers/employee.controller.js:1651`

38) trust proxy включен без условной проверки окружения  
Влияние: при прямом доступе к приложению можно подменять `X-Forwarded-For`, обходить rate-limit и искажать аудит.  
Доказательство: `server/src/server.js:41`

39) Имя файла заявки формируется без очистки данных контрагента  
Влияние: `counterpartyName` используется в имени файла без санации; при наличии спецсимволов/слешей это может приводить к некорректным путям/обходу структуры хранения.  
Доказательство: `server/src/utils/transliterate.js:165`, `server/src/controllers/applicationFile.controller.js:85`, `server/src/controllers/applicationFile.controller.js:94`

40) Mass assignment в создании/обновлении заявок  
Влияние: пользователь может менять чувствительные поля заявки (например, `status`, `createdBy`, `applicationType`) без явного allowlist; это позволяет "самоутвердить" заявку.  
Доказательство: `server/src/controllers/application.controller.js:283`, `server/src/controllers/application.controller.js:526`

41) Нет rate limit на проверку ИНН сотрудников  
Влияние: endpoint `/employees/check-inn` позволяет быстрый перебор ИНН и перечисление записей; в сочетании с детальными ответами это усиливает утечку.  
Доказательство: `server/src/routes/employee.routes.js:96`, `server/src/controllers/employee.controller.js:1886`

42) Mass assignment в договорах и объектах строительства (admin endpoints)  
Влияние: прямое использование `req.body` позволяет задавать любые поля модели, включая чувствительные/внутренние; при компрометации admin-аккаунта это упрощает злоупотребления и нарушение целостности.  
Доказательство: `server/src/controllers/contract.controller.js:90`, `server/src/controllers/contract.controller.js:129`, `server/src/controllers/constructionSite.controller.js:90`, `server/src/controllers/constructionSite.controller.js:133`

43) Нет проверки, что объект/договор заявки принадлежит контрагенту  
Влияние: пользователь может привязать заявку к чужому объекту строительства или договору (IDOR на `constructionSiteId`/`subcontractId`), что нарушает tenant-изоляцию и целостность данных.  
Доказательство: `server/src/controllers/application.controller.js:295`, `server/src/controllers/application.controller.js:525`

44) Логи статусов сотрудников содержат ПДн  
Влияние: при пересчете статусов в логи пишутся ФИО и список незаполненных полей, что увеличивает риск утечки PII через логи.  
Доказательство: `server/src/utils/employeeStatusUpdater.js:25`

45) Health endpoint раскрывает окружение  
Влияние: `/health` возвращает `NODE_ENV`, что упрощает разведку среды и выбор атакующих векторов.  
Доказательство: `server/src/server.js:131`

46) Нет верхних ограничений на `limit` в ряде списков  
Влияние: пользователь может запросить очень большой `limit` и создать высокую нагрузку на БД (DoS на чтение).  
Доказательство: `server/src/controllers/employee.controller.js:85`, `server/src/controllers/employee.controller.js:2528`, `server/src/controllers/contract.controller.js:7`, `server/src/controllers/constructionSite.controller.js:7`, `server/src/controllers/user.controller.js:31`

47) IDOR при привязке файлов к заявке (selectedFiles)  
Влияние: можно указать произвольные `fileId`/`employeeId` и связать их с заявкой без проверки, что файлы принадлежат пользователю или выбранным сотрудникам.  
Доказательство: `server/src/controllers/application.controller.js:432`

48) Формирование имён файлов сотрудника без санации  
Влияние: `formatEmployeeFileName` использует ФИО без очистки; спецсимволы/слеши могут привести к некорректным путям/обходу структуры хранения.  
Доказательство: `server/src/utils/transliterate.js:138`, `server/src/controllers/employeeFile.controller.js:137`

49) Слабая генерация регистрационного кода контрагента  
Влияние: код состоит из 8 цифр и генерируется через `Math.random`, что делает его предсказуемым/подбираемым при наличии попыток регистрации.  
Доказательство: `server/src/controllers/counterparty.controller.js:534`
