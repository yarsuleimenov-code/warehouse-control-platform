# Loading Control: исходное состояние перед QR

Дата: 2026-10-28 (Asia/Qyzylorda). Этап: исследование локальных материалов и документация; интеграция не выполнялась.

Версионируемая копия перенесена в WCP по следующей задаче owner: локальный аудит и сохранение существующего состояния в отдельной GitHub-ветке. Коммит/push разрешены; Apps Script публикация и изменения кода запрещены. Исходные документы в родительском каталоге сохранены. Ниже исходный Git inventory описывает состояние **до** сохранения; результаты текущего аудита — в разделе 9. Пути таблицы каталогов относятся к родительскому workspace `E:\Codex\Loading_control`, а не к корню GitHub repository.

## 1. Вывод и достоверность

Loading Control — ведущий контур. Рекомендуемая локальная база дальнейшей работы — `E:\Codex\Loading_control\warehouse-control-platform` (далее WCP): отдельный Git checkout с более поздними изменениями Stage 6. Это **кандидат исходников, а не подтверждённая копия production**. Корневой комплект отстаёт, но указывает на тот же Apps Script. До публикации необходимо установить фактическую версию deployment и сохранить расхождения.

Обозначения: **К** — подтверждено локальным кодом/файлами; **И** — историческое утверждение документации, сейчас не проверено; **П** — пробел проверки. Наличие реализации не доказывает её исполнение в production.

Пользователь — сотрудник склада NY/CA. Основной сценарий: вход → workflow/truck → Loading → Save → Generate Trip → Unloading → Close Trip. Готовность этого этапа: следующий разработчик понимает варианты кода, контракты и запреты; рабочие данные и deployment сохранены.

## 2. Каталоги и версии

| Каталог/файлы | Установлено локально | Как использовать |
| --- | --- | --- |
| `warehouse-control-platform/` | К: Git `main`, Stage 6, keyed loading state, BOL notification, свои docs/tests | Основной кандидат для интеграции после сверки live |
| Корень: `Code.js`, `Config.js`, `Auth.js`, `LoadingService.js`, `UnloadingService.js`, `Index.html`, `appsscript.json` | К: отдельный полный WCP-комплект; `APP_VERSION=stage4-cleanup-2026-07-15`; нет OrderLoadingState; Save без общего lock, total/count updates используют строки Orders | Более ранняя копия, не публиковать поверх Stage 6 |
| Корневые `.clasp.json`, `.claspignore` | К: rootDir `.`; allowlist только семи перечисленных файлов | Clasp из корня выберет раннюю копию, не вложенный WCP |
| `CodeV2.js`, `IndexV2.html` | К: альтернативный LC_V2, Orders/OrderPieces, другая модель | Не входят в корневой allowlist; не объединять |
| `docs/Code.js`, `docs/Index.html`, `current-state-analysis.md`, `loading-control-v2-*` | Референс прежнего Loading Control; `docs/Code.js` использует общий Orders | История, не актуальный контракт WCP |
| `interstate-bol-mvp/` | К: отдельный Apps Script, свои Sheets/Drive/PDF/очередь | Сохранить независимую ответственность BOL |
| `docs/system-integration-audit/`, остальные audit-папки | И: результаты прежних исследований | Проверять дату и код; не считать live baseline |
| `tmp/`, `.tmp_bol_audit/`, BOL backups | Временные/резервные материалы, не исследовались как рабочий исходник | Не публиковать и не включать закрытые данные в Git |
| `E:\Codex\Barcode scanner` | К: самостоятельный QR-проект разработки; AGENTS, src, apps-script, scripts, test | Донор возможностей, его тестовые данные не переносить |

Сравнение после нормализации CRLF/LF и конечных переводов строк: корень и WCP совпадают по Code.js, Auth.js, appsscript.json, .clasp.json; различаются Config.js, LoadingService.js, UnloadingService.js, Index.html. Поэтому различие комплектов не сводится к форматированию.

Аудит от 2026-08-12 называл корневой Code.js legacy с getActiveSpreadsheet. Сейчас корневой Code.js уже является WCP и открывает workbook по ID: старое описание корня устарело. Корневые CURRENT_SYSTEM/DATA_MODEL/BUSINESS_PROCESSES также не описывают поздний keyed state; для деталей Stage 6 читать одноимённые документы **внутри WCP**. Эти документы тоже дополняются проверками кода ниже.

