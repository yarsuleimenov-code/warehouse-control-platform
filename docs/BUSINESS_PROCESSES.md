# Текущие бизнес-процессы

Документ описывает только поведение, подтверждённое текущим кодом.

## 1. Вход и выбор рабочего контекста

**Точка входа:** открытие Web App.

**Действия:**

1. Система получает workflow и список транспорта.
2. Пользователь вводит username и password.
3. Сервер проверяет существование пользователя, `Active` и точное совпадение password.
4. UI показывает только workflow из `Users.Access`.
5. Пользователь выбирает workflow и truck.
6. UI сохраняет контекст в `localStorage` на 12 часов.

**Обязательные данные:** username, password, доступный workflow, truck.

**Ошибки:** пустые credentials, неизвестный или inactive user, неверный password, отсутствие доступных workflow.

**Результат:** открыт Loading либо Unloading dashboard.

## 2. Loading

### 2.1 Загрузка списка заказов

**Точка входа:** открытие Loading workflow или обновление после Save/Generate Trip.

**Последовательность:**

1. Сервер выбирает `Orders_NY` либо `Orders_CA`.
2. Заголовки сопоставляются через aliases.
3. Строки без OrderID либо поддерживаемого ColorCode пропускаются.
4. PiecesTotal берётся из `OrderLoadingState` по Branch + OrderID; Orders.PiecesTotal используется только как fallback до первого Save в приложении.
5. Для заказа с PiecesTotal состояние pieces берётся из `OrderPieces_*`.
6. Для заказа без PiecesTotal количество загруженных мест считается по загруженным строкам `OrderPieces_*`, связанным с OrderID.
7. Из `TripReports` определяется, был ли заказ ранее включён в рейс и есть ли remaining pieces.
8. UI показывает orders, filters, status и агрегаты Weight/Volume.

**Статусы заказа:**

| Условие | Статус |
| --- | --- |
| `loadedPieces = 0`, PiecesTotal отсутствует | `Requires Pieces` |
| `loadedPieces = 0`, PiecesTotal задан | `Not Started` |
| `loadedPieces > 0`, но меньше PiecesTotal или total неизвестен | `Started` |
| `loadedPieces >= PiecesTotal` | `Completed` |

**Исключения:** отсутствует Orders sheet; пустые/неподдерживаемые строки молча исключаются.

### 2.2 Указание PiecesTotal

**Точка входа:** кнопки или поле Pieces в строке заказа.

**Действия:**

1. Пользователь задаёт целое неотрицательное значение.
2. Изменение попадает в browser pending queue.
3. При Save сервер проверяет наличие OrderID в актуальном Orders и записывает значение в `OrderLoadingState` по ключу Branch + OrderID.
4. Для положительного total создаются отсутствующие номера `1..PiecesTotal` в `OrderPieces_*`.

**Изменяемые записи:** OrderLoadingState и новые строки OrderPieces. Номер строки Orders не используется как ключ.

**Ограничения:** уменьшение total не удаляет старые piece rows; UI продолжает показывать loaded pieces выше нового total.

### 2.3 Отметка погруженных pieces

**Точка входа:** Open в заказе с PiecesTotal.

**Действия:**

1. Сервер гарантирует наличие rows `1..PiecesTotal`.
2. Пользователь переключает отдельные Piece.
3. UI изменяет локальное состояние и pending queue.
4. Save обновляет `Loaded`, `LoadedAt`, `UpdatedAt`, `LoadedBy`.

**Проверки:** UI разрешает только отображаемые номера. Сервер принимает положительный pieceNumber, но отдельно не проверяет его принадлежность текущему total.

**Результат:** состояние piece сохранено в `OrderPieces_*`.

### 2.4 Заказ с неизвестным PiecesTotal

Пользователь меняет числовой LoadedPieces без открытия детализации cargo items. Система сохраняет count-only состояние в `OrderPieces_*` как последовательные PieceNumber, связанные с OrderID. Колонка `Orders.LoadedPieces` не используется, потому что строки Orders обновляются и могут менять соответствие OrderID.

### 2.5 Save

**Точка входа:** Save или Generate Trip при наличии pending changes.

**Порядок записи:**

1. PiecesTotal updates.
2. Unknown LoadedPieces updates.
3. Piece-level updates.

Все изменения одного Save сериализуются общим script lock одного проекта. Это не предотвращает перезапись устаревшим клиентским состоянием и не создаёт транзакцию между листами.

После success UI удаляет pending queue и повторно загружает данные.

**Ошибки:** при backend error/timeout UI оставляет pending queue для retry. Серверная операция не имеет operation ID, поэтому browser timeout не доказывает, что запись не была выполнена.

