// Pinta un texto de pista: lo que va entre {llaves} se resalta.
export default function ClueText({ text }) {
  const parts = text.split(/\{([^}]*)\}/);
  return parts.map((p, i) => (i % 2 ? <em key={i}>{p}</em> : <span key={i}>{p}</span>));
}