### Git до изменений этого этапа

- В `E:\Codex\Loading_control` каталог `.git` пуст (0 entries); Git сообщает `not a git repository`. Branch/commit и Git diff корня недоступны. Это не «чистый checkout».
- В WCP: branch `main`, HEAD `88ecce9bc8e6e17ba806c64196edb159eaa6f8f2`; origin `https://github.com/yarsuleimenov-code/warehouse-control-platform.git`. Remote не опрашивался.
- Staged diff пуст. Существующие unstaged изменения:

```text
 M Config.js
 M LoadingService.js
 M README.md
 M UnloadingService.js
 M docs/BUSINESS_PROCESSES.md
 M docs/CURRENT_SYSTEM.md
 M docs/DATA_MODEL.md
 M docs/MOBILE_APP_HANDOFF.md
?? tests/loading_state.test.js
```

Tracked diff до переноса документов: 8 файлов, +267/-101 строк. Изменения не сбрасывать и не выдавать исходный HEAD за полный baseline: рабочее дерево содержит дополнительные решения. В QR-каталоге `.git` отсутствует; его Git-версия не установлена. Первоначальные документы были вне checkout. Теперь baseline и план находятся в WCP `docs/` и включаются в отдельный baseline-коммит; родительские копии остаются историческими. Корень workspace целиком не копируется.

SHA256 исходников WCP на момент проверки (байтовые, до любых правок этапа):

| Файл | SHA256 |
| --- | --- |
| Code.js | `A3893A4F5600DB1FC2C0BA5BD04493CD68B3841526659B665550BC987655A20B` |
| Config.js | `4A79FED054512F5404DB99AB654A3BB4D03861E00A4C9C71FA06BFA82965AA09` |
| Auth.js | `A71C6496A3FC7A4D2EC442390BB1D0EC03F29E9F3848051F5B2B02A45F055834` |
| LoadingService.js | `3F7695780ACC2DA538A6FEB83B79519BE16AED254B86EA158E7A5B66D3550B4F` |
| UnloadingService.js | `DDC26F29CBF2F3DDF9A4CAE707844431A57EDC6076EDB91D9DBCF859910A89BA` |
| Index.html | `30C4623A5F34FEC073967F993AA2FEF6A2D40815AA87E8C224D285A4ED3DAB1C` |
| appsscript.json | `21915FB520B64D27D2BEFF3DD6D35A29D6F4CE04E868A8213280C4D174A6FBEE` |

## 3. Apps Script и production

- К: оба `.clasp.json` содержат один Script ID `1n4m5FVJT04spx-KwkYGIdaaThB1OohPRYAvElbSasl40dMSgfRxD4N5s`, rootDir `.`. Это связь конфигурации, не доказательство последнего push/deploy.
- К: оба Config.js указывают Spreadsheet `13gYc73705Q-HVUQxDWwLKdGU4ij6i0OUbdBiKoJnWuQ`. WCP APP_VERSION: `stage6-loading-state-2026-09-24`; строка версии сама по себе не доказывает публикацию.
- И: [руководство](USER_GUIDE_LOADING_CONTROL_AND_BOL.md) содержит URL Warehouse Control; аудит 2026-08-12 сообщает web deployment version 20 и live-файл `Triggers F5.gs`, отсутствующий локально.
- П: текущие deployment ID → numbered version → полный source snapshot, editor HEAD, настройки доступа, triggers/properties и соответствие локальному WCP не проверены. Редактор и рабочее приложение в этом этапе не открывались.
- Следующий способ проверки: owner предоставляет контролируемый экспорт **исходников опубликованной версии**, deployment metadata и отдельно editor HEAD/trigger inventory. Сравнить с обоими комплектами в изолированном каталоге. Экспорт HEAD или `clasp pull` сам по себе не доказывает соответствие опубликованной версии. Не перезаписывать текущие файлы; секреты и закрытые экспорты хранить вне Git. Это последующий этап с отдельным scope.

## 4. Основные сценарии и правила WCP (К)

