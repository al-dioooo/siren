const rtf = new Intl.RelativeTimeFormat('id-ID', { numeric: 'always' });

export function relativeTime(iso: string): string {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return 'baru saja';
  if (minutes < 60) return rtf.format(-minutes, 'minute');
  if (minutes < 24 * 60) return rtf.format(-Math.round(minutes / 60), 'hour');
  return rtf.format(-Math.round(minutes / (24 * 60)), 'day');
}

const dtf = new Intl.DateTimeFormat('id-ID', {
  dateStyle: 'medium',
  timeStyle: 'short',
  timeZone: 'Asia/Jakarta',
});

export function formatDateTime(iso: string): string {
  return `${dtf.format(new Date(iso))} WIB`;
}
