# Handoff для проектирования мобильного приложения

## 1. Назначение

Документ передаёт подтверждённую логику текущего скрипта и функциональные требования следующей команде. Он не определяет UI, wireframe, мобильный стек или техническую архитектуру.

Scope будущего приложения ограничен:

- Pickup;
- Delivery;
- Interstate: Loading, Trip close/snapshot, Missing, Unloading, Receiving;
- offline-first выполнение этих операций;
- фотографии, связанные с Pickup/Delivery и исключениями.

## 2. Что можно использовать как требование

- Пользователь работает в разрешённом warehouse/workflow context.
- Loading поддерживает как piece-level tracking, так и временный count-only сценарий для заказа без детализации.
- Рейс содержит направление, truck и набор order loading snapshots.
- Входящий склад видит только рейсы своего направления, которые ещё не закрыты.
- Unloading сверяет expected и received cargo items.
- Неотмеченные expected items при закрытии становятся Missing.
- Результат приёмки должен сохранять expected, received, missing, пользователя и время.
- Операционные изменения должны переживать временную потерю сети.

Нельзя автоматически переносить:

- Google Sheets row numbers как идентификаторы;
- CSV со списками pieces;
- группировку Trip только по строковому TripID;
- открытые пароли и browser username как авторизацию;
- минутные идентификаторы;
- текущие positional column indexes;
- последовательные многошаговые записи без transaction/operation state;
- `localStorage` как хранилище фотографий или надёжную sync queue.

## 3. Функциональная карта

| Функция | Реализована сейчас | Где | Можно использовать как требование | Требуется спроектировать |
| --- | --- | --- | --- | --- |
| Login | Да | `Auth.js`, `Index.html` | Active user и workflow access | Безопасная сессия, роли, offline login policy |
| Warehouse/workflow selection | Да | `Config.js`, `Index.html` | Контекст ограничивает доступные операции | Warehouse model и назначения |
| Truck selection | Да | `Config.js`, `Index.html` | Операция связана с truck | Truck identity, availability, validation |
| Loading orders list | Да | `LoadingService.js` | Поиск, фильтры, statuses, order summary | Assignment/download scope |
| PiecesTotal editing | Да | `OrderLoadingState` по Branch + OrderID | Значение не зависит от строки Orders | Authority, audit, conflict versioning |
| Piece-level loading | Да | `OrderPieces_*` | Отметка отдельного cargo item | Stable item ID, scan/barcode rules |
| Count-only loading | Да | `OrderPieces_*` по OrderID | Нужен бизнес-ответ: сохранять ли fallback | Целевая модель неизвестных pieces |
| Local Loading drafts | Частично | `localStorage` | Изменения не должны теряться без сети | Durable local store и queue states |
| Generate Trip | Да | `generateLoadingTrip()` | Фиксация только новой загруженной части | Trip master/lifecycle, idempotency |
| Trip search for Unloading | Да | `getUnloadingTrips()` | Route и closed state ограничивают список | Assignment, pagination, download |
| Unloading reconciliation | Да | `getUnloadingTrip()`, UI | Expected vs received per piece | Draft/resume, scanning, concurrency |
| Close Trip | Да | `closeUnloadingTrip()` | Явное подтверждение missing | Atomic/idempotent close, correction |
| Receiving | Да | `Receiving` | Итог по каждому order | Stable result identity и audit |
| Missing creation | Да | `Missing` | Одна discrepancy на missing item | Resolution workflow и ownership |
| Pickup | Нет | — | — | Полный процесс |
| Delivery | Нет | — | — | Полный процесс |
| Photos | Нет | — | — | Capture, local storage, review, sync |
| Background sync | Нет | — | Pending queue только как UX reference | Полный sync lifecycle |
| Conflict resolution | Нет | — | — | Rules и user intervention |

## 4. Разрывы по функциональным направлениям

### Pickup

Отсутствуют assignment, адрес/контакт, arrival, cargo verification, condition, exceptions, result, фото и завершение. Текущая модель Order недостаточна для wireframe Pickup.

### Delivery

Отсутствуют delivery task, получатель, proof of delivery, partial/failed delivery, причины исключений, подпись/фото и последующие действия.

### Interstate

Базовый Loading → TripReports → Unloading → Receiving/Missing прослеживается. Не определены master lifecycle рейса, dispatch/arrival, ownership, correction, reopening, cancellation, split/merge и разрешение Missing.

### Offline-first

Есть только Loading browser queue/cache. Нет offline запуска, durable media store, Unloading drafts, sync operations, acknowledgements, idempotency keys, record versions и conflict workflow.

## 5. Требования к offline-first поведению

### 5.1 Операции, доступные offline

Для заранее загруженных заданий пользователь должен иметь возможность:

