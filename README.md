# Arakne RMS demo

This is a static, browser-only demonstration using fictional data. It has no
backend, database, or authentication. Do not enter real
records; browser storage is not encrypted or suitable for sensitive data.

The optional NY Senate law lookup sends only the search term, optional law ID,
and the user's API key to the NY Senate Open Legislation API. Obtain a free key
from https://legislation.nysenate.gov. The key stays in page memory until
reload, is not included in demo exports, and is visible to the browser and
network tools; no shared key can be kept secret in a static site. The API puts
the key in the request URL, so avoid sharing request logs. Search only
for statutes, never people or case information. The API can be unavailable or
return law text that is not applicable on the incident date. Verify sources,
dates, and all report fields independently; manual entry remains available.

Before creating people, vehicles, cases, or evidence, search existing records.
Possible duplicates are checked again at save time and may be overridden.
Matching is a limited aid, not identity verification or a guarantee against
duplicates. Evidence has one linked incident in this demo; it cannot be
attached to a second incident.

## Case review workflow

Incident dispositions and case dispositions are separate. No-review incidents
remain editable, including for a later fictional MV-104 attachment. Link people
and vehicles to an incident, then set the owner and driver on each vehicle.

Set a case disposition and submit it to a selected shift supervisor. Any demo
supervisor may approve or return it. Approved cases go to the Records queue;
the Records role can mark them filed. A supervisor can reassign an approved case
for follow-up, after which it needs review again. Review and filing history is
retained. A case pending review or approved is not editable. An incident is
shown as approved when all linked cases are approved; changes to a shared
incident are blocked while any linked case is pending or approved. Return or
reassign all affected cases before editing it. Arrest records can be linked to
multiple cases and remain independently editable.

Cases show live people, vehicles (including owner and driver), evidence,
narrative, supplements, and attachments from their linked incidents. Arrests
show live information from every linked case and each distinct incident, not
independent copies. Case-specific report fields and attachments respect the
demo's restricted-case visibility rules. Changes to shared profiles and
evidence remain visible; this is not a frozen historical snapshot.

On an arrest, use **Assign offenses** for each editable linked case to select
the case offenses attributed to that arrestee. Multiple offenses can be
assigned to an arrest, and an offense can be assigned to multiple arrests.
Assignments do not automatically create arrest charges; existing charges are
independent and must be entered or updated separately. Assignments cannot be
changed while the case is pending review or approved. Remove an offense from
all arrests before deleting it, and remove all assignments before changing an
arrest's person. Older snapshots remain compatible; IDs are added to existing
offenses when they are first assigned.

Review statuses and comments on incidents from older snapshots remain legacy
information and are not converted into case approvals. These features simulate
workflow only: roles and locks do not provide authentication or security.
Case dispositions currently cover the examples, not the full NIBRS list.

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
- `js/duplicate-search.js`: search-first creation, linking, and duplicate warnings.
- `js/laws.js`: optional NY Senate law search and report-field autofill.
- `js/case-review.js`: case review, filing, follow-up, and shared-record rules.
- `js/reports.js`: report sections and attachments.
- `js/workflows.js`: record editing and review workflows.
- `js/data.js`: sample generation, snapshot validation, and loading.
- `js/app.js`: event handlers and startup.

The JavaScript files are classic scripts that share state and functions. Keep
their order in `index.html`; `app.js` starts the app only after the other
scripts have loaded. This arrangement also supports opening the demo directly
as a local file.
