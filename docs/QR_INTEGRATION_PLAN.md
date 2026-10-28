# План включения QR в Loading Control

Статус 2026-10-28: проект решения, без интеграции. Основание — [baseline](BASELINE_LOADING_CONTROL.md). Loading Control определяет данные и операции; QR адаптируется к нему. Это правило приоритетнее старого принципа самостоятельного QR/backend.

Документ версионируется в checkout WCP; исходная копия в родительском workspace сохранена как история. Текущий этап дополнен локальным аудитом и GitHub-сохранением в `baseline/pre-qr-integration-2026-10-28`, без изменения приложения. **Это локальный baseline-кандидат; соответствие опубликованной версии Apps Script ещё не подтверждено.** Перед сверкой/публикацией учесть риски legacy-only LoadedPieces и точного Route из раздела 9 baseline; интеграция по этому плану ещё не начата.

## 1. Рекомендуемый минимальный вариант

В подтверждённый WCP добавить генерацию/перепечатку этикеток и просмотр найденного места через QR, используя существующие заказы, количество и номера мест. Один Web App, один вход, один сервер проверки прав. Генерация не создаёт заказ и не меняет Loaded/Receiving; scan только открывает карточку. Save, Generate Trip и Close Trip сохраняют действующие бизнес-правила.

Минимальный готовый результат будущего пилота: авторизованный сотрудник находит существующий заказ, печатает N этикеток для уже определённых мест, повторно печатает те же номера, сканирует этикетку и видит правильный заказ/место/контекст. Отметка Loading/Unloading остаётся отдельным явным действием. Без устойчивого mapping выпуск этикеток блокируется только для проблемных заказов; действующий ручной Loading не останавливается.

Не подключать отдельный QR endpoint как второй operational writer и не импортировать его S2 Orders/CargoPlaces/Events в WCP. Тестовые QR-коды не должны резолвиться в рабочие заказы лишь по совпадению строкового номера.

Альтернатива при доказанной недостаточности существующих ключей: минимальный постоянный реестр соответствий существующему месту WCP с отдельным непрозрачным ID. Вводить только после описанного ниже identity gate; не переносить весь UUID/event/CAS стек QR по умолчанию. Отдельное QR-приложение допустимо как временный тестовый стенд, но не удовлетворяет цели единого входа.

## 2. Что переиспользовать

Изучены QR AGENTS/README/стартовый промпт; docs/schema, warehouse-labels, api-deploy, decisions, verification, source-audit, offline audit; src/qr.cjs, warehouse.html, warehouse-cache.cjs, scripts/build-warehouse.cjs и Apps Script Api/Warehouse. Ранние документы содержат историю; приоритет у последних owner-уточнений AGENTS и текущего кода, затем проверка соответствия live.

| Возможность QR | Решение для WCP |
| --- | --- |
| `src/qr.cjs`: локальный SVG QR, correction Q, quiet zone, UTF-8 | Переиспользовать encoder; отделить от жёстко заданного QR deployment URL и старой идентичности |
| `src/warehouse.html`: 4×3 in layout, preflight, print/browser PDF | Переиспользовать соответствующие части в существующем UI; не заменять Index целиком |
| `src/label-pdf.cjs` | Кандидат локального PDF; проверить font/layout, вместимость, страницы и лицензии |
| Фото → jsQR decode → просмотр, повторный scan | Переиспользовать как read-only сценарий; камера/фото обрабатываются на устройстве |
| `src/warehouse-cache.cjs`: комплект одной записью, timestamps, Saved on device / session only | Перенести полезные гарантии, адаптировать namespace к пользователю/workflow и выбранному deployment; не читать тестовый cache автоматически |
| Preflight/fingerprint, expected_assigned, request replay/recovery | Переиспользовать принципы защиты от stale data/lost ACK там, где создаётся durable запись; контракты привязать к WCP |
| `apps-script/Warehouse.gs`: lookup/download/reprint UX | Переиспользовать логику сценария, заменить sourceOrder_/repository_/allocator на WCP adapter |
| `src/domain.cjs`, Api.gs, Domain.gs: SHA External ID, UUID places, Orders/Operations/Events/Requests | Не переносить как новую модель WCP; оценивать отдельные helpers/tests, generated Domain.gs не редактировать вручную |
| CLI/file queue, Pickup/Receiving API | Тестовый/другой scope; не заменяет Loading/Unloading/TripReports |

QR сборка в текущем проекте: `pnpm run build:gas` (build-gas + build-warehouse) генерирует Domain.gs/WarehousePage.gs. В HTML встраиваются qrcode-generator 2.0.4, **jsqr 1.4.0**, cache и PDF; утверждение README «jsqr только для тестов» устарело. Сохранить THIRD_PARTY_NOTICES и проверить лицензии всех переносимых частей. Текущие версии зафиксированы package.json/lock; обновление зависимостей не входит в интеграцию автоматически.

