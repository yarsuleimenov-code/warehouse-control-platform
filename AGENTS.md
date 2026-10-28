# Warehouse Control Platform

## Pre-QR Local Baseline — 2026-10-28

- Loading Control is the leading operational system. QR must adapt to its data and processes.
- Read `docs/BASELINE_LOADING_CONTROL.md`, then `docs/QR_INTEGRATION_PLAN.md`, then relevant process/data documentation and code. This is a local baseline candidate; correspondence to the published Apps Script version is not confirmed.
- The current task authorizes a baseline branch, commit and push to the existing GitHub remote. Preserve existing application changes as-is. Do not merge into main, create a PR, integrate QR, publish Apps Script, run setup/migrations/live writes, or change application code/data/access. Do not open QR S1/S2 or the Apps Script editor.
- Keep secrets, order data, private snapshots and temporary exports out of Git. Scan alone must not confirm loading/unloading; identifiers require verified mapping before integration.

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

Loading, unloading, and Interstate BOL notification MVP are implemented. Keep changes minimal and avoid business-logic changes unless a production test exposes a real issue.
