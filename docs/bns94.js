(function () {
  function qs(sel, root) { return (root || document).querySelector(sel); }
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

  // One preset per platform: the recipient's address, the intro line above
  // the identifier block, and the default requested-details list (each
  // item can use {FROM}/{TO}, filled in from the "Records period" dates at
  // generate time). All of it is editable in the form before generating —
  // these are just starting points taken from the office's own DEMO letters.
  const PLATFORMS = {
    facebook: {
      label: 'Facebook',
      idLabel: 'Profile name & link',
      idPlaceholder: 'Profile name: XXXXXXXXXX\nLink: https://www.facebook.com/XXXXXXXXX/',
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
      idLabel: 'Profile name & link',
      idPlaceholder: 'Profile name: XXXXXXXXXX\nLink: https://www.instagram.com/XXXXXXXXXX',
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
      idLabel: 'Profile name & link',
      idPlaceholder: 'Profile name: @XXXXXXX\nLink: https://www.t.me/xxxxxx',
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

  // Filling in the preset overwrites whatever's in the To / Requested
  // details / identifier boxes — simplest behaviour, and matches how a
  // station will actually use this: pick the platform first, then fill in
  // the case-specific parts. Switching platform after typing details is
  // the edge case, not the common path.
  function applyPreset() {
    const p = PLATFORMS[platformSel.value];
    if (!p) return;
    qs('#b94IdsLabel').textContent = p.idLabel + ' *';
    qs('#b94Ids').placeholder = p.idPlaceholder;
    qs('#b94Recipient').value = p.to;
    qs('#b94Items').value = p.items.join('\n');
  }
  platformSel.addEventListener('change', applyPreset);
  platformSel.value = 'facebook';
  applyPreset();

  function val(id) { return qs('#' + id).value.trim(); }

  function collect() {
    const p = PLATFORMS[platformSel.value];
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
      b94Ids: val('b94Ids'),
      b94From: val('b94From'),
      b94To: val('b94To'),
      b94Items: val('b94Items'),
      b94ReplyEmail: val('b94ReplyEmail'),
      b94Recipient: val('b94Recipient'),
    };
  }

  function validate(v) {
    const errors = [];
    if (!v.b94Ps) errors.push('Police Station is required.');
    if (!v.b94LetterNo) errors.push('Letter No. is required.');
    if (!v.b94Date) errors.push('Date is required.');
    if (!v.b94CrimeNo) errors.push('Crime No. is required.');
    if (!v.b94Sections) errors.push('Sec. of Law is required.');
    if (!v.b94Brief) errors.push('Brief of the case is required.');
    if (!v.b94Ids) errors.push(`${PLATFORMS[platformSel.value].idLabel} is required.`);
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
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    formMsg.innerHTML = '';
    const v = collect();
    const errors = validate(v);
    if (errors.length) {
      formMsg.innerHTML = `<div class="msg error"><strong>Please fix the following:</strong><ul>${errors.map((m) => `<li>${esc(m)}</li>`).join('')}</ul></div>`;
      formMsg.scrollIntoView({ behavior: 'smooth', block: 'start' });
      return;
    }
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
})();