## 3. Mapping и единственный источник мест

| WCP | QR сейчас | Правило интеграции / проверка |
| --- | --- | --- |
| Branch + OrderID из Orders_NY/CA | external_order_id = External ID из S1 Data; order_id = hash | Не считать равными. Установить lineage исходных колонок, тип/нули/пробелы/Unicode, уникальность в филиале и между ними. Не выбирать по title/address |
| OrderLoadingState.PiecesTotal; до Save fallback Orders.PiecesTotal/Pieces | Ввод count и assignedPlaces в S2 | Единственная authority — сервис WCP. QR показывает подтверждённое N; не имеет отдельного общего количества |
| Branch + OrderID + PieceNumber, JS pieceNumber | place_no / PlaceNo, UUID place_id и barcode_value | Возможный mapping только после доказательства соответствия физической упаковке; совпадения номера недостаточно |
| CountPieces конкретного TripReports | Нет готового Loading/Unloading manifest контракта | Unloading использует snapshot выбранного TripID и исходный branch отправления; не подменять destination branch ключом исходного места |
| Title, zones, weight/volume | title, address, zone, warehouse_description из Data | Title из WCP по умолчанию; address/description только после подтверждённой связи с источником. Не угадывать и не копировать персональные данные в QR payload |
| Loaded, TripReports, Receiving, Missing | state/location/version, Pickup/Receiving Events | Статусы не эквивалентны. Рабочий статус определяет WCP; просмотр/печать не создаёт event передачи |
| Users username/Access | Google Session/ALLOWED_EMAILS/OPEN_TEST_ACCESS | Единая доказанная серверная identity WCP, не два входа и не доверие username от клиента |

**Общее количество и нумерация принадлежат Loading Control.** Если выбранная live версия не содержит OrderLoadingState, не добавлять таблицу молча: сначала установить её фактический total contract, затем согласовать отдельное исправление. Ввод total из экрана QR допустим только через тот же проверенный WCP сервис и его права, без собственного allocator S2. Для первого пилота проще требовать предварительно сохранённое N и уже определённые места.

### Gate идентичности до первой рабочей этикетки

1. На согласованном read-only наборе owner проверяет уникальность OrderID, точное происхождение External ID, одинаковые ID разных филиалов, повторное появление заказа и межскладскую связь. В Git — только результаты/агрегаты и синтетические примеры.
2. Проверить piece keys: повторы, N=0/unknown, уменьшение N, номера >N, count-only изменения, частичные рейсы, fallback Unloading `1..LoadedPieces`, перезапуск/переход NY↔CA. Зафиксировать, что физическая упаковка сохраняет тот же номер, и кто его назначает.
3. Если ключ устойчив — использовать его без новой модели ID. Код должен однозначно учитывать необходимый namespace/branch, даже если интерфейс показывает только номер заказа. Внутреннее представление/URL escaping проектировать после этого решения; не применять автоматически `ZB-ExternalID-PlaceNo`.
4. Если доказаны коллизии или перенумерация — сначала описать конкретный пример и утвердить минимальное соответствие label identity → существующий WCP order/piece. Старые TripReports/Receiving не перенумеровывать; ambiguous/count-only заказы не маркировать до разборки. UUID — возможный инструмент после доказательства, не исходное требование.

Один writer и одна область ScriptLock WCP для операций, влияющих на total/номера/привязку label. Внешние writers/формулы проверяются отдельно: lock другого Apps Script не общий. Перед записью повторно проверить существование и уникальность заказа, N, номер, права и актуальность состояния. Не переиспользовать напечатанный номер для другой упаковки, не уменьшать ниже выпущенных номеров без отдельного процесса owner. Не очищать исторические piece rows ради синхронизации.

Примеры приёмки mapping: `00123` ≠ `123`, `A ` ≠ `A` до утверждённого правила; NY/X/1 и CA/X/1 не склеиваются; expected={1,3} не преобразуется в {1,2}; count-only=2 не доказывает личность двух физических мест.

## 4. Процесс в одном приложении

