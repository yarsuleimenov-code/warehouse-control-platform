# Warehouse Control Platform

Google Apps Script Web App for warehouse loading and unloading workflows.

## Documentation

The current implementation and functional handoff for future mobile application design are documented here:

- [Current system](docs/CURRENT_SYSTEM.md)
- [Business processes](docs/BUSINESS_PROCESSES.md)
- [Data model](docs/DATA_MODEL.md)
- [Mobile app handoff](docs/MOBILE_APP_HANDOFF.md)
- [Open business questions](docs/OPEN_QUESTIONS.md)
- [Loading Control and Interstate BOL user guide](docs/USER_GUIDE_LOADING_CONTROL_AND_BOL.md)

These documents distinguish current code behavior from future requirements and unresolved decisions. They do not define a mobile technology stack or wireframe.

## MVP Scope

- One Web App URL.
- Login with `Users` sheet.
- Workflow selection:
  - NY Loading
  - CA Loading
  - NY Unloading
  - CA Unloading
- Truck selection:
  - Truck 1 (26 ft)
  - Truck 2 (16 ft)
  - Extra 26 ft
- NY/CA loading dashboards:
  - Orders table.
  - Weight / volume stats.
  - Pieces total editor.
  - Piece detail panel.
  - Offline pending queue.
  - Save pending changes.
- Generate Trip snapshot.
- Notify the separate Interstate BOL library after `TripReports` is written; notification failure does not roll back the trip.
- Unloading MVP:
  - Select TripID.
  - Show expected pieces from TripReports.
  - Mark received pieces.
  - Save unmarked pieces as missing on Close Trip.
  - Close trip manually.
  - Write Receiving / Missing.

Advanced unloading statuses and automatic trip closing are intentionally not implemented yet.

## Spreadsheet

Spreadsheet ID:

```text
13gYc73705Q-HVUQxDWwLKdGU4ij6i0OUbdBiKoJnWuQ
```

The app creates the `Users` sheet headers on first run if the sheet does not exist.

All operational timestamps must use the New York timezone:

```text
America/New_York
```

Initial MVP `Users` columns:

```text
Username | Password | Access | Active
```

Create warehouse users manually in the `Users` sheet:

```text
Mega   | <set in Users sheet> | NY_LOADING,NY_UNLOADING                       | TRUE
Teplov | <set in Users sheet> | CA_LOADING,CA_UNLOADING                       | TRUE
Cheban | <set in Users sheet> | CA_LOADING,CA_UNLOADING                       | TRUE
Admin  | <set in Users sheet> | NY_LOADING,NY_UNLOADING,CA_LOADING,CA_UNLOADING | TRUE
```

## Apps Script Files

```text
Code.js
Config.js
Auth.js
LoadingService.js
UnloadingService.js
Index.html
appsscript.json
.clasp.json
```

## Orders Sheet Contract

Loading workflows expect branch-specific orders sheets:

```text
Orders_NY
Orders_CA
```

Supported header aliases:

```text
OrderID or ID
Title
DeliveryZone or Delivery Zone
Volume
DeliveryDate or Delivery date
ColorCode
Weight
PiecesTotal or Pieces
LoadedPieces
```

Rows without `OrderID/ID` or without a supported `ColorCode` are skipped.

## First Deployment

1. Create a new Google Apps Script project.
2. Add the files from this repository.
3. Save the current Interstate BOL project code and confirm that library version `1` or the version configured in `appsscript.json` exists.
4. Confirm the pinned `InterstateBol` library dependency is available and `developmentMode` is `false`.
5. Run `ensurePlatformSetup()` once from Apps Script editor and grant permissions.
6. Confirm the `Users` sheet exists in the Warehouse Control Platform spreadsheet.
7. Deploy as Web App:
   - Execute as: Me
   - Who has access: anyone allowed by the business process; the MVP relies on the app login and `Users.Access` for workflow access
8. Open the Web App URL.
9. Add at least one active user to `Users`, then login with that user's credentials.
10. For later BOL changes, create a new numbered library version and update the pinned version in `appsscript.json` before deploying Warehouse Control.

```text
Username: <Users sheet username>
Password: <Users sheet password>
```

## Notes

Passwords are stored as plain text for MVP speed only. Replace with hashes before broader rollout.

## Tests

Run the current local smoke/unit checks with bundled Node.js or any Node.js runtime:

```text
node --check Code.js
node --check Config.js
node --check Auth.js
node --check LoadingService.js
node --check UnloadingService.js
node tests/bol_notification.test.js
```
