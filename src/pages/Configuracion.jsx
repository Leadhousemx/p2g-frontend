// src/pages/Configuracion.jsx
import { useEffect, useMemo, useState } from "react";
import {
  Button, Input, Textarea, Label,
  Card, CardHeader, CardContent, CardFooter,
  Tabs, TabsList, TabsTrigger, TabsContent,
  Select
} from "@/components/ui";
import { Dialog, DialogContent } from "@/components/ui/dialog";

const ROLES = [
  { value: "administrador", label: "Administrador" },
  { value: "ventas", label: "Ventas" },
  { value: "operacion", label: "Operación" },
];

export default function Configuracion() {
  // ------- Estado Configuración General -------
  const [empresa, setEmpresa] = useState(() => {
    const raw = localStorage.getItem("cfg_empresa");
    return raw ? JSON.parse(raw) : {
      razonSocial: "", nombreComercial: "", direccion: "",
      rfc: "", email: "", telefono: "", sitioWeb: "",
      aviso: "", logoUrl: "", firmaUrl: ""
    };
  });
  const [logoFile, setLogoFile] = useState(null);
  const [firmaFile, setFirmaFile] = useState(null);
  const [previewLogo, setPreviewLogo] = useState(empresa.logoUrl || "");
  const [previewFirma, setPreviewFirma] = useState(empresa.firmaUrl || "");
  const [errorsGen, setErrorsGen] = useState({});

  // ------- Estado Usuarios -------
  const [usuarios, setUsuarios] = useState(() => {
    const raw = localStorage.getItem("cfg_usuarios");
    return raw ? JSON.parse(raw) : [
      { id: crypto.randomUUID(), nombre: "Alberto", apellido: "Martínez", email: "alberto@ejemplo.com", telefono: "9990001111", rol: "administrador" },
    ];
  });
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const editingUser = useMemo(() => usuarios.find(u => u.id === editingId) || null, [usuarios, editingId]);

  // ------- Helpers almacenamiento -------
  useEffect(() => { localStorage.setItem("cfg_empresa", JSON.stringify(empresa)); }, [empresa]);
  useEffect(() => { localStorage.setItem("cfg_usuarios", JSON.stringify(usuarios)); }, [usuarios]);

  // ------- Validación General -------
  const validateGeneral = () => {
    const e = {};
    if (empresa.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(empresa.email)) e.email = "Correo inválido";
    if (empresa.telefono && !/^[\d\s+\-()]{7,}$/.test(empresa.telefono)) e.telefono = "Teléfono inválido";
    if (empresa.rfc && empresa.rfc.length < 12) e.rfc = "RFC inválido";
    setErrorsGen(e);
    return Object.keys(e).length === 0;
  };

  // ------- Handlers General -------
  const onChangeEmpresa = (field, value) => {
    setEmpresa(prev => ({ ...prev, [field]: value }));
  };
  const onFileChange = (field, file, setPreview) => {
    if (!file) {
      onChangeEmpresa(field, "");
      setPreview("");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      onChangeEmpresa(field, reader.result); // guardamos base64 para demo
      setPreview(String(reader.result || ""));
    };
    reader.readAsDataURL(file);
  };
  const handleGuardarGeneral = (e) => {
    e.preventDefault();
    if (!validateGeneral()) return;
    alert("Configuración guardada");
  };

  // ------- Usuarios: crear/editar/eliminar -------
  const openCreate = () => { setEditingId(null); setDialogOpen(true); };
  const openEdit = (id) => { setEditingId(id); setDialogOpen(true); };
  const removeUser = (id) => setUsuarios(prev => prev.filter(u => u.id !== id));

  const handleSubmitUsuario = (payload) => {
    if (editingId) {
      setUsuarios(prev => prev.map(u => u.id === editingId ? { ...u, ...payload, id: editingId } : u));
    } else {
      setUsuarios(prev => [...prev, { id: crypto.randomUUID(), ...payload }]);
    }
    setDialogOpen(false);
  };

  return (
    <>
      <h1 className="text-2xl font-bold text-[#2563eb] mb-4">Configuración</h1>

      <Tabs defaultValue="general">
        <TabsList>
          <TabsTrigger value="general">Configuración general</TabsTrigger>
          <TabsTrigger value="usuarios">Usuarios del sistema</TabsTrigger>
        </TabsList>

        {/* --------- TAB GENERAL --------- */}
        <TabsContent value="general" className="mt-4">
          <form onSubmit={handleGuardarGeneral} className="space-y-4">
            <Card>
              <CardHeader>
                <h2 className="text-lg font-semibold">Datos de la empresa</h2>
              </CardHeader>
              <CardContent className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label>Razón social</Label>
                  <Input value={empresa.razonSocial} onChange={(e) => onChangeEmpresa("razonSocial", e.target.value)} placeholder="Ej. Servicios XYZ, S.A. de C.V." />
                </div>
                <div>
                  <Label>Nombre comercial</Label>
                  <Input value={empresa.nombreComercial} onChange={(e) => onChangeEmpresa("nombreComercial", e.target.value)} placeholder="Ej. Eventos XYZ" />
                </div>
                <div className="md:col-span-2">
                  <Label>Dirección completa</Label>
                  <Textarea value={empresa.direccion} onChange={(e) => onChangeEmpresa("direccion", e.target.value)} placeholder="Calle, número, colonia, ciudad, estado, CP" />
                </div>
                <div>
                  <Label>RFC</Label>
                  <Input value={empresa.rfc} onChange={(e) => onChangeEmpresa("rfc", e.target.value.toUpperCase())} placeholder="Ej. ABCD010101XYZ" aria-invalid={!!errorsGen.rfc} />
                  {errorsGen.rfc && <p className="text-red-600 text-sm mt-1">{errorsGen.rfc}</p>}
                </div>
                <div>
                  <Label>Correo electrónico</Label>
                  <Input type="email" value={empresa.email} onChange={(e) => onChangeEmpresa("email", e.target.value)} placeholder="correo@empresa.com" aria-invalid={!!errorsGen.email} />
                  {errorsGen.email && <p className="text-red-600 text-sm mt-1">{errorsGen.email}</p>}
                </div>
                <div>
                  <Label>Teléfono</Label>
                  <Input value={empresa.telefono} onChange={(e) => onChangeEmpresa("telefono", e.target.value)} placeholder="999-000-0000" aria-invalid={!!errorsGen.telefono} />
                  {errorsGen.telefono && <p className="text-red-600 text-sm mt-1">{errorsGen.telefono}</p>}
                </div>
                <div>
                  <Label>Sitio web</Label>
                  <Input value={empresa.sitioWeb} onChange={(e) => onChangeEmpresa("sitioWeb", e.target.value)} placeholder="https://www.empresa.com" />
                </div>
                <div>
                  <Label>Logo de la empresa</Label>
                  <Input type="file" accept="image/*"
                    onChange={(e) => { const f = e.target.files?.[0] || null; setLogoFile(f); onFileChange("logoUrl", f, setPreviewLogo); }} />
                  {previewLogo && <img src={previewLogo} alt="Logo" className="mt-2 h-16 object-contain" />}
                </div>
                <div>
                  <Label>Firma manuscrita</Label>
                  <Input type="file" accept="image/*"
                    onChange={(e) => { const f = e.target.files?.[0] || null; setFirmaFile(f); onFileChange("firmaUrl", f, setPreviewFirma); }} />
                  {previewFirma && <img src={previewFirma} alt="Firma" className="mt-2 h-16 object-contain" />}
                </div>
                <div className="md:col-span-2">
                  <Label>Aviso de privacidad</Label>
                  <Textarea value={empresa.aviso} onChange={(e) => onChangeEmpresa("aviso", e.target.value)} placeholder="Pega aquí el aviso de privacidad…" className="min-h-[120px]" />
                </div>
              </CardContent>
              <CardFooter className="justify-end">
                <Button type="submit">Guardar cambios</Button>
              </CardFooter>
            </Card>
          </form>
        </TabsContent>

        {/* --------- TAB USUARIOS --------- */}
        <TabsContent value="usuarios" className="mt-4">
          <Card>
            <CardHeader className="flex items-center justify-between">
              <h2 className="text-lg font-semibold">Usuarios del sistema</h2>
              <Button variant="outline" onClick={openCreate}>Crear usuario</Button>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <table className="min-w-full text-sm bg-white rounded-xl">
                <thead>
                  <tr className="bg-[#2563eb] text-white">
                    <th className="px-4 py-2 text-left">Nombre</th>
                    <th className="px-4 py-2 text-left">Correo</th>
                    <th className="px-4 py-2 text-left">Teléfono</th>
                    <th className="px-4 py-2 text-left">Rol</th>
                    <th className="px-4 py-2 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {usuarios.map(u => (
                    <tr key={u.id} className="border-b last:border-0">
                      <td className="px-4 py-2">{u.nombre} {u.apellido}</td>
                      <td className="px-4 py-2">{u.email}</td>
                      <td className="px-4 py-2">{u.telefono || "-"}</td>
                      <td className="px-4 py-2 capitalize">{u.rol}</td>
                      <td className="px-4 py-2 text-right space-x-2">
                        <Button variant="outline" onClick={() => openEdit(u.id)}>Editar</Button>
                        <Button variant="destructive" onClick={() => removeUser(u.id)}>Eliminar</Button>
                      </td>
                    </tr>
                  ))}
                  {usuarios.length === 0 && (
                    <tr><td className="px-4 py-6 text-gray-500" colSpan={5}>No hay usuarios</td></tr>
                  )}
                </tbody>
              </table>
            </CardContent>
          </Card>

          {/* Dialog Crear/Editar */}
          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogContent>
              <FormularioUsuario
                key={editingId || "nuevo"}
                initial={editingUser}
                onCancel={() => setDialogOpen(false)}
                onSubmit={handleSubmitUsuario}
              />
            </DialogContent>
          </Dialog>
        </TabsContent>
      </Tabs>
    </>
  );
}