1. Вход WCP → разрешённый workflow → существующий заказ. Новый QR action доступен по серверному разрешению; новые роли без необходимости не вводить.
2. Сначала сохранить total существующим действием. «Generate Labels» читает N/места и проверяет identity/layout. Для read-only генерации уже существующих номеров новый reserve не нужен. Если принят постоянный label registry, назначение один раз под lock с request ID/recovery; потеря ACK → проверка результата/тот же запрос, без выдачи следующего комплекта.
3. Preview: 4×3 in, title первым крупно, description ниже; отсутствующие разрешённые поля — `not provided` только в UI/этикетке. Нет места — явная ошибка до durable выдачи, без обрезки данных. Ограничения QR count≤100, ID≤35 и payload≤75/512 сейчас являются ограничениями реализации; не вводить их в WCP как бизнес-правила без анализа. Большие заказы допускают согласованное разбиение печати, сохраняя N и номера.
4. Reprint использует те же order/piece/label IDs и текущий подтверждённый total. Историю изменения N и текста явно отличать от создания нового места. Print/PDF подготовлен ≠ физически напечатан/проверен. Print audit — без записи Loaded или Receiving.
5. Scan валидирует payload, разрешённый URL/namespace и mapping, затем права на карточку. Unknown/ambiguous/test/чужой workflow → понятное сообщение без создания заказа/места. Никаких автоматических переходов по произвольному декодированному URL.
6. В Loading scan открывает нужное место; отметка loaded выполняется отдельным действием. В Unloading scan сверяется с **выбранным** TripID/expected set; extra/wrong trip не попадает в received автоматически. Close Trip остаётся явным действием с Missing по существующим правилам.

### Payload и доступ

Позднейшее owner-решение QR от 2026-10-26: HTTPS-ссылка на карточку с доменным префиксом `https://script.google.com/a/macros/zaberman.com/s/`. Текущий CargoQr.link кодирует `?cargo=<barcode_value>`, reader сверяет deployment URL; doGet передаёт cargo странице. Сохранять семантику link-to-card, заменить URL на единый WCP deployment после подтверждения; не печатать новые production labels на старый QR URL. Не делать QR bearer credential, не включать пароли/сессию/персональную карточку в payload.

Предыдущий text/vCard сценарий не является текущим форматом генерации. Обязательная совместимость со всеми тестовыми QR не нужна; тестовые хранилища и labels сохраняются отдельно. Проверить реальный доменный redirect и возврат к карточке после login. WCP сейчас не обрабатывает cargo query — это будущий небольшой adapter, не готовая функция.

## 5. Единый вход и offline

До предоставления доступа к QR-карточкам закрыть существующий auth gap WCP: сервер создаёт проверяемую сессию после login и определяет actor из неё. Конкретный механизм выбрать минимальным для Apps Script; миграция на Google identity требует отдельного решения owner и не обязательна по умолчанию. Нельзя считать localStorage/username/Google-level web access доказательством login.

Все public RPC карточек, списков, загрузки кэша, total/labels/print audit/Save/Trip/Close должны проверять session, Active, workflow и принадлежность заказа/рейса на сервере. «Читающие» endpoints с ensure/write также защищать. Не переносить OPEN_TEST_ACCESS, test-session actor или обход allowlist; политика текущих deployed доступов на этом этапе не меняется. Password storage отдельно согласовать и исправить до расширения выдачи доступа; credentials/tokens не хранить в QR или Git.

Offline MVP: открыть онлайн; сохранить разрешённые карточки и комплекты. При обрыве доступны локальный scan и перепечатка уже выданных номеров с timestamp/stale warning. Новых окончательных номеров offline не выдавать; автовыдачи/retry allocation нет. Техническая ошибка не уничтожает исправный cache; auth revoke/logout/смена пользователя обрабатываются по согласованной политике без раскрытия чужого кэша и без потери pending Loading. Offline карточка не доказывает текущее право/статус операции. Unloading draft сейчас не durable: не обещать его сохранность после перезагрузки.

## 6. Обязательное и отложенное

Обязательно до безопасного пилота QR:

- Подтвердить versioned live baseline, выбрать один source/upload inventory и rollback target; сохранить существующий dirty diff.
- Закрыть server auth/read gaps и проверить отрицательные права на всех связанных RPC.
- Утвердить order/piece mapping, единую authority N/номеров; блокировать ambiguity и независимые writes S2.
- Добавить серверные existence/unique/range/expected-set проверки для QR пути; действующие RPC не должны позволять обход этих проверок. Исправления существующих путей — отдельные reviewable минимальные changes.
- Для всех новых durable QR writes определить dedup/replay и восстановление lost ACK/partial write. Если только render/read уже существующих мест — не создавать лишний allocator.
- Учесть N changes/reprint, изоляцию cache и реальную печать/читаемость на целевом устройстве. Сохранить TripReports/BOL контракт.

До расширения/изменения operational writes отдельный gate: minute TripID collision, частичные Trip/Close записи, count-only fallback и неполные expected lists. Для первого QR просмотра/печати их можно изолировать запретом ambiguous/count-only/trip-collision случаев; это не исправление дефекта. Если новый сценарий нельзя так изолировать, соответствующее исправление становится обязательным до пилота. Изменение TripID проверять совместно с BOL parser и историей, без автоматической миграции.

