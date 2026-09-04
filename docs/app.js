(function () {
  function qs(sel, root) { return (root || document).querySelector(sel); }
  function qsa(sel, root) { return Array.from((root || document).querySelectorAll(sel)); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));
  }

  const idRows = qs('#idRows');

  function addRow(number, nameAddr, reason) {
    const div = document.createElement('div');
    div.className = 'row-item';
    div.innerHTML = `
      <input class="id-number" placeholder="Mobile / IMEI / Aadhaar number" value="${esc(number || '')}">
      <input class="id-name" placeholder="Name & address (if known)" value="${esc(nameAddr || '')}">
      <input class="id-reason" placeholder="Reason / connection with the crime" value="${esc(reason || '')}">
      <button type="button" class="secondary small remove-row">Remove</button>
    `;
    div.querySelector('.remove-row').addEventListener('click', () => {
      if (idRows.children.length > 1) div.remove();
    });
    idRows.appendChild(div);
  }
  addRow();
  qs('#addRowBtn').addEventListener('click', () => addRow());

  const periodFields = qs('#periodFields');
  const imeiFromField = qs('#imeiFromField');
  const addressCheckbox = qs('#pfAddress');

  function syncConditionals() {
    periodFields.style.display = (qs('#pfCdr').checked || qs('#pfIpdr').checked) ? '' : 'none';
    const imeiOn = qs('#pfImeiTrace').checked;
    imeiFromField.style.display = imeiOn ? '' : 'none';

    // Address isn't applicable to an IMEI Trace request (an IMEI trace has no
    // address of its own to attach — unlike CDR/CAF/Certified copy, which can
    // carry Address along with them). While IMEI Trace is ticked, Address is
    // forced off and disabled so it can't be accidentally requested alongside it.
    addressCheckbox.disabled = imeiOn;
    if (imeiOn && addressCheckbox.checked) addressCheckbox.checked = false;
  }
  ['pfCdr', 'pfIpdr', 'pfImeiTrace'].forEach((id) => qs('#' + id).addEventListener('change', syncConditionals));
  syncConditionals();

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

  /** Standard IMEI check: 15 digits (spaces/hyphens ignored) with a valid Luhn check digit. */
  function isValidImei(raw) {
    const s = String(raw || '').replace(/[\s-]/g, '');
    if (!/^\d{15}$/.test(s)) return false;
    let sum = 0;
    for (let i = 0; i < 15; i++) {
      let d = Number(s[i]);
      if (i % 2 === 1) {
        d *= 2;
        if (d > 9) d -= 9;
      }
      sum += d;
    }
    return sum % 10 === 0;
  }

  function collect() {
    const numbers = [];
    const rows = qsa('#idRows .row-item')
      .map((row) => {
        const number = row.querySelector('.id-number').value.trim();
        const name = row.querySelector('.id-name').value.trim();
        const reason = row.querySelector('.id-reason').value.trim();
        if (number) numbers.push(number);
        return number ? `${number} | ${name} | ${reason}` : '';
      })
      .filter(Boolean);

    const imeiTraceChecked = checked('pfImeiTrace');

    return {
      _numbers: numbers,
      pfOffice: val('pfOffice'),
      pfCrime: val('pfCrime'),
      pfIo: val('pfIo'),
      pfOccur: val('pfOccur'),
      pfReport: val('pfReport'),
      pfComplainant: val('pfComplainant'),
      pfBrief: val('pfBrief'),
      pfRows: rows.join('\n'),
      // Address is never applicable to an IMEI Trace request — forced off here
      // too, on top of the checkbox being disabled, as a defensive fallback.
      pfAddress: imeiTraceChecked ? false : checked('pfAddress'),
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
      _rowCount: rows.length,
    };
  }

  function validate(v) {
    const errors = [];
    if (!v.pfOffice) errors.push('Police Office & Log Book No. is required.');
    if (!v.pfCrime) errors.push('Crime No., Sec. of Law & Police Station is required.');
    if (!v.pfIo) errors.push('Investigating Officer — Name & Rank is required.');
    if (!v.pfBrief) errors.push('Brief of the Case / Enquiry is required.');
    if (!v._rowCount) errors.push('At least one subscriber / identifier row is required.');
    const anyType = REQUEST_TYPES.some((t) => v[t.flag]);
    if (!anyType) errors.push('Tick at least one item under "Required details".');
    if ((v.pfCdr || v.pfIpdr) && (!v.pfFrom || !v.pfTo)) {
      errors.push('Required period (from / to) is mandatory when CDR or IPDR is ticked.');
    }
    if (v.pfFrom && v.pfTo && v.pfFrom > v.pfTo) {
      errors.push('Required period: "from" date must not be after "to" date.');
    }
    if (!v.pfJust) errors.push('Justification of the Investigating Officer is required.');
    if (v.pfImeiTrace) {
      const bad = (v._numbers || []).filter((n) => !isValidImei(n));
      if (bad.length) {
        errors.push(`IMEI Trace is ticked, so every subscriber/identifier number must be a valid 15-digit IMEI: ${bad.join(', ')}`);
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

  function slug(s) {
    return String(s || '')
      .replace(/[^A-Za-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 40) || 'request';
  }

  /** Pulls just the crime-number-looking lead of "848/2026 u/s 318(4) BNS, ..." for a tidy filename. */
  function crimeNoForFilename(pfCrime) {
    const m = String(pfCrime || '').match(/^[^,]*?(?=\s+u\/?s\.?\s|,|$)/i);
    return slug(m ? m[0] : pfCrime);
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
    const crimeTag = crimeNoForFilename(v.pfCrime);
    const filenames = [];

    function generateOne(i) {
      if (i >= jobs.length) {
        genBtn.disabled = false;
        genBtn.textContent = 'Generate PDF';
        formMsg.innerHTML = `<div class="msg ok">Generated ${filenames.length} PDF${filenames.length === 1 ? '' : 's'} — one per item ticked under "Required details" (Address merges into CDR / CAF / Certified copy when ticked alongside them):<ul>${filenames
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
