// src/pages/PerfilUsuario.jsx
import { useState } from "react";
import { Button, Input, Label, Card, CardHeader, CardContent, CardFooter, Textarea } from "@/components/ui";
import { useAuth } from "@/context/auth-context";

export default function PerfilUsuario() {
  const auth = useAuth();
  const current = auth?.session || {};
  const [nombre, setNombre] = useState(current?.nombre || "");
  const [apellido, setApellido] = useState(current?.apellido || "");
  const [email, setEmail] = useState(current?.email || "");
  const [telefono, setTelefono] = useState(current?.telefono || "");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};
    if (!nombre.trim()) e.nombre = "Nombre requerido";
    if (!apellido.trim()) e.apellido = "Apellido requerido";
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = "Correo inválido";
    if (password || confirm) {
      if (password !== confirm) e.confirm = "No coincide";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    const patch = { nombre, apellido, email, telefono };
    if (password) patch.password = password;
    if (typeof auth?.setSession === "function") {
      auth.setSession({ ...(auth.session || {}), ...patch });
    }
    alert("Perfil actualizado");
  };

  return (
    <>
      <h1 className="text-2xl font-bold text-[#2563eb] mb-4">Mi perfil</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <Card>
          <CardHeader>
            <h2 className="text-lg font-semibold">Datos de usuario</h2>
          </CardHeader>
          <CardContent className="grid md:grid-cols-2 gap-4">
            <div>
              <Label>Nombre</Label>
              <Input value={nombre} onChange={(e) => setNombre(e.target.value)} aria-invalid={!!errors.nombre} />
              {errors.nombre && <p className="text-red-600 text-sm mt-1">{errors.nombre}</p>}
            </div>
            <div>
              <Label>Apellido</Label>
              <Input value={apellido} onChange={(e) => setApellido(e.target.value)} aria-invalid={!!errors.apellido} />
              {errors.apellido && <p className="text-red-600 text-sm mt-1">{errors.apellido}</p>}
            </div>
            <div>
              <Label>Correo electrónico</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={!!errors.email} />
              {errors.email && <p className="text-red-600 text-sm mt-1">{errors.email}</p>}
            </div>
            <div>
              <Label>Teléfono</Label>
              <Input value={telefono} onChange={(e) => setTelefono(e.target.value)} />
            </div>
            <div>
              <Label>Contraseña (opcional)</Label>
              <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <div>
              <Label>Confirmar contraseña (opcional)</Label>
              <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} aria-invalid={!!errors.confirm} />
              {errors.confirm && <p className="text-red-600 text-sm mt-1">{errors.confirm}</p>}
            </div>
          </CardContent>
          <CardFooter className="justify-end">
            <Button type="submit">Guardar cambios</Button>
          </CardFooter>
        </Card>
      </form>
    </>
  );
}
