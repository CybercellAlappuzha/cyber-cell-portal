/* Cyber Cell request proforma — PDF renderer.
 *
 * Adapted from the office's existing offline Performa Generator (same
 * repository, PERORMAS/pdf.js + forms.js) so the printed form is identical
 * to what the Cyber Cell already recognizes. Only the tabular "proforma"
 * layout is kept here — this app has no letter-drafting side.
 */

(function () {
  const MM = { L: 15, R: 15, T: 13, B: 15 };
  const A4 = { w: 210, h: 297 };
  const CW = A4.w - MM.L - MM.R;

  /* Middle clause of the Declaration, taken verbatim from the office's own
   * "New <TYPE> performa.doc" templates where one exists (CDR, IMEI, IPDR,
   * CAF); the remaining types follow the same CDR-style pattern since there
   * is no separate official template for them. Checked in priority order —
   * a PDF generated for one type has that type's flag true, plus pfAddress
   * when Address was merged into it (see app.js), so Address is checked
   * LAST: when it's riding along with CDR/CAF/Certified copy, that type's
   * wording is the one that should actually print. */
  const DECLARATION_MIDDLE = [
    { flag: 'pfCdr', text: 'The CDR is requested for bonafide limited purpose only. The Subscriber identity has been ascertained and it is ensured that the person in question is not someone whose call details are of a sensitive nature.' },
    { flag: 'pfImeiTrace', text: 'The IMEI trace is requested for bonafide limited purpose only. The Subscriber identity has been ascertained and it is ensured that the person in question is not someone whose call details are of a sensitive nature.' },
    { flag: 'pfIpdr', text: 'The Subscriber identity has been ascertained and it is ensured that the person in question is not someone whose IP details are of a sensitive nature.' },
    { flag: 'pfCaf', text: 'The Subscriber identity has been ascertained and it is ensured that the person in question is not someone whose CAF details are of a sensitive nature.' },
    { flag: 'pfCertified', text: 'The certified copy is requested for bonafide limited purpose only. The Subscriber identity has been ascertained and it is ensured that the person in question is not someone whose call details are of a sensitive nature.' },
    { flag: 'pfAadhaar', text: 'The Aadhaar search is requested for bonafide limited purpose only. The Subscriber identity has been ascertained and it is ensured that the person in question is not someone whose details are of a sensitive nature.' },
    { flag: 'pfSim', text: 'The SIM number search is requested for bonafide limited purpose only. The Subscriber identity has been ascertained and it is ensured that the person in question is not someone whose details are of a sensitive nature.' },
    { flag: 'pfAddress', text: 'The address details are requested for bonafide limited purpose only. The Subscriber identity has been ascertained and it is ensured that the person in question is not someone whose address details are of a sensitive nature.' },
  ];

  function declarationText(v) {
    const middle = (DECLARATION_MIDDLE.find((d) => v[d.flag]) || DECLARATION_MIDDLE[0]).text;
    return 'I hereby declare that I am the Investigating / enquiry officer of the above-mentioned case and all '
      + 'the above-mentioned details are true to the best of my knowledge and belief. ' + middle
      + ' The number is not subscribed in the name of a sitting MP / MLA or Government Official.';
  }

  function fmtDate(iso) {
    if (!iso) return '';
    const d = new Date(iso.length <= 10 ? iso + 'T00:00:00' : iso);
    if (isNaN(d)) return iso;
    const p = (n) => String(n).padStart(2, '0');
    return `${p(d.getDate())}.${p(d.getMonth() + 1)}.${d.getFullYear()}`;
  }

  function lines(t) {
    return String(t || '')
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  function makeDoc() {
    const doc = new window.jspdf.jsPDF({ unit: 'mm', format: 'a4' });
    doc.setFont('times', 'normal');
    return doc;
  }

  function Cursor(doc) {
    this.doc = doc;
    this.y = MM.T;
  }
  Cursor.prototype.room = function (h) {
    if (this.y + h > A4.h - MM.B) {
      this.doc.addPage();
      this.y = MM.T;
    }
  };
  Cursor.prototype.para = function (text, opt) {
    opt = opt || {};
    const doc = this.doc;
    const size = opt.size || 12;
    doc.setFont('times', opt.bold ? 'bold' : 'normal');
    doc.setFontSize(size);
    const lh = size * 0.42 + 1.2;
    const wrapped = doc.splitTextToSize(String(text), CW);
    wrapped.forEach((ln) => {
      this.room(lh);
      let x = MM.L;
      if (opt.align === 'center') x = A4.w / 2;
      doc.text(ln, x, this.y, { align: opt.align === 'center' ? 'center' : 'left' });
      this.y += lh;
    });
    this.y += opt.after == null ? 2 : opt.after;
  };

  function box(doc, x, y, checked) {
    doc.setLineWidth(0.3);
    doc.rect(x, y - 3.1, 3.6, 3.6);
    if (checked) {
      doc.setLineWidth(0.5);
      doc.line(x + 0.6, y - 1.4, x + 1.5, y - 0.2);
      doc.line(x + 1.5, y - 0.2, x + 3.1, y - 2.6);
      doc.setLineWidth(0.3);
    }
  }

  /** Bold + underlined heading, left-aligned, matching the office's own templates. */
  function underlinedHeading(doc, text, x, y) {
    doc.setFont('times', 'bold');
    doc.setFontSize(11.5);
    doc.text(text, x, y);
    const w = doc.getTextWidth(text);
    doc.setLineWidth(0.3);
    doc.line(x, y + 0.8, x + w, y + 0.8);
  }

  function radio(doc, x, y, checked) {
    doc.setLineWidth(0.3);
    doc.circle(x + 1.8, y - 1.3, 1.8);
    if (checked) doc.circle(x + 1.8, y - 1.3, 0.9, 'F');
  }

  function selection(v) {
    const s = [];
    if (v.pfAddress) s.push('SDR');
    if (v.pfCaf) s.push('CAF');
    if (v.pfCdr) s.push('CDR');
    if (v.pfIpdr) s.push('IPDR');
    if (v.pfImeiTrace) s.push('IMEI DETAILS');
    if (v.pfCertified) s.push('CERTIFIED COPIES');
    if (v.pfAadhaar) s.push('AADHAAR SEARCH');
    if (v.pfSim) s.push('SIM NUMBER SEARCH');
    return s;
  }

  function proformaTitle(v) {
    const s = selection(v);
    const fallback = 'REQUEST FOR OBTAINING SDR / CDR / IMEI DETAILS / IPDR DETAILS / CERTIFIED COPIES / AADHAAR / SIM DETAILS FOR THE PURPOSE OF INVESTIGATION OF CRIME CASE / ENQUIRY';
    if (!s.length) return fallback;
    return 'REQUEST FOR OBTAINING ' + s.join(' / ').toUpperCase() + ' FOR THE PURPOSE OF INVESTIGATION OF CRIME CASE / ENQUIRY';
  }

  /** Plain checkbox+label items shown in the Required Details box — only the
   *  ones actually being requested on this PDF (a PDF only ever has one or
   *  two flags true, per app.js), never the full list of every possible type. */
  function activeSimpleItems(v) {
    const items = [];
    if (v.pfAddress) items.push('Address (SDR)');
    if (v.pfCaf) items.push('CAF');
    if (v.pfCdr) items.push('CDR');
    if (v.pfIpdr) items.push('IPDR');
    if (v.pfCertified) items.push('Certified copy');
    if (v.pfAadhaar) items.push('Aadhaar search');
    if (v.pfSim) items.push('SIM number search');
    return items;
  }

  /** How many 7mm rows requiredCell will need for this PDF's own selection —
   *  used to size the Required Details box before drawing it. */
  function requiredCellRows(v) {
    const itemRows = Math.ceil(activeSimpleItems(v).length / 2);
    const periodRow = (v.pfCdr || v.pfIpdr) ? 1 : 0;
    const imeiRow = v.pfImeiTrace ? 1 : 0;
    return Math.max(1, itemRows + periodRow + imeiRow);
  }

  function requiredCell(doc, v, x, y) {
    let cy = y + 5;
    doc.setFont('times', 'normal');
    doc.setFontSize(10.5);

    const items = activeSimpleItems(v);
    for (let i = 0; i < items.length; i += 2) {
      box(doc, x, cy, true);
      doc.text(items[i], x + 5.5, cy);
      if (items[i + 1]) {
        box(doc, x + 62, cy, true);
        doc.text(items[i + 1], x + 67.5, cy);
      }
      cy += 7;
    }

    if (v.pfCdr || v.pfIpdr) {
      doc.setFont('times', 'bold');
      doc.text('Required Period', x, cy);
      doc.setFont('times', 'normal');
      doc.text('From', x + 32, cy);
      doc.rect(x + 42, cy - 4, 26, 5.5);
      doc.setFont('times', 'bold');
      doc.text(fmtDate(v.pfFrom), x + 43.5, cy);
      doc.setFont('times', 'normal');
      doc.text('To', x + 71, cy);
      doc.rect(x + 77, cy - 4, 26, 5.5);
      doc.setFont('times', 'bold');
      doc.text(fmtDate(v.pfTo), x + 78.5, cy);
      doc.setFont('times', 'normal');
      cy += 7;
    }

    if (v.pfImeiTrace) {
      doc.setFont('times', 'bold');
      doc.text('IMEI Trace Period', x, cy);
      doc.setFont('times', 'normal');
      doc.text('From', x + 38, cy);
      doc.rect(x + 48, cy - 4, 24, 5.5);
      doc.setFont('times', 'bold');
      doc.text(fmtDate(v.pfImeiFrom), x + 49.5, cy);
      doc.setFont('times', 'normal');
      doc.text('To', x + 76, cy);
      doc.rect(x + 82, cy - 4, 24, 5.5);
      doc.setFont('times', 'bold');
      doc.text(fmtDate(v.pfImeiTo), x + 83.5, cy);
      doc.setFont('times', 'normal');
      cy += 7;
    }
  }

  function footer(doc) {
    const n = doc.getNumberOfPages();
    for (let i = 1; i <= n; i++) {
      doc.setPage(i);
      doc.setFont('times', 'italic');
      doc.setFontSize(8.5);
      doc.setTextColor(110);
      doc.text('Confidential — for official use only', MM.L, A4.h - 7);
      if (n > 1) doc.text(`Page ${i} of ${n}`, A4.w - MM.R, A4.h - 7, { align: 'right' });
      doc.setTextColor(0);
    }
  }

  function renderProforma(v) {
    const doc = makeDoc();
    const cur = new Cursor(doc);

    doc.setFont('times', 'bold');
    doc.setFontSize(10.5);
    doc.splitTextToSize(proformaTitle(v), CW - 6).forEach((ln) => {
      doc.text(ln, A4.w / 2, cur.y + 4, { align: 'center' });
      cur.y += 4.6;
    });
    cur.y += 4;

    const L1 = 52;
    const rows = [
      ['POLICE OFFICE & LOG Book No.', v.pfOffice || ''],
      ['Crime No, Sec of Law &\nPolice Station', v.pfCrime || ''],
      ['Details of Investigating Officer\n(Name & Rank)', v.pfIo || ''],
      ['Date of Occurrence', fmtDate(v.pfOccur)],
      ['Date of Report', fmtDate(v.pfReport)],
      ['Name of Complainant', v.pfComplainant || ''],
      ['Brief of the Case / Enquiry', v.pfBrief || ''],
    ];

    doc.autoTable({
      startY: cur.y,
      margin: { left: MM.L, right: MM.R },
      body: rows,
      styles: { font: 'times', fontSize: 10, lineColor: 20, lineWidth: 0.2, cellPadding: 1.5, valign: 'top' },
      // Column 0 is the field label (e.g. "Crime No, Sec of Law & Police
      // Station"); column 1 is what the officer actually typed in — bold so
      // every entered detail stands out clearly on the printed proforma.
      columnStyles: { 0: { cellWidth: L1, fontStyle: 'bold' }, 1: { cellWidth: CW - L1, fontStyle: 'bold' } },
      theme: 'grid',
    });

    const subj = lines(v.pfRows).map((r) => {
      const p = r.split('|').map((s) => s.trim());
      return [p[0] || '', p[1] || '', p[2] || ''];
    });
    const subjRealCount = subj.length;
    while (subj.length < 3) subj.push(['', '', '']);

    const sel = selection(v);
    const label = `Details of subscriber / actual user whose ${sel.length ? sel.join(' / ') : 'CDR / CAF'} is required`;
    const idCol = v.pfAadhaar || v.pfSim ? 'Mobile / IMEI / Aadhaar Number' : 'Mobile / IMEI Number';
    const sw = (CW - L1) / 3;
    const subjStart = doc.lastAutoTable.finalY;

    // A station can enter a lot of subscriber rows for one case, and the
    // whole proforma should still fit on a single page rather than spill
    // onto a second one. As the row count climbs, first shrink the table
    // (font size + padding) so more rows fit in the same height; past
    // SUBJ_NUMBERS_ONLY_THRESHOLD rows even the smallest readable size
    // isn't enough, so Name & Address / Reason are dropped and the table
    // becomes a compact multi-column list of just the numbers instead.
    // Both sets of breakpoints below were found empirically (Playwright +
    // pdfplumber, realistic short single-line subscriber data), not computed
    // analytically, since row height depends on jsPDF-autotable's own text
    // wrapping in ways that are hard to predict exactly.
    let subjFont;
    let subjPad;
    if (subjRealCount <= 5) { subjFont = 10; subjPad = 1.6; }
    else if (subjRealCount <= 6) { subjFont = 9; subjPad = 1.2; }
    else if (subjRealCount <= 8) { subjFont = 8; subjPad = 0.9; }
    else if (subjRealCount <= 11) { subjFont = 7; subjPad = 0.6; }
    else { subjFont = 6.5; subjPad = 0.5; }
    const SUBJ_NUMBERS_ONLY_THRESHOLD = 13;
    const numbersOnly = subjRealCount > SUBJ_NUMBERS_ONLY_THRESHOLD;

    if (!numbersOnly) {
      doc.autoTable({
        startY: subjStart,
        margin: { left: MM.L, right: MM.R },
        head: [['', idCol, 'Name & Address', 'Reason or connection of the number with the crime / enquiry']],
        body: subj.map((r) => ['', r[0], r[1], r[2]]),
        styles: { font: 'times', fontSize: subjFont, lineColor: 20, lineWidth: 0.2, cellPadding: subjPad, valign: 'top' },
        headStyles: { fillColor: false, textColor: 20, fontStyle: 'bold', lineWidth: 0.2, lineColor: 20, fontSize: Math.min(10, subjFont + 0.5) },
        // Columns 1-3 hold what the officer typed in for each subscriber row —
        // bold, same as every other entered detail on the proforma.
        columnStyles: {
          0: { cellWidth: L1 },
          1: { cellWidth: sw, fontStyle: 'bold' },
          2: { cellWidth: sw, fontStyle: 'bold' },
          3: { cellWidth: sw, fontStyle: 'bold' },
        },
        theme: 'grid',
      });
    } else {
      // Name & Address / Reason abandoned — pack several numbers per row so
      // a long list still fits on one page. Column count and font/padding
      // step up together as the row count climbs (calibrated the same way
      // as the tiers above).
      const nums = subj.map((r) => r[0]).filter(Boolean);
      let numCols;
      let numFont;
      let numPad;
      if (subjRealCount <= 20) { numCols = 2; numFont = 8; numPad = 0.8; }
      else if (subjRealCount <= 30) { numCols = 3; numFont = 8; numPad = 0.8; }
      else if (subjRealCount <= 39) { numCols = 3; numFont = 7; numPad = 0.5; }
      else if (subjRealCount <= 52) { numCols = 4; numFont = 7; numPad = 0.5; }
      else if (subjRealCount <= 75) { numCols = 5; numFont = 6.5; numPad = 0.4; }
      else { numCols = 6; numFont = 6; numPad = 0.3; }
      const numRows = [];
      for (let i = 0; i < nums.length; i += numCols) {
        const row = [''];
        for (let c = 0; c < numCols; c += 1) row.push(nums[i + c] || '');
        numRows.push(row);
      }
      const nw = (CW - L1) / numCols;
      const head = [''].concat(Array(numCols).fill(idCol));
      const colStyles = { 0: { cellWidth: L1 } };
      for (let c = 1; c <= numCols; c += 1) colStyles[c] = { cellWidth: nw, fontStyle: 'bold' };
      doc.autoTable({
        startY: subjStart,
        margin: { left: MM.L, right: MM.R },
        head: [head],
        body: numRows,
        styles: { font: 'times', fontSize: numFont, lineColor: 20, lineWidth: 0.2, cellPadding: numPad, valign: 'top' },
        headStyles: { fillColor: false, textColor: 20, fontStyle: 'bold', lineWidth: 0.2, lineColor: 20, fontSize: numFont },
        columnStyles: colStyles,
        theme: 'grid',
      });
    }

    const subjEnd = doc.lastAutoTable.finalY;
    doc.setFillColor(255, 255, 255);
    doc.rect(MM.L, subjStart, L1, subjEnd - subjStart, 'F');
    doc.setDrawColor(20);
    doc.setLineWidth(0.2);
    doc.rect(MM.L, subjStart, L1, subjEnd - subjStart);
    doc.setFont('times', 'bold');
    doc.setFontSize(10);
    doc.splitTextToSize(label, L1 - 4).forEach((ln, i) => doc.text(ln, MM.L + 2, subjStart + 5 + i * 4.4));

    const startY = subjEnd;
    const h = Math.max(24, 5 + requiredCellRows(v) * 7 + 5);
    doc.setLineWidth(0.2);
    doc.rect(MM.L, startY, L1, h);
    doc.rect(MM.L + L1, startY, CW - L1, h);
    doc.setFont('times', 'bold');
    doc.setFontSize(10.5);
    doc.splitTextToSize('Required details', L1 - 4).forEach((ln, i) => doc.text(ln, MM.L + 2, startY + 6 + i * 5));
    requiredCell(doc, v, MM.L + L1 + 3, startY);
    cur.y = startY + h;

    doc.autoTable({
      startY: cur.y,
      margin: { left: MM.L, right: MM.R },
      body: [
        ['Justification of the Investigation Officer for taking the details.', v.pfJust || ''],
        [
          'Remarks if any',
          [sel.length ? 'Details requested: ' + sel.join(', ') + '.' : '', v.pfRemarks || '']
            .filter(Boolean)
            .join('\n'),
        ],
      ],
      styles: { font: 'times', fontSize: 10, lineColor: 20, lineWidth: 0.2, cellPadding: 1.5, valign: 'top' },
      columnStyles: { 0: { cellWidth: L1, fontStyle: 'bold' }, 1: { cellWidth: CW - L1, fontStyle: 'bold' } },
      theme: 'grid',
    });
    cur.y = doc.lastAutoTable.finalY + 5;

    cur.room(16);
    underlinedHeading(doc, 'Declaration', MM.L, cur.y + 3);
    cur.y += 8;
    cur.para(declarationText(v), { size: 10.5, after: 3 });

    cur.room(6);
    doc.setFont('times', 'italic');
    doc.setFontSize(10.5);
    doc.text('Name, Signature of I/O with Date', A4.w / 2, cur.y + 3, { align: 'center' });
    cur.y += 9;

    // Verified-by / Recommended-by signature table — left blank in the body
    // row so the ISHO and SDPO sign and seal it by hand after printing,
    // exactly as in the office's own "New <TYPE> performa.doc" templates.
    const sigRowH = 30;
    cur.room(14 + sigRowH);
    doc.autoTable({
      startY: cur.y,
      margin: { left: MM.L, right: MM.R },
      body: [
        ['Verified by : Name & Signature of ISHO\nwith office seal and Date', 'Recommended by : Name & Signature of SDPO\nwith office seal and Date'],
        ['', ''],
      ],
      styles: { font: 'times', fontSize: 10, lineColor: 20, lineWidth: 0.2, cellPadding: 2, valign: 'top' },
      columnStyles: { 0: { cellWidth: CW / 2 }, 1: { cellWidth: CW / 2 } },
      didParseCell: (data) => {
        if (data.row.index === 1) data.cell.styles.minCellHeight = sigRowH;
      },
      theme: 'grid',
    });
    cur.y = doc.lastAutoTable.finalY;

    footer(doc);
    return doc;
  }

  window.PFPDF = { renderProforma, fmtDate };
})();
