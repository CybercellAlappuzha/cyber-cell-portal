(function () {
  function qs(sel, root) { return (root || document).querySelector(sel); }
  function qsa(sel, root) { return Array.from((root || document).querySelectorAll(sel)); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));
  }

  // Police Office / Police Station suggestion dropdowns — Alappuzha
  // district police stations and DySP offices, from
  // public/police-stations.js. Built by hand in JS rather than a native
  // <datalist>, because a <datalist>'s suggestion popup doesn't show at
  // all in some browsers (Safari in particular has no visible dropdown
  // for it), which is exactly the "no suggestion dropdown shows" report
  // this replaced. Police Office offers stations + DySP offices; Police
  // Station (in the Crime No./Sec./PS group) offers stations only. Free
  // text is still accepted — nothing here blocks typing a value that
  // isn't in the list, for a station that's new or renamed.
  function attachAutocomplete(inputId, listId, options) {
    const input = qs('#' + inputId);
    const list = qs('#' + listId);
    if (!input || !list) return;
    let activeIndex = -1;
    let shown = [];

    function render(filterText) {
      const q = (filterText || '').trim().toLowerCase();
      shown = q ? options.filter((o) => o.toLowerCase().includes(q)) : options;
      activeIndex = -1;
      if (!shown.length) {
        list.innerHTML = '<div class="ac-empty">No match — you can still type any name</div>';
      } else {
        list.innerHTML = shown.map((o, i) => `<div class="ac-opt" data-i="${i}">${esc(o)}</div>`).join('');
      }
      list.hidden = false;
    }

    function hide() { list.hidden = true; activeIndex = -1; }

    function choose(i) {
      if (shown[i] == null) return;
      input.value = shown[i];
      hide();
      input.dispatchEvent(new Event('change', { bubbles: true }));
    }

    function setActive(i) {
      qsa('.ac-opt', list).forEach((el) => el.classList.remove('active'));
      if (i >= 0 && shown[i] != null) {
        activeIndex = i;
        const el = list.querySelector(`.ac-opt[data-i="${i}"]`);
        if (el) { el.classList.add('active'); el.scrollIntoView({ block: 'nearest' }); }
      }
    }

    input.addEventListener('focus', () => render(input.value));
    input.addEventListener('click', () => render(input.value));
    input.addEventListener('input', () => render(input.value));
    input.addEventListener('keydown', (e) => {
      if (list.hidden && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) { render(input.value); return; }
      if (e.key === 'ArrowDown') { e.preventDefault(); setActive(Math.min(activeIndex + 1, shown.length - 1)); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); setActive(Math.max(activeIndex - 1, 0)); }
      else if (e.key === 'Enter') { if (activeIndex >= 0) { e.preventDefault(); choose(activeIndex); } }
      else if (e.key === 'Escape') { hide(); }
    });
    list.addEventListener('mousedown', (e) => {
      // mousedown (not click) fires before the input's blur, so the
      // option is still in the DOM to read when choosing it.
      const opt = e.target.closest('.ac-opt');
      if (opt) choose(Number(opt.dataset.i));
    });
    document.addEventListener('click', (e) => {
      if (e.target !== input && !list.contains(e.target)) hide();
    });
  }

  (function setupPoliceAutocomplete() {
    const data = window.ALAPPUZHA_POLICE;
    if (!data) return;
    attachAutocomplete('pfPoliceOffice', 'pfPoliceOfficeList', data.policeOffices);
    attachAutocomplete('pfCrimePs', 'pfCrimePsList', data.policeStations);
  })();

  // Subscriber / user detail rows now come from two independent boxes: the
  // general one (feeds Address/CAF/CDR/IPDR/Certified copy/Aadhaar/SIM) and
  // a dedicated one for IMEI Trace, which has its own IMEIs rather than
  // sharing the general box's phone numbers. Both use the same row markup
  // and add/remove behaviour, so it's built once as a small factory.
  function makeRowGroup(containerId, addBtnId, numberPlaceholder) {
    const container = qs('#' + containerId);
    function addRow(number, nameAddr, reason) {
      const div = document.createElement('div');
      div.className = 'row-item';
      div.innerHTML = `
        <input class="id-number" placeholder="${esc(numberPlaceholder)}" value="${esc(number || '')}">
        <input class="id-name" placeholder="Name & address (if known)" value="${esc(nameAddr || '')}">
        <input class="id-reason" placeholder="Reason / connection with the crime" value="${esc(reason || '')}">
        <button type="button" class="secondary small remove-row">Remove</button>
      `;
      div.querySelector('.remove-row').addEventListener('click', () => {
        if (container.children.length > 1) div.remove();
      });
      container.appendChild(div);
    }
    addRow();
    qs('#' + addBtnId).addEventListener('click', () => addRow());
    function collectRows() {
      const numbers = [];
      const rows = qsa('.row-item', container)
        .map((row) => {
          const number = row.querySelector('.id-number').value.trim();
          const name = row.querySelector('.id-name').value.trim();
          const reason = row.querySelector('.id-reason').value.trim();
          if (number) numbers.push(number);
          return number ? `${number} | ${name} | ${reason}` : '';
        })
        .filter(Boolean);
      return { numbers, text: rows.join('\n'), count: rows.length };
    }
    return { addRow, collectRows };
  }

  const idRowsGroup = makeRowGroup('idRows', 'addRowBtn', 'Mobile / IMEI / Aadhaar number');
  const imeiRowsGroup = makeRowGroup('imeiRows', 'addImeiRowBtn', 'IMEI number (15 digits)');

  const periodFields = qs('#periodFields');
  const imeiFromField = qs('#imeiFromField');
  const imeiRowsFieldset = qs('#imeiRowsFieldset');

  function syncConditionals() {
    periodFields.style.display = (qs('#pfCdr').checked || qs('#pfIpdr').checked) ? '' : 'none';
    const imeiOn = qs('#pfImeiTrace').checked;
    imeiFromField.style.display = imeiOn ? '' : 'none';
    // The IMEI Trace box has its own Subscriber / user details section
    // (IMEIs, not phone numbers) — only shown once IMEI Trace is ticked.
    // IMEI Trace is otherwise fully independent from "Required details" now
    // (including Address) — each is its own separate request with its own
    // rows, so ticking one no longer affects the other.
    imeiRowsFieldset.style.display = imeiOn ? '' : 'none';
  }
  ['pfCdr', 'pfIpdr', 'pfImeiTrace'].forEach((id) => qs('#' + id).addEventListener('change', syncConditionals));
  syncConditionals();

  // The "Subscriber / user details" hint changes with what's ticked under
  // "Required details", so a station knows exactly what identifier to put
  // in each row before they start filling them in. Each request type maps
  // to the kind of identifier it needs; when several types are ticked at
  // once the hint groups them by identifier so it stays readable instead
  // of just naming one type ("CAF, CDR, IPDR, ... : phone number." rather
  // than repeating "phone number" once per type). IMEI Trace isn't listed
  // here — it has its own box and its own Subscriber / user details section.
  const ID_HINT_TYPES = [
    { flag: 'pfAddress', label: 'Address (SDR)', unit: 'phone number' },
    { flag: 'pfCaf', label: 'CAF', unit: 'phone number' },
    { flag: 'pfCdr', label: 'CDR', unit: 'phone number' },
    { flag: 'pfIpdr', label: 'IPDR', unit: 'phone number' },
    { flag: 'pfCertified', label: 'Certified copy', unit: 'phone number' },
    { flag: 'pfAadhaar', label: 'Aadhaar search', unit: 'Aadhaar number' },
    { flag: 'pfSim', label: 'SIM number search', unit: 'SIM number' },
  ];
  const idRowsHint = qs('#idRowsHint');
  function updateIdRowsHint() {
    if (!idRowsHint) return;
    const selected = ID_HINT_TYPES.filter((t) => qs('#' + t.flag).checked);
    if (!selected.length) {
      idRowsHint.textContent = 'One row per number or Aadhaar number.';
      return;
    }
    const groups = [];
    selected.forEach((t) => {
      let g = groups.find((g2) => g2.unit === t.unit);
      if (!g) { g = { unit: t.unit, labels: [] }; groups.push(g); }
      g.labels.push(t.label);
    });
    idRowsHint.textContent = groups.map((g) => `${g.labels.join(', ')}: one row per ${g.unit}.`).join(' ');
  }
  ID_HINT_TYPES.forEach((t) => qs('#' + t.flag).addEventListener('change', updateIdRowsHint));
  updateIdRowsHint();

  // A required period longer than 6 months needs prior permission from the
  // District Police Chief before the request can go to the Cyber Cell — flag
  // it live as soon as both dates of a period are filled in, for CDR/IPDR's
  // "Required period" and for the IMEI trace period.
  function exceedsSixMonths(fromStr, toStr) {
    if (!fromStr || !toStr) return false;
    const from = new Date(fromStr);
    const to = new Date(toStr);
    if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) return false;
    const limit = new Date(from);
    limit.setMonth(limit.getMonth() + 6);
    return to > limit;
  }
  const cdrPeriodWarn = qs('#cdrPeriodWarn');
  const imeiPeriodWarn = qs('#imeiPeriodWarn');
  function updatePeriodWarnings() {
    cdrPeriodWarn.style.display = exceedsSixMonths(qs('#pfFrom').value, qs('#pfTo').value) ? '' : 'none';
    imeiPeriodWarn.style.display = exceedsSixMonths(qs('#pfImeiFrom').value, qs('#pfImeiTo').value) ? '' : 'none';
  }
  ['pfFrom', 'pfTo', 'pfImeiFrom', 'pfImeiTo'].forEach((id) => qs('#' + id).addEventListener('change', updatePeriodWarnings));
  updatePeriodWarnings();

  /** Each entry is one independently-requestable item: checkbox id, the flag name
   *  passed into pdf-render.js, and a short tag used in the downloaded filename. */
  const REQUEST_TYPES = [
    { id: 'pfAddress', flag: 'pfAddress', tag: 'Address' },
    { id: 'pfCaf', flag: 'pfCaf', tag: 'CAF' },
    { id: 'pfCdr', flag: 'pfCdr', tag: 'CDR' },
    { id: 'pfIpdr', flag: 'pfIpdr', tag: 'IPDR' },
    { id: 'pfImeiTrace', flag: 'pfImeiTrace', tag: 'IMEI' },
    { id: 'pfCertified', flag: 'pfCertified', tag: 'Certified' },
    { id: 'pfAadhaar', flag: 'pfAadhaar', tag: 'Aadhaar' },
    { id: 'pfSim', flag: 'pfSim', tag: 'SIM' },
  ];

  function val(id) { return qs('#' + id).value.trim(); }
  function checked(id) { return qs('#' + id).checked; }

  /** IMEI format check: exactly 15 digits (spaces/hyphens ignored).
   *
   *  This deliberately does NOT enforce the GSMA Luhn check digit. A real
   *  device's IMEI is normally Luhn-valid, but the numbers a station is
   *  entering here often come from CDR/tower data on a suspect's device —
   *  exactly the case where the IMEI can be reprogrammed, cloned, or
   *  otherwise non-compliant (which is sometimes the reason it's suspicious
   *  enough to trace in the first place). Rejecting a genuine 15-digit IMEI
   *  because it fails a checksum would block real investigation data, so
   *  only the digit count/format is enforced. */
  function isValidImei(raw) {
    const s = String(raw || '').replace(/[\s-]/g, '');
    return /^\d{15}$/.test(s);
  }

  function collect() {
    const idData = idRowsGroup.collectRows();
    const imeiData = imeiRowsGroup.collectRows();

    // Police Office and Log Book No. are two separate fields in the form but
    // the PDF still prints them as one "Police Office & Log Book No." row,
    // same as the office's own paper template — joined back into pfOffice
    // here, same pattern as the Crime No./Sec./PS split below.
    const policeOffice = val('pfPoliceOffice');
    const logBook = val('pfLogBook');
    const pfOffice = policeOffice + (logBook ? ` — Log Book No. ${logBook}` : '');

    // Crime No., Sec. of Law and Police Station are three separate fields in
    // the form (station officers asked for them in their own columns rather
    // than one combined free-text box) but the PDF still prints them as one
    // "Crime No, Sec of Law & Police Station" row, same as the office's own
    // paper template — so they're joined back into pfCrime here for
    // pdf-render.js and the filename logic to keep using unchanged.
    const crimeNo = val('pfCrimeNo');
    const crimeSec = val('pfCrimeSec');
    const crimePs = val('pfCrimePs');
    const pfCrime = [crimeNo, crimeSec].filter(Boolean).join(' ') + (crimePs ? `, ${crimePs}` : '');

    // Investigating Officer's phone number is its own field but prints as
    // part of the same "Details of Investigating Officer" line, same
    // pattern as the other split-then-rejoined fields above.
    const ioName = val('pfIo');
    const ioPhone = val('pfIoPhone');
    const pfIo = ioName + (ioPhone ? `, Mob: ${ioPhone}` : '');

    return {
      _numbers: idData.numbers,
      _rowCount: idData.count,
      _imeiNumbers: imeiData.numbers,
      _imeiRowCount: imeiData.count,
      pfPoliceOffice: policeOffice,
      pfLogBook: logBook,
      pfOffice,
      pfCrimeNo: crimeNo,
      pfCrimeSec: crimeSec,
      pfCrimePs: crimePs,
      pfCrime,
      pfIoName: ioName,
      pfIoPhone: ioPhone,
      pfIo,
      pfOccur: val('pfOccur'),
      pfReport: val('pfReport'),
      pfComplainant: val('pfComplainant'),
      pfBrief: val('pfBrief'),
      pfRows: idData.text,
      pfImeiRows: imeiData.text,
      pfAddress: checked('pfAddress'),
      pfCaf: checked('pfCaf'),
      pfCdr: checked('pfCdr'),
      pfIpdr: checked('pfIpdr'),
      pfImeiTrace: checked('pfImeiTrace'),
      pfImeiFrom: val('pfImeiFrom'),
      pfImeiTo: val('pfImeiTo'),
      pfCertified: checked('pfCertified'),
      pfAadhaar: checked('pfAadhaar'),
      pfSim: checked('pfSim'),
      pfFrom: val('pfFrom'),
      pfTo: val('pfTo'),
      pfJust: val('pfJust'),
      pfRemarks: val('pfRemarks'),
    };
  }

  function validate(v) {
    const errors = [];
    if (!v.pfPoliceOffice) errors.push('Police Office is required.');
    if (!v.pfLogBook) errors.push('Log Book No. is required.');
    if (!v.pfCrimeNo) errors.push('Crime No. is required.');
    if (!v.pfCrimeSec) errors.push('Sec. of Law is required.');
    if (!v.pfCrimePs) errors.push('Police Station is required.');
    if (!v.pfIoName) errors.push('Investigating Officer — Name & Rank is required.');
    if (!v.pfBrief) errors.push('Brief of the Case / Enquiry is required.');
    // IMEI Trace's own subscriber rows are validated separately below — this
    // only covers the general box, and only when something that uses it is
    // actually ticked (IMEI Trace on its own doesn't need it filled in).
    const nonImeiTicked = REQUEST_TYPES.some((t) => t.flag !== 'pfImeiTrace' && v[t.flag]);
    if (nonImeiTicked && !v._rowCount) {
      errors.push('At least one row is required in "Subscriber / user details" for the items ticked under Required details.');
    }
    const anyType = REQUEST_TYPES.some((t) => v[t.flag]);
    if (!anyType) errors.push('Tick at least one item under "Required details" or "IMEI Trace".');
    if ((v.pfCdr || v.pfIpdr) && (!v.pfFrom || !v.pfTo)) {
      errors.push('Required period (from / to) is mandatory when CDR or IPDR is ticked.');
    }
    if (v.pfFrom && v.pfTo && v.pfFrom > v.pfTo) {
      errors.push('Required period: "from" date must not be after "to" date.');
    }
    if (!v.pfJust) errors.push('Justification of the Investigating Officer is required.');
    if (v.pfImeiTrace) {
      if (!v._imeiRowCount) {
        errors.push('At least one row is required in "Subscriber / user details — IMEI Trace".');
      }
      const bad = (v._imeiNumbers || []).filter((n) => !isValidImei(n));
      if (bad.length) {
        errors.push(`IMEI Trace is ticked, so every row in its Subscriber / user details must be a valid 15-digit IMEI: ${bad.join(', ')}`);
      }
      if (!v.pfImeiFrom || !v.pfImeiTo) {
        errors.push('IMEI trace period (from / to) is mandatory when IMEI Trace is ticked.');
      }
      if (v.pfImeiFrom && v.pfImeiTo && v.pfImeiFrom > v.pfImeiTo) {
        errors.push('IMEI trace period: "from" date must not be after "to" date.');
      }
    }
    return errors;
  }

  /** Non-blocking: a required period over 6 months still generates the PDF,
   *  but the officer needs to know DPC permission is required before it's
   *  actually sent to the Cyber Cell. */
  function periodWarnings(v) {
    const warnings = [];
    if ((v.pfCdr || v.pfIpdr) && exceedsSixMonths(v.pfFrom, v.pfTo)) {
      warnings.push('Required period is longer than 6 months — prior permission from the District Police Chief must be obtained before sending this request.');
    }
    if (v.pfImeiTrace && exceedsSixMonths(v.pfImeiFrom, v.pfImeiTo)) {
      warnings.push('IMEI trace period is longer than 6 months — prior permission from the District Police Chief must be obtained before sending this request.');
    }
    return warnings;
  }

  function slug(s) {
    return String(s || '')
      .replace(/[^A-Za-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 40) || 'request';
  }

  /** Crime No. is now its own field, so the filename can use it directly. */
  function crimeNoForFilename(pfCrimeNo) {
    return slug(pfCrimeNo);
  }

  const form = qs('#pfForm');
  const formMsg = qs('#formMsg');

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    formMsg.innerHTML = '';
    const v = collect();
    const errors = validate(v);
    if (errors.length) {
      formMsg.innerHTML = `<div class="msg error"><strong>Please fix the following:</strong><ul>${errors
        .map((m) => `<li>${esc(m)}</li>`)
        .join('')}</ul></div>`;
      formMsg.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }

    const warnings = periodWarnings(v);
    const warnHtml = warnings.length
      ? `<div class="msg warn"><strong>Before you send this request:</strong><ul>${warnings
          .map((m) => `<li>${esc(m)}</li>`)
          .join('')}</ul></div>`
      : '';

    const genBtn = qs('#genBtn');
    genBtn.disabled = true;
    genBtn.textContent = 'Generating…';

    // Address isn't its own separate request when it's riding along with
    // CDR, CAF, or Certified copy — those three already cover an address in
    // their own paperwork, so ticking Address alongside any of them merges
    // into that one PDF instead of spawning a separate Address-only PDF.
    // Address only gets its own PDF when none of those three are ticked.
    const MERGE_WITH_ADDRESS = ['pfCdr', 'pfCaf', 'pfCertified'];
    const addressTicked = !!v.pfAddress;
    const mergeCandidates = REQUEST_TYPES.filter((t) => MERGE_WITH_ADDRESS.includes(t.flag) && v[t.flag]);
    const addressMerges = addressTicked && mergeCandidates.length > 0;

    const jobs = [];
    REQUEST_TYPES.forEach((t) => {
      if (!v[t.flag]) return;
      if (t.flag === 'pfAddress') {
        if (!addressMerges) jobs.push({ tag: t.tag, flags: ['pfAddress'] });
        return; // otherwise Address is folded into the jobs below
      }
      if (addressMerges && MERGE_WITH_ADDRESS.includes(t.flag)) {
        jobs.push({ tag: `${t.tag}-Address`, flags: [t.flag, 'pfAddress'] });
      } else {
        jobs.push({ tag: t.tag, flags: [t.flag] });
      }
    });

    const today = new Date();
    const dateStr = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
    const crimeTag = crimeNoForFilename(v.pfCrimeNo);
    const filenames = [];

    function generateOne(i) {
      if (i >= jobs.length) {
        genBtn.disabled = false;
        genBtn.textContent = 'Generate PDF';
        formMsg.innerHTML = `${warnHtml}<div class="msg ok">Generated ${filenames.length} PDF${filenames.length === 1 ? '' : 's'} — one per item ticked under "Required details" (Address merges into CDR / CAF / Certified copy when ticked alongside them):<ul>${filenames
          .map((f) => `<li>${esc(f)}</li>`)
          .join('')}</ul>Check your browser's downloads.</div>`;
        formMsg.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
      const job = jobs[i];
      try {
        // Only this job's flags stay true, so each PDF is its own
        // single-purpose request even though the flags started out combined.
        const v1 = Object.assign({}, v);
        REQUEST_TYPES.forEach((rt) => { v1[rt.flag] = job.flags.includes(rt.flag); });
        // IMEI Trace has its own Subscriber / user details box — swap in its
        // IMEI rows so this PDF's subscriber table lists IMEIs, not the
        // general box's phone numbers.
        if (job.flags.includes('pfImeiTrace')) v1.pfRows = v.pfImeiRows;
        const doc = window.PFPDF.renderProforma(v1);
        const filename = `Proforma_${job.tag}_${crimeTag}_${dateStr}.pdf`;
        doc.save(filename);
        filenames.push(filename);
      } catch (err) {
        formMsg.innerHTML = `<div class="msg error">Could not generate the ${esc(job.tag)} PDF: ${esc(err.message || err)}</div>`;
        genBtn.disabled = false;
        genBtn.textContent = 'Generate PDF';
        return;
      }
      // Small gap between downloads so the browser doesn't treat them as a
      // multi-download flood and block the later ones.
      setTimeout(() => generateOne(i + 1), 350);
    }

    generateOne(0);
  });
})();
