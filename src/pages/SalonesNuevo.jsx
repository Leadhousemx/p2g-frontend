// src/pages/SalonesNuevo.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Input, Textarea, Card, CardHeader, CardContent, CardFooter, Label } from "@/components/ui";

const PALETA = [
  { key: "azul", hex: "#2563eb" },
  { key: "indigo", hex: "#4f46e5" },
  { key: "verde", hex: "#16a34a" },
  { key: "amarillo", hex: "#f59e0b" },
  { key: "rojo", hex: "#dc2626" },
  { key: "gris", hex: "#6b7280" },
];

export default function SalonesNuevo() {
  const navigate = useNavigate();
  const [nombre, setNombre] = useState("");
  const [telefono, setTelefono] = useState("");
  const [color, setColor] = useState(PALETA[0].hex);
  const [contratos, setContratos] = useState([
    { id: crypto.randomUUID(), nombre: "Contrato salón", machote: "" },
  ]);
  const [errors, setErrors] = useState({});

  const addContrato = () => {
    setContratos((prev) => [...prev, { id: crypto.randomUUID(), nombre: "", machote: "" }]);
  };
  const updateContrato = (id, patch) => {
    setContratos((prev) => prev.map((c) => (c.id === id ? { ...c, ...patch } : c)));
  };
  const removeContrato = (id) => {
    setContratos((prev) => prev.filter((c) => c.id !== id));
  };

  const validate = () => {
    const e = {};
    if (!nombre.trim()) e.nombre = "El nombre del salón es obligatorio.";
    if (telefono && !/^[\d\s+\-()]{7,}$/.test(telefono)) e.telefono = "Teléfono inválido.";
    if (!color) e.color = "Selecciona un color.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    const payload = { nombre, telefono, color, contratos };
    console.log("Nuevo salón:", payload);
    navigate("/salones");
  };

  return (
    <>
      <h1 className="text-2xl font-bold text-[#2563eb] mb-4">Nuevo salón</h1>

      <form onSubmit={handleSubmit} className="space-y-4">
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold">Datos del salón</h2>
          </CardHeader>
          <CardContent className="grid gap-4">
            <div>
              <Label htmlFor="nombre">Nombre del salón</Label>
              <Input
                id="nombre"
                value={nombre}
                onChange={(e) => setNombre(e.target.value)}
                placeholder="Ej. Salón Las Palmas"
                aria-invalid={!!errors.nombre}
              />
              {errors.nombre && <p className="text-red-600 text-sm mt-1">{errors.nombre}</p>}
            </div>

            <div>
              <Label htmlFor="telefono">Teléfono</Label>
              <Input
                id="telefono"
                value={telefono}
                onChange={(e) => setTelefono(e.target.value)}
                placeholder="Ej. 999-123-4567"
                aria-invalid={!!errors.telefono}
              />
              {errors.telefono && <p className="text-red-600 text-sm mt-1">{errors.telefono}</p>}
            </div>

            <div>
              <Label>Color de identificación</Label>
              <div className="mt-2 flex flex-wrap gap-2">
                {PALETA.map((c) => (
                  <button
                    key={c.key}
                    type="button"
                    title={c.key}
                    onClick={() => setColor(c.hex)}
                    className={`h-8 w-8 rounded-full border-2 ${
                      color === c.hex ? "border-black ring-2 ring-black/20" : "border-transparent"
                    }`}
                    style={{ backgroundColor: c.hex }}
                    aria-pressed={color === c.hex}
                  />
                ))}
              </div>
              {errors.color && <p className="text-red-600 text-sm mt-1">{errors.color}</p>}
              <p className="text-xs text-gray-500 mt-1">
                Este color se usará para mostrar en el calendario las fechas agendadas de este negocio.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Contratos de servicio</h2>
            <Button type="button" variant="outline" onClick={addContrato}>
              Agregar contrato
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {contratos.map((c, idx) => (
              <div key={c.id} className="rounded-xl border p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-sm">Contrato #{idx + 1}</Label>
                  <Button type="button" variant="ghost" onClick={() => removeContrato(c.id)}>
                    Eliminar
                  </Button>
                </div>
                <div>
                  <Label htmlFor={`contrato-nombre-${c.id}`}>Nombre del contrato</Label>
                  <Input
                    id={`contrato-nombre-${c.id}`}
                    placeholder="Ej. Contrato todo incluido"
                    value={c.nombre}
                    onChange={(e) => updateContrato(c.id, { nombre: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor={`contrato-machote-${c.id}`}>Machote (plantilla)</Label>
                  <Textarea
                    id={`contrato-machote-${c.id}`}
                    placeholder="Pega aquí el machote del contrato…"
                    value={c.machote}
                    onChange={(e) => updateContrato(c.id, { machote: e.target.value })}
                    className="min-h-[120px]"
                  />
                </div>
              </div>
            ))}

            {contratos.length === 0 && (
              <p className="text-gray-500 text-sm">No hay contratos. Usa “Agregar contrato”.</p>
            )}
          </CardContent>
          <CardFooter className="flex items-center justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => navigate("/salones")}>Cancelar</Button>
            <Button type="submit">Guardar</Button>
          </CardFooter>
        </Card>
      </form>
    </>
  );
}
