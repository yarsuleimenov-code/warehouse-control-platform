# Warehouse Control Platform

Google Apps Script Web App for warehouse loading and unloading workflows.

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
3. Run `ensurePlatformSetup()` once from Apps Script editor and grant permissions.
4. Confirm the `Users` sheet exists in the Warehouse Control Platform spreadsheet.
5. Deploy as Web App:
   - Execute as: Me
   - Who has access: users allowed by the business process
6. Open the Web App URL.
7. Add at least one active user to `Users`, then login with that user's credentials.

```text
Username: <Users sheet username>
Password: <Users sheet password>
```

## Notes

Passwords are stored as plain text for MVP speed only. Replace with hashes before broader rollout.
