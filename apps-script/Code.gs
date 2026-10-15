/**
 * @OnlyCurrentDoc
 * Chỉ xin quyền truy cập ĐÚNG Google Sheet chứa script này (không đụng Drive, Gmail…),
 * để Google không chặn vì "ứng dụng truy cập thông tin nhạy cảm".
 */

/**
 * TRẠM SẠC CẢM XÚC: Backend Google Sheets (Google Apps Script)
 *
 * Cách dùng: xem README.md. Tóm tắt:
 *  1. Mở Google Sheet > Tiện ích mở rộng > Apps Script > dán file này.
 *  2. Chạy hàm setup() một lần (cấp quyền).
 *  3. Triển khai > Tùy chọn triển khai mới > Ứng dụng web
 *     - Thực thi dưới dạng: Tôi
 *     - Người có quyền truy cập: Bất kỳ ai
 *  4. Copy URL /exec dán vào config.js (SHEET_ENDPOINT).
 */

const SHEET_NAME = 'Phản hồi';
const STATS_NAME = 'Thống kê';
const HEADERS = [
  'Thời gian', 'Mức pin (%)', 'Tâm trạng', 'Thở phào',
  'Góp ý - Bộ phận', 'Góp ý - Nội dung',
  'Cảm ơn - Gửi tới', 'Cảm ơn - Lời nhắn',
  'Chế độ gửi', 'Tên người gửi', 'Mã phản hồi', 'Trạng thái xử lý'
];
const MOODS = ['Cạn pin', 'Pin yếu', 'Tạm ổn', 'Khá ổn', 'Đầy năng lượng'];
const DEPARTMENTS = ['Ban Giám Đốc', 'HCNS', 'Chuyên môn', 'Tất cả'];
const MAX_LEN = 3000;

/* ================= API ================= */

function doPost(e) {
  const lock = LockService.getScriptLock();
  try {
    const data = JSON.parse((e && e.postData && e.postData.contents) || '{}');
    if (data.website) return json_({ ok: true, id: 'OK' }); // bot điền honeypot => bỏ qua

    // Kiểm tra nội dung bắt buộc (khớp với validate trên trang)
    const missing =
      clean_(data.vent).length < 10 ||
      clean_(data.idea).length < 10 ||
      DEPARTMENTS.indexOf(data.department) < 0 ||
      clean_(data.thanksTo, 120).length < 2 ||
      clean_(data.thanksMsg).length < 10 ||
      (data.mode === 'named' && clean_(data.senderName, 80).length < 2);
    if (missing) return json_({ ok: false, error: 'Thiếu nội dung bắt buộc' });

    lock.waitLock(10000);
    const sheet = getFeedbackSheet_();
    const named = data.mode === 'named';
    const id = Utilities.getUuid().slice(0, 8).toUpperCase();
    const battery = Math.max(0, Math.min(100, Math.round(Number(data.battery) || 0)));

    const row = [
      new Date(),
      battery,
      MOODS.indexOf(data.mood) >= 0 ? data.mood : moodOf_(battery),
      clean_(data.vent),
      DEPARTMENTS.indexOf(data.department) >= 0 ? data.department : '',
      clean_(data.idea),
      clean_(data.thanksTo, 120),
      clean_(data.thanksMsg),
      named ? 'Có tên' : 'Ẩn danh',
      named ? clean_(data.senderName, 80) : '',
      id,
      'Mới'
    ];
    sheet.appendRow(row);
    lock.releaseLock();

    return json_({ ok: true, id: id });
  } catch (err) {
    console.error(err);
    return json_({ ok: false, error: 'Không ghi được dữ liệu' });
  } finally {
    try { lock.releaseLock(); } catch (_) {}
  }
}

// Mở URL /exec trên trình duyệt để kiểm tra triển khai đã chạy chưa.
function doGet() {
  return json_({ ok: true, service: 'Trạm Sạc Cảm Xúc', time: new Date().toISOString() });
}

/* ================= SETUP ================= */

function setup() {
  getFeedbackSheet_();
  buildStats_();
  SpreadsheetApp.getActive().toast('Trạm Sạc Cảm Xúc đã sẵn sàng!', '✅ Setup xong', 5);
}

function getFeedbackSheet_() {
  const ss = SpreadsheetApp.getActive();
  let sh = ss.getSheetByName(SHEET_NAME);
  if (!sh) {
    sh = ss.insertSheet(SHEET_NAME, 0);
    sh.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS])
      .setFontWeight('bold').setBackground('#E07A5F').setFontColor('#FFFFFF')
      .setVerticalAlignment('middle').setWrap(true);
    sh.setFrozenRows(1);
    sh.setRowHeight(1, 36);
    sh.setColumnWidth(1, 150);
    sh.setColumnWidth(2, 90);
    sh.setColumnWidth(3, 120);
    [4, 6, 8].forEach(c => sh.setColumnWidth(c, 320));
    sh.setColumnWidth(5, 130);
    sh.setColumnWidth(7, 180);
    sh.setColumnWidth(9, 100);
    sh.setColumnWidth(10, 160);
    sh.setColumnWidth(11, 110);
    sh.setColumnWidth(12, 130);
    sh.getRange('A2:A').setNumberFormat('dd/MM/yyyy HH:mm');
    sh.getRange('D2:H').setWrap(true).setVerticalAlignment('top');

    // Cột "Trạng thái xử lý" có dropdown để HCNS theo dõi
    const rule = SpreadsheetApp.newDataValidation()
      .requireValueInList(['Mới', 'Đang xử lý', 'Đã phản hồi', 'Lưu trữ'], true).build();
    sh.getRange('L2:L').setDataValidation(rule);

    // Tô màu mức pin
    const rng = sh.getRange('B2:B');
    sh.setConditionalFormatRules([
      SpreadsheetApp.newConditionalFormatRule().whenNumberLessThanOrEqualTo(40)
        .setBackground('#FBE0D6').setRanges([rng]).build(),
      SpreadsheetApp.newConditionalFormatRule().whenNumberGreaterThan(80)
        .setBackground('#E1F4EB').setRanges([rng]).build(),
      SpreadsheetApp.newConditionalFormatRule().whenTextEqualTo('Mới')
        .setBackground('#FDF1D3').setRanges([sh.getRange('L2:L')]).build(),
    ]);
  }
  return sh;
}

