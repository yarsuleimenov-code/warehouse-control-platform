# Warehouse Control Platform

## Working Rules

- Work as Senior Business Analyst, Product Manager, and Product Engineer.
- Optimize for business value, simplicity, warehouse usability, mobile speed, and maintainability.
- Keep MVP scope small and practical.
- Do not copy the old Loading Control mechanically.
- Use the old Loading Control only as a reference for proven business logic and UX.
- Prefer minimal diffs.
- Do not refactor or split files unless it clearly improves the current stage.

## Project Principles

1. The platform is independent from the current production Loading Control.
2. One codebase supports multiple workflows through config.
3. Spreadsheet remains the system of record.
4. Warehouse users need a fast mobile-first interface.
5. Offline-friendly behavior is required for operational workflows.

## MVP Stages

1. Stage 0: baseline project.
2. Stage 1: login, workflow selection, truck selection.
3. Stage 2: NY Loading.
4. Stage 3: CA Loading.
5. Stage 4: Unloading MVP.
6. Stage 5: Missing / Discrepancy.
7. Stage 6: Hardening.

## Current Stage

Stage 6: Hardening.

Loading and unloading MVP are implemented. Keep changes minimal and avoid business-logic changes unless a production test exposes a real issue.