/* ---------- Formulario Usuario (interno) ---------- */
function FormularioUsuario({ initial, onSubmit, onCancel }) {
  const [nombre, setNombre] = useState(initial?.nombre || "");
  const [apellido, setApellido] = useState(initial?.apellido || "");
  const [email, setEmail] = useState(initial?.email || "");
  const [telefono, setTelefono] = useState(initial?.telefono || "");
  const [rol, setRol] = useState(initial?.rol || "");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState({});

  const isEdit = !!initial;

  const validate = () => {
    const e = {};
    if (!nombre.trim()) e.nombre = "Nombre requerido";
    if (!apellido.trim()) e.apellido = "Apellido requerido";
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = "Correo inválido";
    if (!rol) e.rol = "Selecciona un rol";
    if (!isEdit) {
      if (!password) e.password = "Contraseña requerida";
      if (password !== confirm) e.confirm = "No coincide";
    } else if (password || confirm) {
      if (password !== confirm) e.confirm = "No coincide";
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    onSubmit({
      nombre, apellido, email, telefono, rol,
      ...(password ? { password } : {}),
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <h3 className="text-lg font-semibold">{isEdit ? "Editar usuario" : "Crear usuario"}</h3>
      <div className="grid md:grid-cols-2 gap-3">
        <div>
          <Label>Nombre</Label>
          <Input value={nombre} onChange={(e) => setNombre(e.target.value)} aria-invalid={!!errors.nombre}/>
          {errors.nombre && <p className="text-red-600 text-sm mt-1">{errors.nombre}</p>}
        </div>
        <div>
          <Label>Apellido</Label>
          <Input value={apellido} onChange={(e) => setApellido(e.target.value)} aria-invalid={!!errors.apellido}/>
          {errors.apellido && <p className="text-red-600 text-sm mt-1">{errors.apellido}</p>}
        </div>
        <div>
          <Label>Correo electrónico</Label>
          <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={!!errors.email}/>
          {errors.email && <p className="text-red-600 text-sm mt-1">{errors.email}</p>}
        </div>
        <div>
          <Label>Teléfono</Label>
          <Input value={telefono} onChange={(e) => setTelefono(e.target.value)} />
        </div>
        <div>
          <Label>Rol</Label>
          {/* Nuestro Select soporta <option> directamente */}
          <Select value={rol} onValueChange={setRol}>
            <option value="">Selecciona un rol</option>
            {ROLES.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
          </Select>
          {errors.rol && <p className="text-red-600 text-sm mt-1">{errors.rol}</p>}
        </div>
        <div>
          <Label>Contraseña {isEdit && <span className="text-gray-500">(opcional)</span>}</Label>
          <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} aria-invalid={!!errors.password}/>
          {errors.password && <p className="text-red-600 text-sm mt-1">{errors.password}</p>}
        </div>
        <div>
          <Label>Confirmar contraseña {isEdit && <span className="text-gray-500">(opcional)</span>}</Label>
          <Input type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} aria-invalid={!!errors.confirm}/>
          {errors.confirm && <p className="text-red-600 text-sm mt-1">{errors.confirm}</p>}
        </div>
      </div>

      <div className="flex items-center justify-end gap-2 pt-2">
        <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button type="submit">{isEdit ? "Guardar" : "Crear"}</Button>
      </div>
    </form>
  );
}
