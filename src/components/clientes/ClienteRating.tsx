import { Frown, Meh, Smile } from "lucide-react";

interface Props {
  value: 'bad' | 'neutral' | 'good';
  onRatingSelect?: (newRating: 'bad' | 'neutral' | 'good') => void;
}

export default function ClienteRating({ value, onRatingSelect }: Props) {
  const isInteractive = !!onRatingSelect;

  const handleRatingClick = (rating: 'bad' | 'neutral' | 'good') => {
    if (onRatingSelect) {
      onRatingSelect(rating);
    }
  };

  // Si no es interactivo, mostrar como badge
  if (!isInteractive) {
    const config = {
      bad: { label: 'Mala', bgColor: 'bg-red-50', textColor: 'text-red-700', borderColor: 'border-red-200' },
      neutral: { label: 'Neutra', bgColor: 'bg-amber-50', textColor: 'text-amber-700', borderColor: 'border-amber-200' },
      good: { label: 'Buena', bgColor: 'bg-green-50', textColor: 'text-green-700', borderColor: 'border-green-200' }
    };
    const cfg = config[value];
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold border ${cfg.bgColor} ${cfg.textColor} ${cfg.borderColor}`}>
        {cfg.label}
      </span>
    );
  }

  // Segmented control interactivo
  return (
    <div className="inline-flex rounded-lg border border-gray-200 bg-white shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => handleRatingClick('bad')}
        className={`flex items-center justify-center px-3 py-1.5 text-sm transition-all ${
          value === 'bad'
            ? 'bg-red-50 text-red-700 font-medium'
            : 'bg-white text-[#64748B] hover:bg-gray-50'
        } border-r border-gray-200`}
        aria-label="Marcar como mala"
        title="Mala"
      >
        <Frown size={16} className={value === 'bad' ? 'text-red-600' : 'text-gray-400'} />
      </button>
      <button
        type="button"
        onClick={() => handleRatingClick('neutral')}
        className={`flex items-center justify-center px-3 py-1.5 text-sm transition-all ${
          value === 'neutral'
            ? 'bg-amber-50 text-amber-700 font-medium'
            : 'bg-white text-[#64748B] hover:bg-gray-50'
        } border-r border-gray-200`}
        aria-label="Marcar como neutra"
        title="Neutra"
      >
        <Meh size={16} className={value === 'neutral' ? 'text-amber-600' : 'text-gray-400'} />
      </button>
      <button
        type="button"
        onClick={() => handleRatingClick('good')}
        className={`flex items-center justify-center px-3 py-1.5 text-sm transition-all ${
          value === 'good'
            ? 'bg-green-50 text-green-700 font-medium'
            : 'bg-white text-[#64748B] hover:bg-gray-50'
        }`}
        aria-label="Marcar como buena"
        title="Buena"
      >
        <Smile size={16} className={value === 'good' ? 'text-green-600' : 'text-gray-400'} />
      </button>
    </div>
  );
}
