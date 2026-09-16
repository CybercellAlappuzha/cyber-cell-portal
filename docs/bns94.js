(function () {
  function qs(sel, root) { return (root || document).querySelector(sel); }
  function qsa(sel, root) { return Array.from((root || document).querySelectorAll(sel)); }
  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));
  }

  // Reuse the same Police Office / Police Station autocomplete data and
  // widget the main proforma page uses (police-stations.js + the
  // attachAutocomplete-style dropdown), built fresh here since the two
  // pages load their scripts independently.
  function attachAutocomplete(inputId, listId, options) {
    const input = qs('#' + inputId);
    const list = qs('#' + listId);
    if (!input || !list) return;
    let shown = [];
    let activeIndex = -1;
    function render(filterText) {
      const q = (filterText || '').trim().toLowerCase();
      shown = q ? options.filter((o) => o.toLowerCase().includes(q)) : options;
      activeIndex = -1;
      list.innerHTML = shown.length
        ? shown.map((o, i) => `<div class="ac-opt" data-i="${i}">${esc(o)}</div>`).join('')
        : '<div class="ac-empty">No match — you can still type any name</div>';
      list.hidden = false;
    }
    function hide() { list.hidden = true; }
    function choose(i) { if (shown[i] != null) { input.value = shown[i]; hide(); input.dispatchEvent(new Event('change', { bubbles: true })); } }
    input.addEventListener('focus', () => render(input.value));
    input.addEventListener('click', () => render(input.value));
    input.addEventListener('input', () => render(input.value));
    list.addEventListener('mousedown', (e) => {
      const opt = e.target.closest('.ac-opt');
      if (opt) choose(Number(opt.dataset.i));
    });
    document.addEventListener('click', (e) => { if (e.target !== input && !list.contains(e.target)) hide(); });
  }
  if (window.ALAPPUZHA_POLICE) {
    attachAutocomplete('b94Ps', 'b94PsList', window.ALAPPUZHA_POLICE.policeStations);
  }

  // Facebook/Instagram/Telegram sometimes need more than one profile in the
  // same request — a repeatable name+link row, same add/remove pattern as
  // the main proforma page's Subscriber / user details rows.
  function makeProfileRowGroup(containerId, addBtnId) {
    const container = qs('#' + containerId);
    function addRow(name, link, namePh, linkPh) {
      const div = document.createElement('div');
      div.className = 'row-item row-item-2';
      div.innerHTML = `
        <input class="prof-name" placeholder="${esc(namePh || 'Account name')}" value="${esc(name || '')}">
        <input class="prof-link" placeholder="${esc(linkPh || 'Account URL')}" value="${esc(link || '')}">
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
      return qsa('.row-item', container)
        .map((row) => ({ name: row.querySelector('.prof-name').value.trim(), link: row.querySelector('.prof-link').value.trim() }))
        .filter((r) => r.name || r.link);
    }
    function setPlaceholders(namePh, linkPh) {
      qsa('.prof-name', container).forEach((el) => { el.placeholder = namePh; });
      qsa('.prof-link', container).forEach((el) => { el.placeholder = linkPh; });
    }
    return { addRow, collectRows, setPlaceholders };
  }
  const profileRows = makeProfileRowGroup('b94ProfileRows', 'addProfileRowBtn');

  // One preset per platform: the recipient's address, the intro line above
  // the identifier block, and the default requested-details list (each
  // item can use {FROM}/{TO}, filled in from the "Records period" dates at
  // generate time). All of it is editable in the form before generating —
  // these are just starting points taken from the office's own DEMO letters.
  const PLATFORMS = {
    facebook: {
      label: 'Facebook',
      namePlaceholder: 'XXXXXXXXXX',
      linkPlaceholder: 'https://www.facebook.com/XXXXXXXXX/',
      intro: 'The profile name and link to the Facebook profile is:-',
      to: 'Meta Platforms, Inc.\n1 Meta Way,\nMenlo Park, CA 94025',
      items: [
        'Login IP Address for the period from {FROM} to {TO}.',
        'Mobile Number and email ID linked with the above said profile.',
        'Mobile Number and email ID of the suspect used for verification.',
        'Device details, IMEI numbers linked with the profile.',
        'Login IP address at the creation of the Facebook account with time stamp.',
      ],
    },
    instagram: {
      label: 'Instagram',
      namePlaceholder: 'XXXXXXXXXX',
      linkPlaceholder: 'https://www.instagram.com/XXXXXXXXXX',
      intro: 'The profile name and link to the Instagram profile is:-',
      to: 'Meta Platforms, Inc.\n1 Meta Way,\nMenlo Park, CA 94025',
      items: [
        'Login IP Address for the period from {FROM} to {TO}.',
        'Mobile Number and email ID linked with the above said profile.',
        'Mobile Number and email ID of the suspect used for verification.',
        'Device details, IMEI numbers linked with the profile.',
        'Login IP address at the creation of the Instagram account with time stamp.',
      ],
    },
    whatsapp: {
      label: 'WhatsApp',
      idLabel: 'Mobile number(s)',
      idPlaceholder: '+91XXXXXXXXXX\n+91XXXXXXXXXX',
      intro: 'Mobile number latched with the WhatsApp account:',
      to: 'WhatsApp LLC\n1 Meta Way,\n1601 Willow Road,\nMenlo Park, CA 94025,\nUnited States of America',
      items: [
        'Login IP during the period from {FROM} to {TO}.',
        'Last login IP address which is used by the above said WhatsApp number.',
        'Device details and IMEI numbers linked with the above said WhatsApp account.',
        'MAC address of the device(s) configured using the above said WhatsApp account.',
      ],
    },
    telegram: {
      label: 'Telegram',
      namePlaceholder: '@XXXXXXX',
      linkPlaceholder: 'https://www.t.me/xxxxxx',
      intro: 'The profile name and link to the Telegram account is:-',
      to: 'Telegram\nP. O Box 146\nRoad Town, Tortola,\nBritish Virgin Islands',
      items: [
        'Login IP Address for the period from {FROM} to {TO}.',
        'Mobile Number and email ID linked with the above said account.',
        'Mobile Number and email ID of the suspect used for verification.',
        'Device details, IMEI numbers linked with the account.',
        'Login IP address at the creation of the Telegram account with time stamp.',
      ],
    },
    gmail: {
      label: 'Gmail',
      idLabel: 'Gmail ID(s)',
      idPlaceholder: 'XXXXXXXXXXXXX@gmail.com',
      intro: 'Gmail ID:',
      to: 'Google Inc\n1600 Amphitheatre Parkway,\nMountain View, CA 94043',
      items: [
        'Login IP during the period from {FROM} to {TO} with time stamp.',
        'Profile details of the Gmail ID with registered mobile number, OTP-sharing mobile number and alternate email ID.',
        'Details of mobile devices with IMEI which are configured in Android using the above said account.',
        'Dashboard details of the above said Gmail ID.',
      ],
    },
    youtube: {
      label: 'YouTube',
      idLabel: 'Channel URL / handle',
      idPlaceholder: 'https://www.youtube.com/@XXXXXXXXXXXXX',
      intro: 'YouTube channel URL / handle:',
      to: 'Google Inc\n1600 Amphitheatre Parkway,\nMountain View, CA 94043',
      items: [
        'Login IP during the period from {FROM} to {TO} with time stamp.',
        'Profile details of the YouTube handle with registered mobile number, OTP-sharing mobile number and alternate email ID.',
        'Details of mobile devices with IMEI which are configured in Android using the above said account.',
        'Dashboard details of the above said YouTube handle.',
      ],
    },
    other: {
      label: 'Other platform',
      idLabel: 'Account / profile identifier',
      idPlaceholder: '',
      intro: 'Account / profile identifier:',
      to: '',
      items: [],
    },
  };

  const platformSel = qs('#b94Platform');
  Object.keys(PLATFORMS).forEach((key) => {
    const opt = document.createElement('option');
    opt.value = key;
    opt.textContent = PLATFORMS[key].label;
    platformSel.appendChild(opt);
  });

  // Facebook/Instagram/Telegram ask for a profile name and a link — two
  // separate boxes. Everything else (WhatsApp numbers, Gmail IDs, a
  // YouTube handle, "Other") asks for a list of one-per-line identifiers
  // in a single box. A platform is "two-box" whenever it has a
  // namePlaceholder in its preset above.
  const idsTwoBox = qs('#b94IdsTwoBox');
  const idsOneBox = qs('#b94IdsOneBox');

  // Filling in the preset overwrites whatever's in the To / Requested
  // details / identifier boxes — simplest behaviour, and matches how a
  // station will actually use this: pick the platform first, then fill in
  // the case-specific parts. Switching platform after typing details is
  // the edge case, not the common path.
  function applyPreset() {
    const p = PLATFORMS[platformSel.value];
    if (!p) return;
    const twoBox = !!p.namePlaceholder;
    idsTwoBox.style.display = twoBox ? '' : 'none';
    idsOneBox.style.display = twoBox ? 'none' : '';
    if (twoBox) {
      profileRows.setPlaceholders(p.namePlaceholder, p.linkPlaceholder);
    } else {
      qs('#b94IdsLabel').textContent = p.idLabel + ' *';
      qs('#b94Ids').placeholder = p.idPlaceholder;
    }
    qs('#b94Recipient').value = p.to;
    qs('#b94Items').value = p.items.join('\n');
  }
  platformSel.addEventListener('change', applyPreset);
  platformSel.value = 'facebook';
  applyPreset();

  function val(id) { return qs('#' + id).value.trim(); }

  // A single profile prints exactly like before ("Profile name :- X" /
  // "Link: Y"); once there's more than one row, each is numbered so it's
  // clear which name goes with which link on the printed letter.
  function formatProfileRows(rows) {
    if (rows.length <= 1) {
      const r = rows[0] || { name: '', link: '' };
      return [r.name && `Profile name :- ${r.name}`, r.link && `Link: ${r.link}`].filter(Boolean).join('\n');
    }
    return rows
      .map((r, i) => [r.name && `Profile ${i + 1} name :- ${r.name}`, r.link && `Profile ${i + 1} link: ${r.link}`].filter(Boolean).join('\n'))
      .join('\n');
  }

  function collect() {
    const p = PLATFORMS[platformSel.value];
    const twoBox = !!p.namePlaceholder;
    const rows = twoBox ? profileRows.collectRows() : [];
    return {
      platformLabel: p.label,
      b94Intro: p.intro,
      b94Ps: val('b94Ps'),
      b94Pin: val('b94Pin'),
      b94Phone: val('b94Phone'),
      b94LetterNo: val('b94LetterNo'),
      b94Date: val('b94Date'),
      b94CrimeNo: val('b94CrimeNo'),
      b94Sections: val('b94Sections'),
      b94Brief: val('b94Brief'),
      _profileRows: rows,
      b94Ids: twoBox ? formatProfileRows(rows) : val('b94Ids'),
      b94From: val('b94From'),
      b94To: val('b94To'),
      b94Items: val('b94Items'),
      b94ReplyEmail: val('b94ReplyEmail'),
      b94Recipient: val('b94Recipient'),
    };
  }

  function validate(v) {
    const p = PLATFORMS[platformSel.value];
    const errors = [];
    if (!v.b94Ps) errors.push('Police Station is required.');
    if (!v.b94LetterNo) errors.push('Letter No. is required.');
    if (!v.b94Date) errors.push('Date is required.');
    if (!v.b94CrimeNo) errors.push('Crime No. is required.');
    if (!v.b94Sections) errors.push('Sec. of Law is required.');
    if (!v.b94Brief) errors.push('Brief of the case is required.');
    if (p.namePlaceholder) {
      if (!v._profileRows.length) errors.push('At least one profile name & link row is required.');
      const incomplete = v._profileRows.some((r) => !r.name || !r.link);
      if (incomplete) errors.push('Every profile row needs both a name and a link.');
    } else if (!v.b94Ids) {
      errors.push(`${p.idLabel} is required.`);
    }
    if (!v.b94Items) errors.push('Requested details is required — at least one line.');
    if (!v.b94Recipient) errors.push('Recipient (To) address is required.');
    if (v.b94From && v.b94To && v.b94From > v.b94To) errors.push('Records period: "from" date must not be after "to" date.');
    return errors;
  }

  function slug(s) {
    return String(s || '').replace(/[^A-Za-z0-9]+/g, '_').replace(/^_+|_+$/g, '').slice(0, 40) || 'request';
  }

  const form = qs('#b94Form');
  const formMsg = qs('#formMsg');

  // Shared by both the PDF and Word buttons: collect + validate, and show
  // the same error box either way. Returns null (with errors already shown)
  // when the form isn't ready to generate.
  function collectValid() {
    formMsg.innerHTML = '';
    const v = collect();
    const errors = validate(v);
    if (errors.length) {
      formMsg.innerHTML = `<div class="msg error"><strong>Please fix the following:</strong><ul>${errors.map((m) => `<li>${esc(m)}</li>`).join('')}</ul></div>`;
      formMsg.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return null;
    }
    return v;
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const v = collectValid();
    if (!v) return;
    try {
      const doc = window.BNS94PDF.renderBns94(v);
      const filename = `Section94_${slug(v.platformLabel)}_${slug(v.b94CrimeNo)}.pdf`;
      doc.save(filename);
      formMsg.innerHTML = `<div class="msg ok">Generated <strong>${esc(filename)}</strong>. Check your browser's downloads.</div>`;
    } catch (err) {
      formMsg.innerHTML = `<div class="msg error">Could not generate the PDF: ${esc(err.message || err)}</div>`;
    }
    formMsg.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  // Editable Word doc: same content as the PDF, built as HTML and saved
  // with a .doc extension — the standard trick for a Word-openable,
  // fully-editable file without pulling in a docx-building library. Word
  // shows a one-time "different format" prompt on open; the content and
  // formatting (bold labels, the profile table) come through fine.
  qs('#genWordBtn').addEventListener('click', () => {
    const v = collectValid();
    if (!v) return;
    try {
      const html = buildBns94Html(v);
      const blob = new Blob(['﻿', html], { type: 'application/msword' });
      const url = URL.createObjectURL(blob);
      const filename = `Section94_${slug(v.platformLabel)}_${slug(v.b94CrimeNo)}.doc`;
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
      formMsg.innerHTML = `<div class="msg ok">Generated <strong>${esc(filename)}</strong>. Check your browser's downloads.</div>`;
    } catch (err) {
      formMsg.innerHTML = `<div class="msg error">Could not generate the Word file: ${esc(err.message || err)}</div>`;
    }
    formMsg.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  function linesArr(t) {
    return String(t || '').split(/\r?\n/).map((s) => s.trim()).filter(Boolean);
  }

  function buildBns94Html(v) {
    const fmtDate = window.PFPDF.fmtDate;
    const from = fmtDate(v.b94From) || '__________';
    const to = fmtDate(v.b94To) || '__________';

    const itemsHtml = linesArr(v.b94Items)
      .map((item, i) => `<p style="margin:2px 0">${i + 1}. ${esc(item.replace('{FROM}', from).replace('{TO}', to))}</p>`)
      .join('');

    const idHtml = (v._profileRows && v._profileRows.length)
      ? `<table border="1" cellspacing="0" cellpadding="5" style="border-collapse:collapse;width:100%">
          <tr><th align="left">Profile name</th><th align="left">Profile link</th></tr>
          ${v._profileRows.map((r) => `<tr><td>${esc(r.name)}</td><td>${esc(r.link)}</td></tr>`).join('')}
        </table>`
      : linesArr(v.b94Ids).map((ln) => `<p style="margin:2px 0">${esc(ln)}</p>`).join('');

    const recipientHtml = linesArr(v.b94Recipient).map((ln) => `<p style="margin:0 0 0 40px"><b>${esc(ln)}</b></p>`).join('');

    return `<!DOCTYPE html><html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head><meta charset="utf-8"><title>Section 94 BNSS Request</title></head>
<body style="font-family:'Times New Roman',serif;font-size:12pt">
<table style="width:100%;border:none"><tr>
<td style="width:50%;vertical-align:top">
${window.KERALA_EMBLEM_PNG ? `<img src="${window.KERALA_EMBLEM_PNG}" style="width:110px;display:block;margin:0 auto">` : ''}
<p style="text-align:center;font-weight:bold;margin:4px 0 0">STATION HOUSE OFFICER</p>
<p style="text-align:center;font-weight:bold;margin:0">${esc(v.b94Ps || '')}</p>
</td>
<td style="width:50%;vertical-align:top;text-align:right">
<p style="font-weight:bold;margin:0">INSPECTOR OF POLICE</p>
<p style="font-weight:bold;margin:0">${esc(v.b94Ps || '')}</p>
<p style="font-weight:bold;margin:0">ALAPPUZHA</p>
${v.b94Pin ? `<p style="margin:0">Pin - ${esc(v.b94Pin)}</p>` : ''}
${v.b94Phone ? `<p style="margin:0">Phone Office - ${esc(v.b94Phone)}</p>` : ''}
<p style="font-weight:bold;margin:0">Dated: ${esc(fmtDate(v.b94Date) || '')}</p>
</td>
</tr></table>
<p style="text-align:center;font-weight:bold;text-decoration:underline;margin:16px 0 4px">Letter No. ${esc(v.b94LetterNo || '')}</p>
<p style="text-align:center;font-weight:bold;text-decoration:underline;margin:0 0 16px">Notice under section 94 of the Bharatiya Nagarik Suraksha Sanhita</p>
<p>A Crime has been registered in ${esc(v.b94Ps || '__________')} as Crime Number ${esc(v.b94CrimeNo || '__________')} U/s. ${esc(v.b94Sections || '__________')}. ${esc(v.b94Brief || '')}</p>
<p style="font-weight:bold">${esc(v.b94Intro || 'Account / profile identifier:')}</p>
${idHtml}
<p>The following details are necessary for further investigation of the case. Hence you are requested to furnish the following details as early as possible.</p>
${itemsHtml}
${v.b94ReplyEmail ? `<p>Please provide the reply to ${esc(v.b94ReplyEmail)}</p>` : ''}
<p style="text-align:center;margin-top:24px">Regards,</p>
<p style="margin-left:180px">Yours faithfully,</p>
<p style="text-align:right;font-weight:bold;margin-top:60px">STATION HOUSE OFFICER</p>
<p style="text-align:right;font-weight:bold;margin:0">${esc(v.b94Ps || '')}</p>
<p style="text-align:right;font-weight:bold;margin:0">ALAPPUZHA</p>
<p style="margin-top:20px">To,</p>
${recipientHtml}
</body></html>`;
  }
})();
