import { Frown, Meh, Smile } from "lucide-react";

interface Props {
  value: 'bad' | 'neutral' | 'good';
}

export default function ClienteRating({ value }: Props) {
  if (value === 'bad') return (
    <span role="img" aria-label="Calificación mala">
      <Frown color="#ef4444" />
      <svg width="0" height="0"><title>Mala</title></svg>
    </span>
  );
  if (value === 'neutral') return (
    <span role="img" aria-label="Calificación neutra">
      <Meh color="#f59e42" />
      <svg width="0" height="0"><title>Neutra</title></svg>
    </span>
  );
  return (
    <span role="img" aria-label="Calificación buena">
      <Smile color="#22c55e" />
      <svg width="0" height="0"><title>Buena</title></svg>
    </span>
  );
}
