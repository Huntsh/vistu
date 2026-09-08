export default function TapeRuler({ from = 10, step = 10, count = 8 }: { from?: number; step?: number; count?: number }) {
  const nums = Array.from({ length: count }, (_, i) => from + i * step);
  return (
    <div className="tape" aria-hidden="true">
      <div className="nums">
        {nums.map((n) => (
          <span key={n}>{n}</span>
        ))}
      </div>
    </div>
  );
}
