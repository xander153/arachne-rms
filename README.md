# Arachne RMS demo

This is a static, browser-only demonstration using fictional data. It has no
backend, database, authentication, or external integrations. Do not enter real
records; browser storage is not encrypted or suitable for sensitive data.

## Running and publishing

Open `index.html` in a browser, or serve this directory with any static file
server. No build step or package installation is required. On Render, use a
Static Site and publish the repository root, including `css`, `js`, and
`images`.

Demo data is stored in the browser's local storage. The existing storage key
and snapshot format are unchanged by the file split. Storage belongs to the
site's origin: data opened locally is not automatically shared with the
deployed Render site or with other browsers or devices. Use the demo's export
and import controls to transfer fictional snapshots if needed.

## File organization

- `index.html`: page shell and ordered asset references.
- `css/styles.css`: site styling.
- `js/core.js`: shared state, initial demo data, report definitions, and UI
  helpers.
- `js/pages-work.js`: dashboard, workload, and daily attention views.
- `js/pages-records.js`: incident, case, arrest, person, vehicle, evidence,
  and warrant views.
- `js/pages-management.js`: review, tasks, analytics, audit, settings, and
  global search views.
- `js/dialogs.js`: shared dialog and form helpers.
- `js/reports.js`: report sections and attachments.
- `js/workflows.js`: record editing and review workflows.
- `js/data.js`: sample generation, snapshot validation, and loading.
- `js/app.js`: event handlers and startup.

The JavaScript files are classic scripts that share state and functions. Keep
their order in `index.html`; `app.js` starts the app only after the other
scripts have loaded. This arrangement also supports opening the demo directly
as a local file.
