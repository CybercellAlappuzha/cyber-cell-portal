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

  // Body content (crime line, profile table, requested-details list,
  // recipient...) grows with what the officer typed in, and can spill onto
  // a second page. Rather than accept that, build the letter at a font/
  // spacing scale, and if it doesn't fit on one page, retry progressively
  // smaller — same idea as the main proforma's row-shrinking, applied to a
  // free-form letter instead of a table. The letterhead itself is left at
  // full size since it's fixed height regardless of content.
  function build(v, scale) {
    const { makeDoc, Cursor, fmtDate, MM, A4, CW } = window.PFPDF;
    const doc = makeDoc();
    const cur = new Cursor(doc);
    const s = (n) => n * scale;

    // Letterhead: a larger Kerala Police emblem flush with the left margin,
    // with "Station House Officer / <station>" left-aligned beneath it, and
    // a matching right-aligned "Inspector of Police / <station> / Alappuzha /
    // Pin / Phone / Dated" block — same two-column header the office's own
    // DEMO letters use.
    const headTop = cur.y;
    const emblemW = 32;
    const emblemH = (emblemW * 268) / 284; // new round KERALA POLICE seal is ~284x268
    doc.setFont('times', 'bold');
    doc.setFontSize(11);
    const shoTextCenter = MM.L + doc.getTextWidth('STATION HOUSE OFFICER') / 2;
    if (window.KERALA_EMBLEM_PNG) {
      doc.addImage(window.KERALA_EMBLEM_PNG, 'PNG', shoTextCenter - emblemW / 2, headTop, emblemW, emblemH);
    }
    doc.text('STATION HOUSE OFFICER', MM.L, headTop + emblemH + 5);

    let ry = headTop + 4;
    doc.setFont('times', 'bold');
    doc.setFontSize(11);
    doc.text(v.b94Ps || '', A4.w - MM.R, ry, { align: 'right' });
    ry += 5;
    doc.text('ALAPPUZHA', A4.w - MM.R, ry, { align: 'right' });
    ry += 5;
    doc.setFont('times', 'normal');
    if (v.b94Pin) { doc.text('Pin - ' + v.b94Pin, A4.w - MM.R, ry, { align: 'right' }); ry += 5; }
    if (v.b94Phone) { doc.text('Phone Office - ' + v.b94Phone, A4.w - MM.R, ry, { align: 'right' }); ry += 5; }
    doc.setFont('times', 'bold');
    doc.text('Dated: ' + (fmtDate(v.b94Date) || ''), A4.w - MM.R, ry, { align: 'right' });

    cur.y = Math.max(headTop + emblemH + 10, ry) + s(8);

    // Centered, underlined, bold — Letter No. and title stacked, same as
    // the DEMO letters.
    doc.setFont('times', 'bold');
    doc.setFontSize(Math.max(9, s(11.5)));
    const letterNoText = 'Letter No. ' + (v.b94LetterNo || '');
    doc.text(letterNoText, A4.w / 2, cur.y, { align: 'center' });
    let w0 = doc.getTextWidth(letterNoText);
    doc.line(A4.w / 2 - w0 / 2, cur.y + 0.8, A4.w / 2 + w0 / 2, cur.y + 0.8);
    cur.y += s(6.5);
    const titleText = 'Notice under section 94 of the Bharatiya Nagarik Suraksha Sanhita';
    doc.text(titleText, A4.w / 2, cur.y, { align: 'center' });
    w0 = doc.getTextWidth(titleText);
    doc.line(A4.w / 2 - w0 / 2, cur.y + 0.8, A4.w / 2 + w0 / 2, cur.y + 0.8);
    cur.y += s(9);

    const bodySize = Math.max(8.5, s(11));

    // Police-station names already end in "Police Station" (see
    // police-stations.js), so it's used as-is here rather than appending
    // "Police Station" again.
    const crimeLine = `A Crime has been registered in ${v.b94Ps || '__________'} as Crime `
      + `Number ${v.b94CrimeNo || '__________'} U/s. ${v.b94Sections || '__________'}. ${v.b94Brief || ''}`;
    cur.para(crimeLine, { size: bodySize, after: s(4) });

    // Identifier block — intro line from the platform preset (bold, as in
    // the DEMO letters), then the details. A two-box platform (profile
    // name + link) gets a proper 2-column table; a list-style platform
    // (WhatsApp numbers, Gmail IDs, ...) keeps the plain line-by-line list.
    cur.room(s(6));
    doc.setFont('times', 'bold');
    doc.setFontSize(bodySize);
    doc.text(v.b94Intro || 'Account / profile identifier:', MM.L, cur.y);
    cur.y += s(4);

    if (v._profileRows && v._profileRows.length) {
      doc.autoTable({
        startY: cur.y,
        margin: { left: MM.L, right: MM.R },
        head: [['Profile name', 'Profile link']],
        body: v._profileRows.map((r) => [r.name, r.link]),
        styles: { font: 'times', fontSize: Math.max(7, s(10.5)), lineColor: 20, lineWidth: 0.2, cellPadding: Math.max(0.8, s(2)), valign: 'top' },
        headStyles: { fillColor: false, textColor: 20, fontStyle: 'bold', lineWidth: 0.2, lineColor: 20 },
        columnStyles: { 0: { cellWidth: CW * 0.35, fontStyle: 'bold' }, 1: { cellWidth: CW * 0.65, fontStyle: 'bold' } },
        theme: 'grid',
      });
      cur.y = doc.lastAutoTable.finalY + s(4);
    } else {
      doc.setFontSize(bodySize);
      doc.setFont('times', 'normal');
      lines(v.b94Ids).forEach((ln) => cur.para(ln, { size: bodySize, after: s(1) }));
      cur.y += s(2);
    }

    cur.para(
      'The following details are necessary for further investigation of the case. Hence you are '
        + 'requested to furnish the following details as early as possible.',
      { size: bodySize, after: s(4) }
    );

    const from = fmtDate(v.b94From) || '__________';
    const to = fmtDate(v.b94To) || '__________';
    lines(v.b94Items).forEach((item, i) => {
      const text = item.replace('{FROM}', from).replace('{TO}', to);
      cur.para(`${i + 1}. ${text}`, { size: bodySize, after: s(2.5) });
    });
    cur.y += s(2);

    if (v.b94ReplyEmail) {
      cur.para('Please provide the reply to ' + v.b94ReplyEmail, { size: bodySize, after: s(3) });
    }

    // "Regards," centered, "Yours faithfully," staggered further right
    // beneath it — matches the DEMO letters' odd but consistent layout.
    doc.setFont('times', 'normal');
    doc.setFontSize(bodySize);
    cur.room(s(10));
    doc.text('Regards,', A4.w / 2 + 10, cur.y, { align: 'center' });
    cur.y += s(6);
    doc.text('Yours faithfully,', A4.w / 2 + 25, cur.y);
    cur.y += s(14);

    cur.room(s(26));
    doc.setFont('times', 'bold');
    doc.setFontSize(Math.max(8, s(10.5)));
    doc.text('STATION HOUSE OFFICER', A4.w - MM.R, cur.y, { align: 'right' });
    cur.y += s(5);
    doc.text(v.b94Ps || '', A4.w - MM.R, cur.y, { align: 'right' });
    cur.y += s(5);
    doc.text('ALAPPUZHA', A4.w - MM.R, cur.y, { align: 'right' });
    cur.y += s(10);

    doc.setFont('times', 'normal');
    doc.setFontSize(bodySize);
    cur.room(s(6) + lines(v.b94Recipient).length * s(5));
    doc.text('To,', MM.L, cur.y);
    cur.y += s(5);
    doc.setFont('times', 'bold');
    lines(v.b94Recipient).forEach((ln) => {
      doc.text(ln, MM.L + 12, cur.y);
      cur.y += s(5);
    });

    // No footer here (unlike pdf-render.js's proforma) — the office asked
    // for this letter without the "Confidential..." line or the
    // attribution watermark.
    return doc;
  }

  function renderBns94(v) {
    // Try full size first, then shrink font + spacing in steps until the
    // whole letter fits on one page. Floors out at 0.8 rather than going
    // smaller still and hurting readability — a letter that's still too
    // long at that point just prints on two pages.
    const scales = [1, 0.93, 0.87, 0.8];
    let doc = build(v, scales[0]);
    for (let i = 1; i < scales.length && doc.internal.getNumberOfPages() > 1; i += 1) {
      doc = build(v, scales[i]);
    }
    return doc;
  }

  window.BNS94PDF = { renderBns94 };
})();
