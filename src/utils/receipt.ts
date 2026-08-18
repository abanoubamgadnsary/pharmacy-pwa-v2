export type ReceiptLine = {
  name: string;
  nameAr?: string;
  qty: number;
  unitPrice: number;
  unitLabel?: string;
};

export type ReceiptLabels = {
  title: string;
  date: string;
  items: string;
  qty: string;
  price: string;
  lineTotal: string;
  total: string;
  thankYou: string;
  pharmacyName: string;
};

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function buildReceiptHtml(
  lines: ReceiptLine[],
  total: number,
  soldAt: Date,
  labels: ReceiptLabels,
  formatMoney: (value: number) => string,
  isRtl: boolean,
): string {
  const dir = isRtl ? 'rtl' : 'ltr';
  const align = isRtl ? 'right' : 'left';
  const dateStr = soldAt.toLocaleString(isRtl ? 'ar-EG' : 'en-GB', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

  const rows = lines.map((line) => {
    const lineTotal = line.qty * line.unitPrice;
    const sub = line.nameAr ? `<div class="sub">${escapeHtml(line.nameAr)}</div>` : '';
    return `
      <tr>
        <td style="text-align:${align}">
          <div class="name">${escapeHtml(line.name)}</div>
          ${sub}
        </td>
        <td class="num">${line.qty}${line.unitLabel ? ` ${escapeHtml(line.unitLabel)}` : ''}</td>
        <td class="num">${formatMoney(line.unitPrice)}</td>
        <td class="num bold">${formatMoney(lineTotal)}</td>
      </tr>`;
  }).join('');

  return `<!DOCTYPE html>
<html dir="${dir}" lang="${isRtl ? 'ar' : 'en'}">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(labels.title)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: Arial, sans-serif;
      font-size: 12px;
      color: #111;
      padding: 12px;
      max-width: 80mm;
      margin: 0 auto;
    }
    .center { text-align: center; }
    .brand { font-size: 18px; font-weight: bold; margin-bottom: 2px; }
    .title { font-size: 13px; margin-bottom: 8px; color: #444; }
    .meta { font-size: 11px; color: #555; margin-bottom: 10px; }
    table { width: 100%; border-collapse: collapse; margin: 8px 0; }
    th, td { padding: 4px 2px; vertical-align: top; }
    th {
      font-size: 10px;
      text-transform: uppercase;
      color: #666;
      border-bottom: 1px dashed #bbb;
    }
    td { border-bottom: 1px dotted #eee; }
    .name { font-weight: 600; }
    .sub { font-size: 10px; color: #666; margin-top: 1px; }
    .num { text-align: center; white-space: nowrap; }
    .bold { font-weight: bold; }
    .total-row {
      display: flex;
      justify-content: space-between;
      font-size: 16px;
      font-weight: bold;
      margin-top: 10px;
      padding-top: 8px;
      border-top: 2px solid #111;
    }
    .thanks {
      text-align: center;
      margin-top: 14px;
      font-size: 11px;
      color: #555;
    }
    @media print {
      body { padding: 0; }
    }
  </style>
</head>
<body>
  <div class="center">
    <div class="brand">${escapeHtml(labels.pharmacyName)}</div>
    <div class="title">${escapeHtml(labels.title)}</div>
  </div>
  <div class="meta">${escapeHtml(labels.date)}: ${escapeHtml(dateStr)}</div>
  <table>
    <thead>
      <tr>
        <th style="text-align:${align}">${escapeHtml(labels.items)}</th>
        <th>${escapeHtml(labels.qty)}</th>
        <th>${escapeHtml(labels.price)}</th>
        <th>${escapeHtml(labels.lineTotal)}</th>
      </tr>
    </thead>
    <tbody>${rows}</tbody>
  </table>
  <div class="total-row">
    <span>${escapeHtml(labels.total)}</span>
    <span>${escapeHtml(formatMoney(total))}</span>
  </div>
  <div class="thanks">${escapeHtml(labels.thankYou)}</div>
  <script>window.onload = function() { window.print(); };</script>
</body>
</html>`;
}

export function printReceipt(
  lines: ReceiptLine[],
  total: number,
  soldAt: Date,
  labels: ReceiptLabels,
  formatMoney: (value: number) => string,
  isRtl: boolean,
): void {
  if (lines.length === 0) return;

  const html = buildReceiptHtml(lines, total, soldAt, labels, formatMoney, isRtl);
  const popup = window.open('', '_blank', 'width=360,height=640');
  if (!popup) return;

  popup.document.open();
  popup.document.write(html);
  popup.document.close();
}