1. Login по Users; workflow из Access; NY_LOADING/CA_LOADING и NY_UNLOADING/CA_UNLOADING. Три truck: Truck 1 (26 ft), Truck 2 (16 ft), Extra 26 ft. Время операций — America/New_York.
2. Loading читает Orders_NY/Orders_CA; без OrderID/ID или поддержанного ColorCode (1/2/3, red/yellow/green) строка пропускается. Title, zones, weight, volume, delivery date — атрибуты, не ключи.
3. PiecesTotal после первого Save берётся из OrderLoadingState, до этого — fallback из Orders.PiecesTotal/Pieces. Ноль в state означает явное очищение. Положительный total создаёт недостающие PieceNumber `1..N`; уменьшение старые строки не удаляет.
4. Count-only Loading без total сохраняет последовательные загруженные номера в OrderPieces; это техническое представление количества, а не доказательство маркированного физического места. Legacy Orders.LoadedPieces игнорируется.
5. Save под ScriptLock пишет total, count-only updates, piece updates. Loaded — boolean; LoadedAt устанавливается при загрузке и очищается при снятии отметки. Чтение панели `getLoadingPieces` тоже создаёт недостающие строки; это не read-only endpoint.
6. Generate Trip требует доступа и непустого truck, отправляет pending через UI, под lock фиксирует только новую ранее не reported часть. CountPieces содержит новые номера при известном total. TripReports append-only; total reported считается по истории. Полностью отправленные и пустые строки очищают legacy Pieces в Orders с повторной проверкой строки; state по OrderID остаётся. После записи и releaseLock вызывается BOL.
7. В WCP склады в snapshot рассчитываются из зон: NY/NYC → NJ1; CA (SF) → CA2; другие CA → CA1; иначе config fallback. Route остаётся NY to CA / CA to NY. Unloading фильтрует по Route, сохраняет склады каждой строки; текущий склад места нельзя вывести из branch или zone автоматически.
8. Unloading читает незакрытый TripID своего Route. Ожидаемые номера — CountPieces, иначе `1..LoadedPieces`. Отметки — память страницы. Close Trip явно подтверждается пользователем; сервер под lock повторно проверяет закрытие, пишет Receiving, затем Missing. Любая подходящая Receiving-строка делает рейс закрытым.

Расчёты: при известном total N и множестве ранее reported R, новая отправка — loaded номера вне R; остаток `max(0, N - reportedLoadedCount - newlyLoadedCount)`. При N=3, loaded={1,3}, R={1}: новая={3}, остаток=1. Count-only: новая величина `max(0, loadedCount - reportedCount)`, без доказанной физической идентичности. Missing = expected номера минус received номера; expected={1,3}, received={3} → missing={1}.

Loading UI: Requires Pieces / Not Started / Started / Completed. TripReports: Started либо Completed. Unloading UI: Not received / Partial / Received; persisted Receiving: Missing при любом missing, иначе Received при достаточном count, иначе Partially received. Missing создаётся с IssueType=Missing, Status=Open. Исправление/reopen, extra/damaged, разрешение Missing, Pickup/Delivery не реализованы. QR ещё не подключён.

## 5. Модель данных и ответственность

Детальные поля: [WCP DATA_MODEL](DATA_MODEL.md). Ключи логические, Sheets не обеспечивает уникальность.

| Сущность | Связи и значимые поля | Чтение/запись |
| --- | --- | --- |
| Users | Username, Password, Access, Active; первый совпавший username без учёта регистра | Auth читает; setup создаёт заголовки/формат; пользователей поддерживают вручную |
| Orders_NY/CA | предполагаемый ключ Branch + OrderID; aliases OrderID/ID; total fallback, Title, PickupZone/DeliveryZone, Weight, Volume, ColorCode | WCP читает; Generate очищает legacy Pieces; внешний поставщик/формулы и их реальная настройка — П |
| OrderLoadingState | Branch + OrderID; PiecesTotal, UpdatedAt/By | WCP владеет operational total после первого Save |
| OrderPieces_NY/CA | Branch + OrderID + PieceNumber; Loaded, LoadedAt, UpdatedAt, LoadedBy, TripID | WCP создаёт/перезаписывает state; TripID колонка читается, но здесь не заполняется |
| TripReports | группа по TripID, строка заказа/порции; OrderID, Branch, Route, Truck, total/counts, CSV номеров, склады, snapshot Title/Weight/Volume | Loading append; Unloading/BOL read; отдельной master Trip нет |
| Receiving | TripID + OrderID предполагаются ключом; received/missing counts и CSV, actor/time, склады | Unloading append; признак закрытия по Branch/Route/TripID |
| Missing | MissingID = ReceivingID-OrderID-PieceNumber; TripID/OrderID/PieceNumber, Open | Unloading append; обработка найденных позже мест отсутствует |
| QR S1 Data | External ID строкой, title/address/zone/description/status | QR sourceOrder_ читает getDisplayValues; WCP связь с этим источником — П |
| QR S2 | Orders/Operations/CargoPlaces/Events/LabelPrints/Requests, ActiveOrders | Отдельный тестовый контур QR; не источник рабочих WCP total/номеров |

