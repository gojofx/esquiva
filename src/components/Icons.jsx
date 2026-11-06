// Íconos de trazo propios (24×24). Heredan el color con currentColor.
const P = {
  wheel: (
    <>
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="2.2" />
      <path d="M12 3v6.8M12 14.2V21M3 12h6.8M14.2 12H21M5.6 5.6l4.8 4.8M13.6 13.6l4.8 4.8M18.4 5.6l-4.8 4.8M10.4 13.6l-4.8 4.8" />
    </>
  ),
  book: (
    <>
      <path d="M3 5.5C5.5 4.3 8.6 4.3 12 6c3.4-1.7 6.5-1.7 9-.5v13c-2.5-1.2-5.6-1.2-9 .5-3.4-1.7-6.5-1.7-9-.5z" />
      <path d="M12 6v13" />
    </>
  ),
  bulb: (
    <>
      <path d="M9 17h6M10 20.5h4" />
      <path d="M12 3a6 6 0 0 0-3.6 10.8c.7.6 1.1 1.3 1.1 2.2h5c0-.9.4-1.6 1.1-2.2A6 6 0 0 0 12 3z" />
    </>
  ),
  swap: (
    <>
      <path d="M4 8h14l-3.5-3.5M20 16H6l3.5 3.5" />
    </>
  ),
  check: (
    <>
      <rect x="3.5" y="3.5" width="17" height="17" rx="4" />
      <path d="M8 12.3l2.8 2.8L16.3 9" />
    </>
  ),
  trophy: (
    <>
      <path d="M8 4h8v5a4 4 0 0 1-8 0z" />
      <path d="M8 6H4.5c0 3 1.5 4.5 3.7 4.8M16 6h3.5c0 3-1.5 4.5-3.7 4.8M12 13v4M8.5 20.5h7M10 17h4l.8 3.5h-5.6z" />
    </>
  ),
  star: <path d="M12 3.5l2.6 5.4 5.9.8-4.3 4.1 1 5.8L12 16.8l-5.2 2.8 1-5.8-4.3-4.1 5.9-.8z" />,
  users: (
    <>
      <circle cx="9" cy="8" r="3.2" />
      <path d="M3 19.5c.6-3.3 3-5 6-5s5.4 1.7 6 5" />
      <circle cx="17" cy="9" r="2.5" />
      <path d="M16.5 14.3c2.4.2 4 1.7 4.5 4.2" />
    </>
  ),
  clock: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3.2 2" />
    </>
  ),
  sheet: (
    <>
      <path d="M6 3h9l4 4v14H6z" />
      <path d="M15 3v4h4M9 12h7M9 16h5" />
    </>
  ),
  door: (
    <>
      <path d="M14 4H6v16h8" />
      <path d="M10 12h10M17 9l3 3-3 3" />
    </>
  ),
  play: <path d="M8 5.5v13l10.5-6.5z" fill="currentColor" stroke="none" />,
  chevron: <path d="M9.5 6l6 6-6 6" />,
  help: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M9.6 9.3a2.5 2.5 0 0 1 4.8.9c0 1.7-2.4 2.2-2.4 3.8M12 17.3v.2" />
    </>
  ),
};

export default function Icon({ name, size = 24, className = "", strokeWidth = 1.9, label }) {
  return (
    <svg
      className={"ico " + className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      role={label ? "img" : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
    >
      {P[name]}
    </svg>
  );
}

// Marca del juego: una ruleta dorada de 8 casillas con puntero.
export function Logo({ size = 34 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
      <defs>
        <linearGradient id="lg-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f3cd6d" />
          <stop offset="1" stopColor="#c98f22" />
        </linearGradient>
      </defs>
      <circle cx="20" cy="21" r="16" fill="#0f3d2e" />
      {Array.from({ length: 8 }, (_, i) => (
        <path
          key={i}
          d="M20 21 L20 6.5 A14.5 14.5 0 0 1 30.25 10.75 Z"
          fill={i % 2 ? "#1d5a43" : "url(#lg-gold)"}
          transform={`rotate(${i * 45} 20 21)`}
        />
      ))}
      <circle cx="20" cy="21" r="16.5" fill="none" stroke="url(#lg-gold)" strokeWidth="2.6" />
      <circle cx="20" cy="21" r="4.2" fill="#0f3d2e" stroke="url(#lg-gold)" strokeWidth="2" />
      <path d="M16.5 1.5h7L20 7.5z" fill="url(#lg-gold)" />
    </svg>
  );
}

export function Brand() {
  return (
    <div className="brand">
      <Logo />
      <span>
        Ruleta de <b>Asientos</b>
      </span>
    </div>
  );
}

// Ilustración del encabezado: estudiantes en círculo alrededor de la ruleta.
export function SeatsIllustration() {
  const people = 7;
  const R = 118, cx = 170, cy = 160;
  return (
    <svg className="hero-art" viewBox="0 0 340 320" role="img" aria-label="Estudiantes sentados en círculo alrededor de una ruleta">
      <defs>
        <linearGradient id="hg-gold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f6d27a" />
          <stop offset="1" stopColor="#cf9426" />
        </linearGradient>
        <radialGradient id="hg-glow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.95" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
      </defs>
      <ellipse cx={cx} cy={cy} rx="112" ry="92" fill="url(#hg-glow)" />
      <circle cx={cx} cy={cy} r={R} fill="none" stroke="#2c6a50" strokeWidth="2.2" strokeDasharray="7 9" opacity="0.7" />
      {Array.from({ length: people }, (_, i) => {
        const a = (i / people) * Math.PI * 2 - Math.PI / 2;
        const x = cx + R * Math.cos(a), y = cy + R * Math.sin(a);
        const target = i === 2;
        return (
          <g key={i} transform={`translate(${x} ${y})`}>
            <circle cy="-13" r="10.5" fill={target ? "url(#hg-gold)" : "#174e3a"} />
            <path d="M-19 17c0-11 8.5-17 19-17s19 6 19 17z" fill={target ? "url(#hg-gold)" : "#174e3a"} />
          </g>
        );
      })}
      <g transform={`translate(${cx} ${cy})`}>
        <circle r="54" fill="#0f3d2e" />
        <circle r="54" fill="none" stroke="url(#hg-gold)" strokeWidth="5" />
        {Array.from({ length: 8 }, (_, i) => (
          <path
            key={i}
            d="M0 0 L0 -48 A48 48 0 0 1 33.9 -33.9 Z"
            fill={i % 2 ? "#1d5a43" : "#134a36"}
            transform={`rotate(${i * 45})`}
          />
        ))}
        <circle r="15" fill="#0f3d2e" stroke="url(#hg-gold)" strokeWidth="3" />
        <path d="M-7 -62h14L0 -48z" fill="url(#hg-gold)" />
      </g>
    </svg>
  );
}
