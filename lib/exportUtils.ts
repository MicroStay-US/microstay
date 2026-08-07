/**
 * MicroStay Export Utilities
 * CSV and print-based PDF export for bookings, invoices, payouts
 */

export function exportToCSV(data: Record<string, any>[], filename: string) {
  if (!data.length) return;

  const headers = Object.keys(data[0]);
  const rows = data.map(row =>
    headers.map(h => {
      const val = row[h] ?? '';
      const str = String(val).replace(/"/g, '""');
      return str.includes(',') || str.includes('"') || str.includes('\n')
        ? `"${str}"`
        : str;
    }).join(',')
  );

  const csv = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}-${new Date().toISOString().split('T')[0]}.csv`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportBookingsToCSV(bookings: any[]) {
  const rows = bookings.map(b => ({
    'Ref #': b.ref_code || b.id?.slice(0, 8),
    'Guest Name': b.guest_name || '-',
    'Guest Email': b.guest_email || '-',
    'Guest Phone': b.guest_phone || '-',
    'Property': b.property?.name || '-',
    'Booking Date': b.booking_date || '-',
    'Time Window': b.slot
      ? `${formatHour(b.slot.start_hour)} - ${formatHour(b.slot.end_hour)}`
      : '-',
    'Rooms': b.rooms || 1,
    'Amount': b.total_price != null ? `$${Number(b.total_price).toFixed(2)}` : '-',
    'Status': b.status || '-',
    'Created At': b.created_at ? new Date(b.created_at).toLocaleString() : '-',
  }));
  exportToCSV(rows, 'microstay-bookings');
}

export function exportInvoicesToCSV(invoices: any[]) {
  const rows = invoices.map(inv => ({
    'Invoice ID': inv.id?.slice(0, 8) || '-',
    'Vendor': inv.vendor?.business_name || '-',
    'Period': inv.invoice_period || '-',
    'Motel Gross': inv.total_gross != null ? `$${Number(inv.total_gross).toFixed(2)}` : '-',
    'Commission (12%%)': inv.total_commission != null ? `$${Number(inv.total_commission).toFixed(2)}` : '-',
    // 'Platform Fees ($5)': inv.total_platform_fees != null ? `$${Number(inv.total_platform_fees).toFixed(2)}` : '-',
    'Total Due': inv.total_due != null ? `$${Number(inv.total_due).toFixed(2)}` : '-',
    'Status': inv.status || '-',
  }));
  exportToCSV(rows, 'microstay-invoices');
}

function formatHour(h: number): string {
  if (h === 0 || h === 24) return '12:00 AM';
  if (h === 12) return '12:00 PM';
  return h < 12 ? `${h}:00 AM` : `${h - 12}:00 PM`;
}