- открыть Pickup, Delivery или Interstate assignment;
- просмотреть необходимые Order/Trip/Cargo Item данные;
- создавать и изменять draft;
- отмечать results, statuses, pieces и exceptions;
- создавать фотографии и связывать их с draft;
- завершить локальную операцию с состоянием «ожидает синхронизации»;
- видеть ранее синхронизированные и ещё локальные изменения.

Операции, требующие актуального server decision, должны явно показываться недоступными либо выполняться как queued command. Какие операции относятся к каждой группе — открытый бизнес-вопрос.

### 5.2 Предварительная загрузка

До потери сети устройство должно получить:

- назначения пользователя;
- связанные Orders/Trips/Cargo Items;
- warehouse, truck и разрешённые workflow;
- необходимые справочники статусов/причин;
- версии записей;
- ранее созданные drafts и sync results.

Граница данных по периоду, складу и сотруднику должна быть определена бизнесом.

### 5.3 Локальные drafts и фотографии

- Каждая запись и фотография получает local ID сразу при создании.
- Draft сохраняется после каждого значимого действия, без отдельной зависимости от сети.
- Фото хранится локально до подтверждённой загрузки.
- Бизнес-запись может ссылаться на local photo ID до появления server ID.
- Нельзя удалять или очищать несинхронизированные данные без явного предупреждения и подтверждения.
- Пользователь должен видеть занятый объём и ошибки хранения.

### 5.4 Состояния синхронизации

Минимально различать:

| Состояние | Значение для пользователя |
| --- | --- |
| Local draft | Сохранено только на устройстве, операция не завершена |
| Queued | Завершено локально, ожидает отправки |
| Syncing | Идёт отправка данных/фото |
| Synced | Сервер подтвердил сохранение |
| Conflict | Серверная версия изменилась; требуется правило или решение |
| Failed | Отправка отклонена; показана причина и retry |

UI должен показывать состояние на уровне assignment и отдельных проблемных объектов/фото.

### 5.5 Повторная отправка и идемпотентность

- Повтор одного Sync Operation не должен создавать второй Trip, Receiving, Missing или Photo.
- Client operation ID сохраняется до server acknowledgement.
- Timeout трактуется как неизвестный результат, а не как доказанный failure.
- Retry отправляет ту же operation identity.
- Частично загруженный набор фото/данных должен безопасно продолжаться.
- Успех старой операции не должен удалять более новые локальные изменения.

### 5.6 Конфликты и несколько сотрудников

Необходимо различать:

- два сотрудника отмечают разные cargo items;
- два сотрудника меняют одно и то же поле;
- один закрывает trip, пока другой имеет draft;
- server record изменился после предварительной загрузки;
- offline user отправляет устаревший result.

До wireframe должны быть определены бизнес-правила: автоматическое объединение непересекающихся событий, приоритет server/client, запрет операции или ручное разрешение.

## 6. Ключевые экраны как функциональные области

Это не wireframe, а перечень задач пользователя:

1. Login и выбор рабочего контекста.
2. Мои назначения / доступные операции.
3. Assignment details с offline/sync state.
4. Pickup execution и result.
5. Delivery execution и result.
6. Loading order list и cargo item verification.
7. Trip summary и подтверждение формирования/закрытия.
8. Unloading reconciliation.
9. Missing/exceptions review.
10. Photo capture/review queue.
11. Sync center с conflicts и failed operations.

Состав полей и переходов Pickup/Delivery нельзя детализировать до ответов в [OPEN_QUESTIONS.md](OPEN_QUESTIONS.md).

## 7. Критерии функциональной готовности будущего решения

- Каждый процесс прослеживается от assignment до подтверждённого server result.
- Любое действие имеет понятный local и sync state.
- Повторная отправка не создаёт дубликаты.
- Закрытие Interstate не оставляет частично записанные Receiving/Missing.
- Несинхронизированные данные и фото не теряются при перезапуске.
- Пользователь видит конфликт и доступное действие.
- Права проверяются сервером, а не только интерфейсом.
- Все идентификаторы стабильны и не зависят от номера строки или минуты создания.
- Подтверждённые текущие правила Loading/Unloading сохраняются либо их изменение явно согласовано.

## 8. Что решить до wireframe

Обязательны ответы как минимум по следующим темам:

- роли и assignment model;
- шаги и результаты Pickup/Delivery;
- Trip lifecycle и момент фактического Close Trip;
- piece identity и scan method;
- допустимость count-only режима;
- правила multi-user editing;
- offline completion и conflict handling;
- photo requirements и обязательность;
- исправление ошибочно закрытых операций;
- Missing resolution lifecycle.

Полный перечень и влияние каждого ответа приведены в [OPEN_QUESTIONS.md](OPEN_QUESTIONS.md).