## 3. Close Trip / формирование TripReports

В UI действие называется `Generate Trip`; по бизнес-смыслу оно фиксирует новую отгруженную часть в `TripReports`.

**Точка входа:** Generate Trip в Loading dashboard.

**Предусловия:**

- активный пользователь имеет доступ к Loading workflow;
- выбран truck;
- pending changes успешно отправлены;
- существует хотя бы одна новая loaded piece/count, ещё не отражённая в TripReports.

**Действия:**

1. Сервер получает ScriptLock.
2. Повторно читает Loading data и ранее reported pieces.
3. Для каждого заказа определяет только новую погруженную часть.
4. Создаёт общий TripID для вызова.
5. Добавляет одну строку `TripReports` на каждый заказ с новой погрузкой.
6. Очищает ручной `Pieces` в Orders для полностью отправленных строк и пустых строк без OrderID, чтобы старые значения не смешивались с новыми QUERY rows.
7. После успешной записи `TripReports` вызывает BOL library и передаёт `TripID` и `Route` в очередь Interstate BOL.

**Статус строки TripReports:**

- `Completed`, если после учёта всех reported pieces остаток равен нулю;
- иначе `Started`.

**Результат:** append-only snapshot рейса доступен входящему складу для Unloading.

**BOL notification:** ошибка постановки BOL в очередь не откатывает созданный рейс. Результат уведомления возвращается в ответе `bolNotification`.

**Ошибки:** truck отсутствует; нет новых loaded pieces; нет доступа; проблемы Sheets/lock.

**Ограничения:** отдельной Trip record нет; Trip — группа строк с одинаковым TripID. ID содержит дату и минуту.

**Важно:** частично отправленные строки с remaining pieces не очищают `Pieces`, потому что total нужен для следующей загрузки остатка.

## 4. Поиск рейса для Unloading

**Точка входа:** открытие NY/CA Unloading.

**Действия:**

1. Система читает `TripReports`.
2. Оставляет строки с точным Route текущего workflow; departure/destination сохраняются из snapshot каждой строки.
3. Исключает TripID, уже найденные в `Receiving`.
4. Группирует строки по TripID.
5. Показывает truck, число строк-заказов и сумму LoadedPieces.
6. Пользователь выбирает TripID и открывает его.

В открытом рейсе UI позволяет искать по OrderID, Title или номеру piece.

**Результат:** получен список ожидаемых заказов/pieces.

**Ошибки:** пустой TripReports; TripID не найден для направления.

## 5. Unloading и сверка груза

**Точка входа:** открытый TripID.

**Действия:**

1. Для каждой строки TripReports формируется order для приёмки.
2. Expected pieces берутся из `CountPieces`.
3. Если `CountPieces` пуст, строится диапазон `1..LoadedPieces`.
4. Пользователь отмечает физически полученные pieces.
5. Неотмеченные expected pieces считаются Missing при Close Trip.

**Локальное состояние:** только память текущей страницы. Очередь Unloading в localStorage отсутствует.

**Статусы UI:** Not received, Partial, Received.

## 6. Close Trip, Receiving и Missing

**Точка входа:** кнопка Close Trip.

**Предусловия:** Trip открыт; пользователь имеет доступ; TripID ещё не присутствует в Receiving.

**Действия:**

1. UI предупреждает, если есть unreceived pieces.
2. Сервер получает ScriptLock и повторно проверяет, что trip не закрыт.
3. Сервер заново читает expected orders из TripReports.
4. Для каждого заказа рассчитывает received и missing pieces.
5. Добавляет одну строку `Receiving` на заказ.
6. Добавляет одну строку `Missing` на каждую отсутствующую piece.

**Receiving status:**

| Условие | Статус |
| --- | --- |
| Есть missing pieces | `Missing` |
| Missing нет и received count не меньше expected | `Received` |
| Иначе | `Partially received` |

**Missing status:** каждая созданная запись получает `Open`.

**Результат:** Trip считается закрытым, исчезает из списка доступных Unloading trips.

**Важное ограничение:** признак закрытия выводится из наличия любой подходящей строки Receiving. Receiving записывается раньше Missing; общей транзакции нет.

## 7. Отсутствующие процессы

Следующие процессы текущим кодом не определены:

- Pickup;
- Delivery;
- создание/просмотр/удаление фотографий;
- подтверждение подписью;
- исправление закрытого рейса;
- разрешение Missing;
- reopening/cancel trip;
- split/merge trips;
- background sync;
- conflict resolution.

Они должны проектироваться как новые требования, а не восстанавливаться из текущего скрипта.
