/* Section 94 BNSS letter renderer — a request letter to a social
 * media / email / messaging platform (Facebook, Instagram, WhatsApp,
 * Telegram, Gmail, YouTube, ...), asking them to furnish account details
 * for a crime under investigation. Laid out to match the office's own DEMO
 * letters in PERORMAS/DEMO/94 bns (*.doc) as closely as jsPDF allows:
 * Kerala Police letterhead emblem, two-column office header, centered
 * underlined letter no. / title, bold field labels, numbered request list,
 * staggered "Regards, / Yours faithfully," and signature block.
 *
 * Reuses only the low-level page helpers from pdf-render.js (page
 * geometry, the line-wrapping Cursor, the footer) — this is a plain
 * letter, not the tabular proforma that file draws for CDR/CAF/etc.
 */
(function () {
  function lines(t) {
    return String(t || '')
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);
  }

  function renderBns94(v) {
    const { makeDoc, Cursor, footer, fmtDate, MM, A4 } = window.PFPDF;
    const doc = makeDoc();
    const cur = new Cursor(doc);

    // Letterhead: Kerala Police emblem top-left, "Station House Officer /
    // <station>" beneath it, and a matching right-aligned "Inspector of
    // Police / <station> / Alappuzha / Pin / Phone / Dated" block — same
    // two-column header the office's own DEMO letters use.
    const headTop = cur.y;
    if (window.KERALA_EMBLEM_PNG) {
      const w = 22;
      const h = (w * 190) / 303;
      doc.addImage(window.KERALA_EMBLEM_PNG, 'PNG', MM.L, headTop, w, h);
    }
    doc.setFont('times', 'bold');
    doc.setFontSize(11);
    doc.text('STATION HOUSE OFFICER', MM.L, headTop + 20);
    doc.text(v.b94Ps || '', MM.L, headTop + 25);

    let ry = headTop + 4;
    doc.setFont('times', 'bold');
    doc.setFontSize(11);
    doc.text('INSPECTOR OF POLICE', A4.w - MM.R, ry, { align: 'right' });
    ry += 5;
    doc.text(v.b94Ps || '', A4.w - MM.R, ry, { align: 'right' });
    ry += 5;
    doc.text('ALAPPUZHA', A4.w - MM.R, ry, { align: 'right' });
    ry += 5;
    doc.setFont('times', 'normal');
    if (v.b94Pin) { doc.text('Pin - ' + v.b94Pin, A4.w - MM.R, ry, { align: 'right' }); ry += 5; }
    if (v.b94Phone) { doc.text('Phone Office - ' + v.b94Phone, A4.w - MM.R, ry, { align: 'right' }); ry += 5; }
    doc.setFont('times', 'bold');
    doc.text('Dated: ' + (fmtDate(v.b94Date) || ''), A4.w - MM.R, ry, { align: 'right' });

    cur.y = Math.max(headTop + 27, ry) + 8;

    // Centered, underlined, bold — Letter No. and title stacked, same as
    // the DEMO letters.
    doc.setFont('times', 'bold');
    doc.setFontSize(11.5);
    const letterNoText = 'Letter No. ' + (v.b94LetterNo || '');
    doc.text(letterNoText, A4.w / 2, cur.y, { align: 'center' });
    let w0 = doc.getTextWidth(letterNoText);
    doc.line(A4.w / 2 - w0 / 2, cur.y + 0.8, A4.w / 2 + w0 / 2, cur.y + 0.8);
    cur.y += 6.5;
    const titleText = 'Notice under section 94 of the Bharatiya Nagarik Suraksha Sanhita';
    doc.text(titleText, A4.w / 2, cur.y, { align: 'center' });
    w0 = doc.getTextWidth(titleText);
    doc.line(A4.w / 2 - w0 / 2, cur.y + 0.8, A4.w / 2 + w0 / 2, cur.y + 0.8);
    cur.y += 9;

    // Police-station names already end in "Police Station" (see
    // police-stations.js), so it's used as-is here rather than appending
    // "Police Station" again.
    const crimeLine = `A Crime has been registered in ${v.b94Ps || '__________'} as Crime `
      + `Number ${v.b94CrimeNo || '__________'} U/s. ${v.b94Sections || '__________'}. ${v.b94Brief || ''}`;
    cur.para(crimeLine, { size: 11, after: 4 });

    // Identifier block — intro line from the platform preset (bold, as in
    // the DEMO letters), then whatever the officer typed in (profile
    // name/link, mobile numbers, Gmail IDs...), each line bold-labelled
    // when it has a "Label: value" / "Label :- value" shape.
    cur.room(6);
    doc.setFont('times', 'bold');
    doc.setFontSize(11);
    doc.text(v.b94Intro || 'Account / profile identifier:', MM.L, cur.y);
    cur.y += 7;
    doc.setFontSize(11);
    lines(v.b94Ids).forEach((ln) => {
      const m = ln.match(/^([^:]{1,40}:-?)\s*(.*)$/);
      if (m) {
        doc.setFont('times', 'bold');
        doc.text(m[1] + ' ', MM.L, cur.y);
        doc.setFont('times', 'normal');
        doc.text(m[2], MM.L + doc.getTextWidth(m[1] + '  '), cur.y);
        cur.y += 6;
      } else {
        doc.setFont('times', 'normal');
        cur.para(ln, { size: 11, after: 1 });
      }
    });
    cur.y += 2;

    cur.para(
      'The following details are necessary for further investigation of the case. Hence you are '
        + 'requested to furnish the following details as early as possible.',
      { size: 11, after: 4 }
    );

    const from = fmtDate(v.b94From) || '__________';
    const to = fmtDate(v.b94To) || '__________';
    lines(v.b94Items).forEach((item, i) => {
      const text = item.replace('{FROM}', from).replace('{TO}', to);
      cur.para(`${i + 1}. ${text}`, { size: 11, after: 2.5 });
    });
    cur.y += 2;

    if (v.b94ReplyEmail) {
      cur.para('Please provide the reply to ' + v.b94ReplyEmail, { size: 11, after: 3 });
    }

    // "Regards," centered, "Yours faithfully," staggered further right
    // beneath it — matches the DEMO letters' odd but consistent layout.
    doc.setFont('times', 'normal');
    doc.setFontSize(11);
    cur.room(10);
    doc.text('Regards,', A4.w / 2 + 10, cur.y, { align: 'center' });
    cur.y += 6;
    doc.text('Yours faithfully,', A4.w / 2 + 25, cur.y);
    cur.y += 14;

    cur.room(26);
    doc.setFont('times', 'normal');
    doc.setFontSize(10.5);
    doc.text('(signature of IO)', A4.w - MM.R, cur.y, { align: 'right' });
    cur.y += 12;
    doc.text('(Round seal)', MM.L + 20, cur.y);
    doc.setFont('times', 'bold');
    doc.text('STATION HOUSE OFFICER', A4.w - MM.R, cur.y, { align: 'right' });
    cur.y += 5;
    doc.text(v.b94Ps || '', A4.w - MM.R, cur.y, { align: 'right' });
    cur.y += 5;
    doc.text('ALAPPUZHA', A4.w - MM.R, cur.y, { align: 'right' });
    cur.y += 10;

    doc.setFont('times', 'normal');
    doc.setFontSize(11);
    cur.room(6 + lines(v.b94Recipient).length * 5);
    doc.text('To,', MM.L, cur.y);
    cur.y += 5;
    doc.setFont('times', 'bold');
    lines(v.b94Recipient).forEach((ln) => {
      doc.text(ln, MM.L + 12, cur.y);
      cur.y += 5;
    });

    footer(doc);
    return doc;
  }

  window.BNS94PDF = { renderBns94 };
})();
