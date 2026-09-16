/* Section 94 BNSS letter renderer — a request letter to a social
 * media / email / messaging platform (Facebook, Instagram, WhatsApp,
 * Telegram, Gmail, YouTube, ...), asking them to furnish account details
 * for a crime under investigation. Modelled on the office's own DEMO
 * letters in PERORMAS/DEMO/94 bns.
 *
 * This is a plain letter, not the tabular proforma pdf-render.js draws for
 * CDR/CAF/etc, so it reuses only the low-level page helpers from there
 * (page geometry, the line-wrapping Cursor, the footer) rather than
 * anything about the table layout.
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

    // Right-aligned office header block, same information the office's own
    // letters open with.
    doc.setFont('times', 'normal');
    doc.setFontSize(11);
    const headLines = ['INSPECTOR OF POLICE', v.b94Ps || '', 'ALAPPUZHA'];
    if (v.b94Pin) headLines.push('Pin - ' + v.b94Pin);
    if (v.b94Phone) headLines.push('Phone Office - ' + v.b94Phone);
    headLines.push('Dated: ' + (fmtDate(v.b94Date) || ''));
    headLines.filter(Boolean).forEach((ln) => {
      doc.text(ln, A4.w - MM.R, cur.y + 4, { align: 'right' });
      cur.y += 5;
    });
    cur.y += 5;

    doc.setFont('times', 'normal');
    doc.setFontSize(11);
    doc.text('Letter No. ' + (v.b94LetterNo || ''), MM.L, cur.y);
    cur.y += 10;

    doc.setFont('times', 'bold');
    doc.setFontSize(12.5);
    doc.text('Notice under section 94 of the Bharatiya Nagarik Suraksha Sanhita', A4.w / 2, cur.y, { align: 'center' });
    cur.y += 9;

    const crimeLine = `A Crime has been registered in ${v.b94Ps || '__________'} Police Station as Crime `
      + `Number ${v.b94CrimeNo || '__________'} U/s. ${v.b94Sections || '__________'}. ${v.b94Brief || ''}`;
    cur.para(crimeLine, { size: 11, after: 4 });

    // Identifier block — intro line from the platform preset, then whatever
    // the officer typed in (profile name/link, mobile numbers, Gmail IDs...).
    cur.room(6);
    doc.setFont('times', 'bold');
    doc.setFontSize(11);
    doc.text(v.b94Intro || 'Account / profile identifier:', MM.L, cur.y);
    cur.y += 6;
    doc.setFont('times', 'normal');
    lines(v.b94Ids).forEach((ln) => cur.para(ln, { size: 11, after: 1 }));
    cur.y += 2;

    cur.para(
      'The following details are necessary for further investigation of the case. Hence you are '
        + 'requested to furnish the following details as early as possible.',
      { size: 11, after: 3 }
    );

    const from = fmtDate(v.b94From) || '__________';
    const to = fmtDate(v.b94To) || '__________';
    lines(v.b94Items).forEach((item, i) => {
      const text = item.replace('{FROM}', from).replace('{TO}', to);
      cur.para(`${i + 1}. ${text}`, { size: 11, after: 1.5 });
    });
    cur.y += 3;

    if (v.b94ReplyEmail) {
      cur.para('Please provide the reply to ' + v.b94ReplyEmail, { size: 11, after: 3 });
    }

    cur.para('Yours faithfully,', { size: 11, after: 18 });

    cur.room(26);
    doc.setFont('times', 'italic');
    doc.setFontSize(10.5);
    doc.text('(Signature of I/O)', A4.w - MM.R, cur.y, { align: 'right' });
    cur.y += 10;
    doc.setFont('times', 'normal');
    doc.text('(Round seal)', MM.L, cur.y);
    doc.setFont('times', 'bold');
    doc.text('STATION HOUSE OFFICER', A4.w - MM.R, cur.y, { align: 'right' });
    cur.y += 5;
    doc.setFont('times', 'normal');
    doc.text(v.b94Ps || '', A4.w - MM.R, cur.y, { align: 'right' });
    cur.y += 5;
    doc.text('ALAPPUZHA', A4.w - MM.R, cur.y, { align: 'right' });
    cur.y += 12;

    cur.room(6 + lines(v.b94Recipient).length * 5);
    doc.text('To,', MM.L, cur.y);
    cur.y += 5;
    lines(v.b94Recipient).forEach((ln) => {
      doc.text(ln, MM.L, cur.y);
      cur.y += 5;
    });

    footer(doc);
    return doc;
  }

  window.BNS94PDF = { renderBns94 };
})();
