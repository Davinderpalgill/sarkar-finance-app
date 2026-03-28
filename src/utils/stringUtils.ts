export function capitalize(s: string): string {
  if (!s) return '';
  return s.charAt(0).toUpperCase() + s.slice(1).toLowerCase();
}

export function titleCase(s: string): string {
  return s.split(/\s+/).map(capitalize).join(' ');
}

export function truncate(s: string, max: number): string {
  return s.length > max ? s.slice(0, max - 1) + '…' : s;
}

export function initials(name: string): string {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map(p => p.charAt(0).toUpperCase())
    .join('');
}

export function maskAccount(last4: string | null): string {
  if (!last4) return 'XXXX';
  return `••••${last4}`;
}

export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, '').replace(/^91/, '');
}
