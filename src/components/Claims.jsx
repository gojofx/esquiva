// Solicitudes de estudiantes que quieren recuperar su nombre desde otro dispositivo.
export default function Claims({ claims, resolveClaim }) {
  if (!claims || !claims.length) return null;
  return (
    <div className="notebar" role="alert">
      {claims.map((c) => (
        <div key={c.id} className="btn-row" style={{ marginBottom: 6 }}>
          <span>
            Un dispositivo quiere entrar como <b>{c.name}</b>. Si es su celular nuevo o se le borró, apruébalo (el anterior se desconecta).
          </span>
          <button className="btn small" type="button" onClick={() => resolveClaim(c.id, true)}>Aprobar</button>
          <button className="btn ghost small" type="button" onClick={() => resolveClaim(c.id, false)}>Rechazar</button>
        </div>
      ))}
    </div>
  );
}
