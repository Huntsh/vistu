// Avatar de iniciais (sem upload de foto): mesma cor sempre para a mesma
// pessoa, usando as cores que já existem no tema do app.
const PALETTE: { bg: string; fg: string }[] = [
  { bg: '#1f5f8b', fg: '#fff' }, // blueprint
  { bg: '#2f7d4f', fg: '#fff' }, // ok
  { bg: '#a86a12', fg: '#fff' }, // warn
  { bg: '#c8482a', fg: '#fff' }, // bad
  { bg: '#f4b400', fg: '#23262b' }, // tape
];

function initials(name: string | null | undefined, email: string): string {
  const n = (name ?? '').trim();
  if (n) {
    const parts = n.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (email.trim()[0] || '?').toUpperCase();
}

function hashStr(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return h;
}

export default function Avatar({
  name,
  email,
  size = 32,
}: {
  name?: string | null;
  email: string;
  size?: number;
}) {
  const key = (name?.trim() || email || '').toLowerCase();
  const { bg, fg } = PALETTE[hashStr(key) % PALETTE.length];

  return (
    <span
      title={name?.trim() || email}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size,
        height: size,
        minWidth: size,
        borderRadius: '50%',
        background: bg,
        color: fg,
        border: '1.5px solid var(--ink)',
        fontFamily: 'var(--f-title)',
        fontWeight: 700,
        fontSize: Math.max(10, Math.round(size * 0.4)),
        letterSpacing: '0.02em',
        lineHeight: 1,
        userSelect: 'none',
      }}
    >
      {initials(name, email)}
    </span>
  );
}