WCP Orders читаются через getValues и OrderID приводится String; сохранность ведущих нулей зависит от типа исходной клетки. QR External ID сравнивается буквально через display values, без trim/Number. Равенство OrderID и External ID **не установлено**. Не установлено и равенство PieceNumber/pieceNumber и PlaceNo/place_no.

Идентичность места в WCP недостаточно доказана для печати: составной ключ существует в коде, но нет гарантий неизменности OrderID между складами, отсутствия повторного использования заказа/номера, корректности count-only номеров и связи одной физической упаковки с номером. Это пробел данных/правил, а не доказательство необходимости UUID или новой схемы.

## 6. Авторизация и локальное хранение (К)

- Auth.js проверяет пароль только в login; пароли в Users — plain text, сравнение после trim. Нет server session/token. assertUserAccess_ доверяет username запроса и проверяет только Active/Access. Подстановка имени разрешённого пользователя не привязана к доказанному login.
- getLoadingData/getLoadingPieces/getUnloadingTrips/getUnloadingTrip не вызывают assertUserAccess_. Некоторые создают support sheets/строки. Нельзя использовать их для безопасной анонимной QR-карточки.
- Локальный manifest: executeAs USER_DEPLOYING, access ANYONE_ANONYMOUS; V8, scopes Sheets/external_request/scriptapp; doGet ALLOWALL. Фактические production настройки — П; в этом этапе не менялись.
- Browser localStorage: общая session `warehouse-control:v1:session`, TTL 12 часов только на клиенте. Queue/cache: workflow.storageNamespace + username + pending/orders-cache/pieces-cache. Очередь содержит total/count/piece changes; Save ручной, после успеха queue очищается; backend timeout 12 секунд не означает отмену серверной записи.
- Logout удаляет session, но не очищает все пользовательские caches/queues. Общий телефон требует отдельного решения по доступу к сохранённым данным.
- Нет Service Worker, гарантированного холодного старта без сети, operation ID, version conflict resolution, server idempotency и durable Unloading queue. При потере localStorage остаётся лишь текущая страница с предупреждением. Генерацию QR offline нельзя автоматически приравнивать к выдаче новых номеров.

## 7. Interstate BOL и поставка

К: manifest закрепляет `InterstateBol` version 1, developmentMode=false, library/Script ID `1cPvKKlQI1L1sNGR75lvvYZ3ByY4S5bhgA2VUcQc6jDuIttn-Zz7wiXFM`. `notifyInterstateBol_` передаёт TripID/Route после TripReports и releaseLock; failure → NOTIFICATION_FAILED, рейс не откатывается.

К: локальный BOL читает WCP TripReports, пишет собственные BOL_AutoQueue/BOL_Registry и Drive/PDF; defaults — worker до 3 trips/run, reconciliation до 5000 строк, retry до 3. И: минутный worker/часовая reconciliation наблюдались раньше. Их текущее состояние и полный E2E — П.

Текущий локальный BOL поддерживает NJ1/CA1/CA2 и PDF с формами получателей, полным весом/объёмом заказа, существующим документом при повторе TripID; источники вне этого Git checkout: `E:\Codex\Loading_control\interstate-bol-mvp\README.md` и `RECEIVER_BOLS_RELEASE.md` в том же каталоге. Они не включены в baseline-ветку WCP. Не доказано, что эти изменения опубликованы, и pinned v1 не означает latest BOL HEAD. TripID/CountPieces/склады нельзя менять без проверки BOL parser, очереди, старых документов.

