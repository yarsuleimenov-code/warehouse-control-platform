# Открытые бизнес-вопросы

Ответы должны быть получены до детального wireframe или проектирования модели данных. Вопросы не являются утверждёнными требованиями.

## 1. Pickup

| Вопрос | Почему влияет |
| --- | --- |
| Кто создаёт и назначает Pickup, может ли водитель взять неназначенный? | Определяет список заданий, права и entry point |
| Какие обязательные шаги: arrival, contact, cargo check, completion? | Определяет последовательность экранов и statuses |
| Какие результаты допустимы: completed, partial, failed, cancelled? | Нужны lifecycle и обязательные поля |
| Какие причины partial/failed используются? | Нужен справочник исключений и conditional UI |
| Нужно ли сверять cargo по pieces, количеству, barcode/QR или вручную? | Определяет Cargo Item model и основной control |
| Можно ли менять фактическое количество/состав заказа на Pickup? | Влияет на authority, audit и downstream Delivery/Interstate |
| Какие фото обязательны и в какой момент? | Определяет photo steps и возможность offline completion |
| Требуется ли геолокация, время прибытия или подпись отправителя? | Добавляет данные и permission flows; сейчас не подтверждено |

## 2. Delivery

| Вопрос | Почему влияет |
| --- | --- |
| Что является подтверждением успешной Delivery? | Определяет completion screen и proof data |
| Нужны ли имя получателя, подпись, код или фото? | Влияет на модель результата и media/input controls |
| Разрешена ли partial delivery и что происходит с остатком? | Требует item-level outcome и дальнейшего assignment |
| Какие причины failed/exception допустимы? | Определяет statuses и справочник |
| Можно ли завершить Delivery offline без server validation? | Определяет queued completion и conflict risk |
| Кто и как исправляет ошибочно завершённую Delivery? | Нужен correction/audit workflow |
| Нужны ли cash/payment/amount операции? | Это меняет scope; сейчас они не заявлены и не должны добавляться без решения |

## 3. Interstate

| Вопрос | Почему влияет |
| --- | --- |
| Когда Trip создаётся, когда считается dispatched и когда closed? | Текущий Generate Trip создаёт snapshot, но formal lifecycle отсутствует |
| Может ли один Order входить в несколько trips? | Влияет на remaining logic и связи |
| Можно ли добавлять груз после формирования Trip? | Требует versioning/append rules |
| Нужны ли scan labels и глобальный ID cargo item вместо PieceNumber? | Определяет идентичность и сверку |
| Остаётся ли count-only Loading допустимым? | Определяет, обязателен ли Cargo Item для каждого места |
| Кто может закрыть Loading/Unloading trip? | Определяет permissions и confirmation |
| Можно ли переоткрыть, отменить или исправить Trip? | Нужны statuses, audit и correction screens |
| Как обрабатывается extra/unexpected cargo при Unloading? | Текущий код умеет только expected/received/missing |
| Что происходит с Missing после создания? | Нужны owner, investigation и resolution lifecycle |
| Может ли Unloading выполняться несколькими пользователями одновременно? | Определяет merge и locking rules |
| Как выбирается truck: из назначения или вручную? | Влияет на экран выбора и validation |

## 4. Фото и документы

| Вопрос | Почему влияет |
| --- | --- |
| Для каких процессов/результатов фото обязательны? | Определяет conditional completion |
| Сколько фото допустимо и нужны ли категории? | Влияет на capture/review UI и модель |
| Требуются ли timestamp, геолокация, watermark или комментарий? | Определяет metadata и permissions |
| Можно ли удалять фото до/после синхронизации и кто имеет право? | Влияет на local retention и audit |
| Как долго хранить оригиналы и нужны ли thumbnails/compression? | Влияет на offline storage и передачу |
| Нужны ли документы кроме фото: PDF, подпись, скан? | Может расширить data/media model; сейчас не подтверждено |
| Может ли операция считаться синхронизированной до загрузки всех фото? | Определяет aggregate sync state |

## 5. Пользователи и права

| Вопрос | Почему влияет |
| --- | --- |
| Какие целевые роли существуют: warehouse worker, driver, supervisor, admin? | Текущий workflow access недостаточен для Pickup/Delivery |
| Пользователь привязан к одному warehouse, нескольким или маршруту? | Определяет context selection и data scope |
| Кто назначает tasks/trips/trucks? | Нужны assignment operations и права |
| Нужна ли работа нескольких пользователей на общем устройстве? | Влияет на logout, локальные данные и безопасность |
| Разрешён ли offline login и на какой срок? | Определяет локальные credentials/session policy |
| Какие операции требуют supervisor approval? | Определяет confirmation и exception flows |
| Нужен ли audit всех изменений и impersonation support? | Влияет на event model и административные сценарии |

## 6. Offline и синхронизация

| Вопрос | Почему влияет |
| --- | --- |
| Какой максимальный период полной offline работы? | Определяет объём предварительной загрузки и retention |
| Какие assignments загружаются заранее и кем? | Определяет download screen и data scope |
| Можно ли завершать Pickup, Delivery и Trip offline? | Определяет queued commands и server validation |
| Какой результат при конфликте: server wins, client wins, merge или supervisor? | Определяет conflict UI и data versioning |
| Какие изменения можно автоматически объединить? | Особенно важно для разных pieces одного Order |
| Сколько retry и нужен ли ручной Retry/Cancel? | Определяет sync center controls |
| Можно ли удалить local draft или queued operation? | Влияет на защиту от потери данных |
| Что делать при нехватке памяти для фото? | Нужен pre-check и recovery UX |
| Как пользователь понимает, что смену можно завершить безопасно? | Нужен aggregate sync indicator |
| Требуется ли перенос несинхронизированных данных между устройствами? | Сильно влияет на identity и recovery; сейчас не определено |

## 7. Исключения и исправление ошибок

| Вопрос | Почему влияет |
| --- | --- |
| Кто может исправить PiecesTotal, received piece или result после sync? | Определяет edit permissions и audit |
| Исправление изменяет исходную запись или создаёт correction event? | Определяет модель истории |
| Как восстанавливать частично синхронизированную операцию? | Нужен operation-level status и resume |
| Что делать с дублирующим scan/click? | Определяет idempotency и feedback |
| Как обрабатываются damaged, extra, wrong order и unreadable label? | Требует taxonomy шире текущего Missing |
| Может ли Missing быть найден позже и закрыт? | Нужен resolution process |
| Кто получает уведомление об исключении? | Может добавить routing/notification requirement |
| Какие операции нельзя отменять после server acknowledgement? | Определяет необратимые действия и confirmation UI |

## 8. Минимальный набор решений до wireframe

Wireframe можно начинать после согласования:

1. ролей и принципа назначения работы;
2. lifecycle Pickup и Delivery;
3. lifecycle Trip и правил correction;
4. идентичности Cargo Item и допустимости count-only режима;
5. обязательных фото/proof;
6. операций, разрешённых offline;
7. multi-user и conflict rules;
8. lifecycle Missing и других исключений.