Отложить: новый стек/нативное приложение, Bluetooth bridge и закупку оборудования, ERP/Pickup/Delivery, event sourcing/CAS для всех процессов, глобальную миграцию IDs, полноценный offline cold start, фоновую синхронизацию, фото/подписи и разрешение Missing. Не откладывать физическую проверку выбранного доступного способа печати, если пилот предполагает наклейки на грузе.

Решения owner перед зависимой реализацией:

| Решение | Рекомендуемый минимум |
| --- | --- |
| Подтверждение active baseline/deployment | Изолированная сверка опубликованной версии, без push поверх неизвестного кода |
| Связь WCP ID/QR source и физического места | Проверить существующий ключ; не вводить новый до доказательства необходимости |
| Кто меняет N после выпуска, как разбирать count-only/duplicates | Существующая authority WCP, блок спорной генерации, явный review исключений |
| Кто генерирует/печатает/смотрит QR между складами | Права в единой WCP session; доступ к inbound месту через разрешённый Trip |
| Scan как подтверждение операции | Для первого пилота только просмотр; автоматическое подтверждение требует отдельного утверждённого правила |
| Общий телефон/offline cache, payload domain policy | Разделение пользователей и явная политика хранения; сохранить требование доменного QR до решения owner |

Это блокеры соответствующих шагов реализации, а не незавершённость документационного этапа.

## 7. Этапы, проверки и откат

| Этап | Результат / условие перехода |
| --- | --- |
| 0. Этот этап | Baseline и план; только документация; production без изменений |
| 1. Подтверждение исходников и контрактов | Owner exports/metadata + обезличенные результаты mapping; выбран source/rollback, разрешены identity/authority вопросы |
| 2. Минимальный hardening отдельно от QR UI | Server session/permissions/валидация; тесты с подменой actor/workflow, inactive/revoked, unsigned direct RPC; регрессии Loading/Unloading/BOL на isolated Sheets/stubs |
| 3. Read/render пилот | Локальные QR/label/decoder в WCP, одна session; только существующие подтверждённые места; label namespace и redirect после login проверены |
| 4. Контролируемая приёмка | Изолированные данные, затем отдельно согласованный production pilot, резервная версия, ограниченный набор разрешённых пользователей/заказов |
| 5. Расширение | Только после результатов пилота — изменение N через QR, scan-assisted операции и дополнительные workflow |

Проверки этапов 2–4 (синтетические данные до отдельно согласованного production теста):

- Mapping: точные строковые ID, дубли внутри/между branches, исчезнувший заказ, неправильный piece, N неизвестен/уменьшен, частичный рейс, CA1/CA2/NJ1.
- Regression: ручной Loading→Save→Generate Trip→Unloading→Close; одинаковые snapshot/CountPieces/Missing/BOL inputs до/после добавления QR.
- Read-only scan/generation/reprint: Loaded/Receiving/Missing не меняются; неизвестный код не создаёт заказ или место; два устройства не получают разные номера для одной привязки.
- Lost ACK/повтор/одновременная работа: один durable результат при replay; если новых writes нет, подтвердить это stub assertions. Print audit не создаёт операционный факт.
- Offline/storage: отказы quota, reload, stale source, отмена/поздний ответ, недоступный source, истёкшая session, смена пользователя; pending Loading сохраняется.
- Реальное устройство: QR из фото/камеры → нужная карточка, deep link/login, 4×3 in без обрезки при 100%, длинные поля/ID, несколько labels/pages, независимое decode. Browser print dialog/PDF не доказывает аппаратную печать.
- BOL: прежний enqueue signature/version, parser TripID, snapshot receiver/count/weight; ошибка notify не отменяет рейс. Никаких новых BOL ради demo в рабочем контуре без отдельного разрешения.

Перед публикацией зафиксировать previous/new deployment versions, URL, source hashes, BOL version, config/schema delta, разрешённые данные пилота. Небольшой переключатель отключения QR допустим как средство rollback, если нужен для пилота; он не заменяет серверные проверки.

Откат: отключить QR entry/write, вернуть прежнюю numbered version на том же URL, сохранить основной ручной Loading и pending queues. При новых label records сохранить IDs/соответствия/print journal, не удалять и не выдавать их заново; выпущенная наклейка должна продолжать разрешаться согласованным read-only resolver либо её использование явно приостанавливается. Это проверить **до** печати production labels. Не откатывать Sheets удалением строк и не переписывать старые TripReports/BOL PDF; спорные partial writes разбирать по журналу. QR S2/test данные остаются нетронутыми.

Риски: дрейф локальной/live версии, два upload roots, слабая identity и auth, другая authority N, URL/branch collisions, stale cache, частичные записи и ложное ощущение физической печати. Первый следующий этап — подтверждение baseline и mapping; объединение до его завершения не начинать.