WCP не требует сборки: Apps Script JS + HtmlService Index. Локальные безопасные проверки из WCP: `node --check <server.js>`, `node tests/loading_state.test.js`, `node tests/bol_notification.test.js`. Два последних набора выполнены 2026-10-28: all assertions passed; это VM/stubs без обращения к Sheets, не E2E. Никакие setup/миграции/build QR/live tests не запускались.

Публикация/откат — только будущая процедура: сначала получить полный versioned snapshot и deployment metadata, проверить в изолированной среде, затем обновить существующий deployment на согласованную numbered version с сохранением URL и pinned BOL. Вложенный WCP не имеет собственного .claspignore: прежде чем когда-либо push, явно проверить upload inventory. Сейчас push/deploy запрещены. Для отката зафиксировать предыдущую numbered version/dependency/config и вернуть deployment к ней; кодовый rollback не откатывает Sheets. При новых записях сначала остановить новый QR writer, сверить ACK/журнал; не удалять TripReports/Receiving/Missing или QR-тесты. Текущий номер пригодной rollback-версии неизвестен.

## 8. Дефекты, риски и пробелы

Подтверждено кодом (не означает инцидент в production):

- Нет надёжной серверной аутентификации и защиты всех чтений; см. раздел 6.
- TripID/ReceivingID имеют точность до минуты: возможны коллизии одного направления; lock не делает время уникальным.
- Sheets multi-write не транзакционен: Save, TripReports→очистка legacy Pieces, Receiving→Missing могут завершиться частично. После TripReports сбой очистки способен прервать путь уведомления BOL.
- Piece updates не проверяют существование заказа/верхнюю границу total; Unloading нормализует полученные номера, но не пересекает их с expected set перед подсчётом received.
- Уникальность Orders/piece keys не обеспечена; total можно уменьшить ниже существующих мест; support setup может переписать заголовки. Скриптовый lock не защищает внешние формулы/ручные правки и второй Apps Script writer.
- Полная перезапись OrderPieces, линейное чтение истории и localStorage без conflict versioning ограничивают конкуренцию и масштаб.

Пробелы и конкретная проверка следующего этапа:

| Пробел | Необходимое доказательство |
| --- | --- |
| Какая версия действительно работает | Owner export опубликованной версии + metadata и comparison, включая отсутствующие локально файлы |
| Кто обновляет Orders и как OrderID связан с External ID | Описание формул/импорта и обезличенная проверка типов, уникальности, ведущих нулей, CA/NY повторов и истории ID |
| Стабильна ли физическая идентичность места | Сверка заказ→упаковка→PieceNumber→CountPieces→приёмка, частичные рейсы и count-only случаи |
| Реальные Sheets headers/state и пользователи | Owner проверяет схему, агрегаты дублей/аномалий и права; без паролей и персональных строк в документах |
| Текущие BOL версия/trigger/queue/E2E | Метаданные и контролируемый тест позже на согласованном контуре |
| QR access/version и реальные устройства | Позднейшие AGENTS сообщают v22/режим «Все»/execute-as-owner; README/API docs описывают прежний owner-only. Нужна сверка owner, свойства не раскрывать |

Предположения: WCP Stage 6 — наиболее поздняя локальная база; существующего составного ключа может хватить после проверки. Ни live соответствие, ни mapping, ни готовность iPhone/принтера предположениями не закрываются. Закрытые snapshots, S1/S2 и редактор Apps Script не открывались; данные, доступ, код и deployment не изменялись.

## 9. Целевой аудит и GitHub baseline — 2026-10-28

**Это локальный baseline-кандидат; соответствие опубликованной версии Apps Script ещё не подтверждено.** Ветка сохранения: `baseline/pre-qr-integration-2026-10-28`, исходный HEAD указан в разделе 2. Baseline-коммит определяется вершиной этой ветки при первоначальном сохранении и сообщением `chore: preserve local pre-QR baseline candidate`; его хеш сообщается в результате задачи, без самоссылочного изменения коммита.

Назначение существующего diff:

| Файлы | Сохранённые изменения / согласованность |
| --- | --- |
| Config.js | Stage 6 version и общий OrderLoadingState для NY/CA; соответствует keyed-total документации |
| LoadingService.js | Total по Branch+OrderID, count-only state в OrderPieces вместо номера строки, общий lock Save/открытия pieces; зоны → склады snapshot NJ1/CA1/CA2 |
| UnloadingService.js | Отбор/закрытие по точному Route, сохранение складов каждой order-строки вместо только meta первой строки |
| README, BUSINESS_PROCESSES, CURRENT_SYSTEM, DATA_MODEL, MOBILE_APP_HANDOFF | Ранее изменённое описание keyed state/count-only сохранено; точки входа и уточнения аудита добавлены без замены истории |
| tests/loading_state.test.js | Синтетический VM/stub тест: legacy count игнорируется, total override/clear/fallback, count-only conversion, Save по ID при неверном row, отсутствующий заказ |

Код приложения, manifest и clasp config во время этой задачи не редактируются. Изменения приложения в коммите — существовавший до аудита diff. UI payload уже содержит orderId, поэтому смена ключа сохранения совместима по форме запроса. Проверки не доказывают совместимость фактических старых данных.

### Риски изменения поведения и пробелы тестов

- **Блокер публикации при наличии legacy-only count.** На синтетическом заказе с Orders.LoadedPieces=5 и пустым OrderPieces текущий buildOrder_ возвращает loadedPieces=0. Это подтверждённая смена поведения; наличие таких рабочих записей неизвестно. До deployment owner должен проверить агрегат таких случаев и согласовать сохранение фактов. Автомиграция/исправление здесь не выполнялись.
- **Блокер публикации при старых/нестандартных Route.** Синтетический Trip с совпадающими NY/CA warehouses, но пустым Route отклоняется getUnloadingTrip; с точным `NY to CA` принимается. Старый фильтр был по складам. Проверить покрытие точных Route в TripReports/Receiving; не подставлять/переписывать их автоматически. Результат сохранён как риск, не как доказанный production-инцидент.
- **Новая схема — не миграция.** ensureLoadingSupportSheets_ создаёт OrderLoadingState при обычном чтении. Публикация не является только UI-изменением; фактические заголовки, state priority и старые значения требуют отдельной сверки.
- ScriptLock сериализует Save в одном проекте, но не предотвращает stale last-write-wins для одного места/total, внешнее редактирование или partial writes. Перенос total в state не делает операции транзакционными.
- Существующие два unit-набора не покрывают полный route/warehouse flow, конкуренцию, отказ Sheets, восстановление после timeout и BOL E2E. Дополнительные синтетические проверки ниже уменьшают только локальные пробелы; производственная готовность не заявляется.
- Ранее установленные auth gap, минутные TripID, отсутствие range/expected-set validation и неподтверждённая идентичность мест остаются; см. раздел 8 и QR plan. Они блокируют безопасное включение QR, но не сохранение исходников в отдельной ветке.

### Локальные проверки

Выполнены без live API и записи в таблицы:

- `node --check` для Code.js, Config.js, Auth.js, LoadingService.js, UnloadingService.js — pass.
- Синтаксическая компиляция inline JavaScript Index.html через vm.Script — pass (1 script).
- `node tests/loading_state.test.js` и `node tests/bol_notification.test.js` — all assertions passed.
- Одноразовые VM/stub assertions через stdin: warehouse mapping NJ1/CA1/CA2 и unknown-zone fallback — pass; legacy-only count и пустой Route — воспроизведены описанные ограничения. Временные файлы/рабочие записи не создавались.
- `git diff --check`, проверка локальных Markdown links, просмотр явно выбранного staged diff и проверка на секреты/данные перед commit. Spreadsheet/Script/deployment IDs в коде — идентификаторы ресурсов, не credentials; токены/пароли и персональные строки заказов не добавляются. Test order IDs вымышленные.

Состав сохранения: существующие 8 tracked изменений + tests/loading_state.test.js; AGENTS.md, baseline и QR plan в checkout, документальные уточнения этого аудита. Исключены родительский старый upload-комплект, BOL-проект, QR-проект/его тестовые данные, tmp/private/export материалы; существующие неизменённые tracked файлы остаются частью Git snapshot. Исходные parent baseline/plan сохранены без правок. Remote branch проверяется до создания/публикации, история не перезаписывается; main не сливается, PR не создаётся.

Следующий шаг после GitHub-сохранения: owner-controlled сверка опубликованной Apps Script версии с этим snapshot, затем read-only проверка legacy counts/Route/headers и identity mapping. Никакие рекомендации deployment/setup из старого README не являются разрешением выполнять их в этом этапе.
