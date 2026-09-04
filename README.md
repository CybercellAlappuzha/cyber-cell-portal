# Cyber Cell Request Proforma

A station-facing web form for the CDR / CAF / IMEI tracing / IPDR / address search /
Aadhaar search request proforma. A station officer fills it in and presses **Generate
PDF** — the PDF is created entirely in the browser (same layout the Cyber Cell already
uses) and downloads immediately, ready to print and send. No accounts, no database,
nothing saved or sent anywhere by this app.

## Live — use it from any station, no setup

**https://cyberabhijithcell.github.io/cyber-cell-portal/**

Any station, anywhere, just opens that link in a browser. Nothing to install, no
server to run, no LAN required — it's a static page hosted on GitHub Pages, and the
PDF is still generated entirely in the visitor's own browser (nothing typed into the
form is saved or sent anywhere). Share that link with other stations directly.

Repo: https://github.com/cyberabhijithcell/cyber-cell-portal — Pages is served from
the `docs/` folder (a copy of `public/` with relative asset paths, since Pages serves
this repo under `/cyber-cell-portal/` rather than the domain root). To publish a
change: edit the files under `public/` as usual, then copy the same changes into
`docs/` (or re-run the copy + path-fix step) and push to `main` — Pages rebuilds
automatically in under a minute.

## Running it locally / on a station's own network instead

The instructions below are for running your own local copy with `server.js` — most
stations won't need this now that the link above works from anywhere, but it's still
useful for offline use or local development.

## Requirements

Just Node.js (any reasonably recent version — no packages to install, no `npm install`
needed).

## Running it

From this folder:

```
npm start
```

or directly:

```
node server.js
```

It prints the addresses to use:

```
On this computer:  http://localhost:3939/
On the LAN:        http://192.168.x.x:3939/   (share this with other stations)
```

- People on **this computer** browse to the `localhost` address.
- People on **other computers on the same network** (other stations) browse to the LAN
  address shown — share that with them. No login, no setup on their end beyond opening
  the page.
- Leave the terminal window open while stations are using it; closing it stops the
  server. If the LAN address ever changes, restart and read the new one from the
  terminal.
- The computer's firewall may need to allow incoming connections on the port (`3939` by
  default) the first time — allow Node.js through when Windows prompts, or add an
  inbound rule for that port.
- Different port: `set PORT=8080 && npm start` (PowerShell: `$env:PORT=8080; npm start`).

## What it asks for

Case particulars (police office & log book number, crime number and section, IO name
& rank, dates, complainant, brief of the case), one row per subscriber/IMEI/Aadhaar
number with name and reason, and what's being requested — 8 independent items: Address
(SDR), CAF, CDR, IPDR, IMEI Trace, Certified copy, Aadhaar search, SIM number search
(CDR/IPDR need a required period; IMEI Trace needs its own required period, from and
to) — plus justification and remarks. **Ticking more than one item under "Required
details" produces that many separate PDFs** in one click (e.g. tick CDR + IMEI Trace + Aadhaar search and you get
3 separate proformas, each headed for just that one request) — the Cyber Cell
processes each type separately, so each gets its own form rather than one form listing
everything. Each generated PDF's "Required details" box only shows the item(s) that
PDF is actually for (plus Required Period / IMEI Trace date where relevant) and is
sized to fit just that — not the full list of every possible type.

The requesting/recommending officer signature boxes are left **blank** on the printed
PDF — those are signed by hand after printing, same as the paper form; the app doesn't
ask for or type in officer names there.

When **IMEI Trace** is ticked, every subscriber/identifier number entered must be a
valid 15-digit IMEI (checked with the standard Luhn check digit), and a trace period
(from / to date, both required) must be filled in — the form blocks submission and
explains what's missing or wrong otherwise. Address doesn't apply to an IMEI trace,
so the Address (SDR) checkbox is automatically turned off and disabled while IMEI
Trace is ticked, and re-enabled when it's unticked.

## Files

| Path | Purpose |
| --- | --- |
| `server.js` | Zero-dependency static file server (Node's built-ins only) |
| `public/index.html` | The form |
| `public/app.js` | Form wiring, validation, triggers PDF generation |
| `public/pdf-render.js` | Renders the proforma into a PDF (adapted from the office's existing offline Performa Generator, same layout) |
| `public/vendor/jspdf*.js` | PDF libraries, bundled locally (MIT) |

To change a field or the printed layout, edit `public/index.html` (the form) and
`public/pdf-render.js` (the PDF) together — the field ids need to match between the two.