function buildStats_() {
  const ss = SpreadsheetApp.getActive();
  let st = ss.getSheetByName(STATS_NAME);
  if (st) ss.deleteSheet(st);
  st = ss.insertSheet(STATS_NAME, 1);
  const S = "'" + SHEET_NAME + "'!";

  st.getRange('A1').setValue('📊 THỐNG KÊ TRẠM SẠC CẢM XÚC').setFontSize(16).setFontWeight('bold').setFontColor('#C8644A');

  const kpis = [
    ['Tổng số phản hồi', `=COUNTA(${S}A2:A)`],
    ['Phản hồi 7 ngày qua', `=COUNTIF(${S}A2:A,">="&(TODAY()-7))`],
    ['Mức pin trung bình (%)', `=IFERROR(ROUND(AVERAGE(${S}B2:B),1),0)`],
    ['Mức pin TB 7 ngày qua (%)', `=IFERROR(ROUND(AVERAGEIF(${S}A2:A,">="&(TODAY()-7),${S}B2:B),1),0)`],
    ['Gửi ẩn danh', `=COUNTIF(${S}I2:I,"Ẩn danh")`],
    ['Gửi có tên', `=COUNTIF(${S}I2:I,"Có tên")`],
    ['Có chia sẻ "Thở phào"', `=COUNTIF(${S}D2:D,"?*")`],
    ['Có góp ý', `=COUNTIF(${S}F2:F,"?*")`],
    ['Có lời cảm ơn', `=COUNTIF(${S}H2:H,"?*")`],
    ['Chưa xử lý (Mới)', `=COUNTIF(${S}L2:L,"Mới")`],
  ];
  st.getRange(3, 1, 1, 2).setValues([['Chỉ số', 'Giá trị']]);
  st.getRange(4, 1, kpis.length, 2).setValues(kpis);

  const moodStart = 4 + kpis.length + 2;
  st.getRange(moodStart - 1, 1, 1, 2).setValues([['Tâm trạng', 'Số lượt']]);
  st.getRange(moodStart, 1, MOODS.length, 2)
    .setValues(MOODS.map(m => [m, `=COUNTIF(${S}C2:C,"${m}")`]));

  const deptStart = moodStart + MOODS.length + 2;
  st.getRange(deptStart - 1, 1, 1, 2).setValues([['Góp ý theo bộ phận', 'Số lượt']]);
  st.getRange(deptStart, 1, DEPARTMENTS.length, 2)
    .setValues(DEPARTMENTS.map(d => [d, `=COUNTIF(${S}E2:E,"${d}")`]));

  [3, moodStart - 1, deptStart - 1].forEach(r =>
    st.getRange(r, 1, 1, 2).setFontWeight('bold').setBackground('#F6D68F'));
  st.setColumnWidth(1, 230);
  st.setColumnWidth(2, 110);

  // Biểu đồ phân bố tâm trạng
  st.insertChart(st.newChart().setChartType(Charts.ChartType.COLUMN)
    .addRange(st.getRange(moodStart - 1, 1, MOODS.length + 1, 2))
    .setOption('title', 'Phân bố mức pin cảm xúc')
    .setOption('legend', { position: 'none' })
    .setOption('colors', ['#E07A5F'])
    .setPosition(3, 4, 0, 0).build());

  // Biểu đồ góp ý theo bộ phận
  st.insertChart(st.newChart().setChartType(Charts.ChartType.PIE)
    .addRange(st.getRange(deptStart - 1, 1, DEPARTMENTS.length + 1, 2))
    .setOption('title', 'Góp ý theo bộ phận')
    .setOption('pieHole', 0.45)
    .setOption('colors', ['#E07A5F', '#F6D68F', '#9ED6BE', '#CDBEF0'])
    .setPosition(22, 4, 0, 0).build());
}

/* ================= HELPERS ================= */

function clean_(v, max) {
  let s = String(v == null ? '' : v).replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '').trim();
  s = s.slice(0, max || MAX_LEN);
  // Chống chèn công thức (formula injection) vào Sheet
  if (/^[=+\-@]/.test(s)) s = "'" + s;
  return s;
}

function moodOf_(v) {
  return v <= 20 ? MOODS[0] : v <= 40 ? MOODS[1] : v <= 60 ? MOODS[2] : v <= 80 ? MOODS[3] : MOODS[4];
}

function json_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
