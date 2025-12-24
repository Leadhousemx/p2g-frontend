import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";

interface Evento {
  id: string;
  folio: string;
  nombreCliente: string;
  salon: string;
  hora: string;
}

interface Props {
  fecha?: string;
  onFechaChange: (v: string) => void;
  eventoId?: string;
  onEventoChange: (v: string) => void;
}

export default function EventoSelector({ fecha, onFechaChange, eventoId, onEventoChange }: Props) {
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!fecha) return;
    setLoading(true);
    // Simula GET /api/eventos?fecha=yyyy-mm-dd
    setTimeout(() => {
      setEventos([
        { id: "1", folio: "E-1001", nombreCliente: "Juan Pérez", salon: "Salón Azul", hora: "18:00" },
        { id: "2", folio: "E-1002", nombreCliente: "Ana López", salon: "Salón Oro", hora: "20:00" },
      ]);
      setLoading(false);
    }, 400);
  }, [fecha]);

  return (
    <div className="flex flex-col gap-2">
      <div>
        <label htmlFor="fecha-evento" className="block text-xs font-medium mb-1">Fecha del evento</label>
        <Input id="fecha-evento" type="date" value={fecha || ""} onChange={e => onFechaChange(e.target.value)} aria-label="Fecha del evento" />
      </div>
      {fecha && (
        <div>
          <label htmlFor="eventoId" className="block text-xs font-medium mb-1">Evento</label>
          <select
            id="eventoId"
            value={eventoId || ""}
            onChange={e => onEventoChange(e.target.value)}
            className="border rounded px-2 py-1 w-full"
            aria-label="Evento"
            disabled={loading}
          >
            <option value="">Selecciona...</option>
            {eventos.map(ev => (
              <option key={ev.id} value={ev.id}>{ev.folio} — {ev.nombreCliente} — {ev.salon} — {ev.hora}</option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
}
