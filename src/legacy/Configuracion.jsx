// LEGACY FILE: not referenced by current routes.
// Active settings screen: src/pages/Configuracion.tsx.
import { logger } from "../lib/logger";
// src/pages/Configuracion.jsx
import { useEffect, useMemo, useState } from "react";
import {
  Button, Input, Textarea, Label,
  Card, CardHeader, CardContent, CardFooter,
  Tabs, TabsList, TabsTrigger, TabsContent,
  Select
} from "@/components/ui";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { getEmpresaConfig, updateEmpresaConfig } from "../services/empresaService";
import { Loader2 } from "lucide-react";

const ROLES = [
  { value: "administrador", label: "Administrador" },
  { value: "ventas", label: "Ventas" },
  { value: "operacion", label: "Operación" },
];

export default function Configuracion() {
  // ------- Estado Configuración General -------
  const [empresa, setEmpresa] = useState({
    razonSocial: "", nombreComercial: "", direccion: "",
    rfc: "", email: "", telefono: "", sitioWeb: "",
    aviso: "", logoUrl: "", firmaUrl: "",
    colorPrimario: "#2563eb", colorSecundario: "#1e40af" // Colores por defecto
  });
  const [previewLogo, setPreviewLogo] = useState("");
  const [previewFirma, setPreviewFirma] = useState("");
  const [errorsGen, setErrorsGen] = useState({});
  const [loadingEmpresa, setLoadingEmpresa] = useState(true);
  const [savingEmpresa, setSavingEmpresa] = useState(false);

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

  // ------- Cargar configuración desde backend -------
  useEffect(() => {
    const loadEmpresaConfig = async () => {
      try {
        setLoadingEmpresa(true);
        const data = await getEmpresaConfig();

        // Actualizar estado con datos del backend (con fallback local si faltan imagenes)
        if (data) {
          const rawLocal = localStorage.getItem("cfg_empresa");
          const localData = rawLocal ? JSON.parse(rawLocal) : {};

          const mergedData = {
            razonSocial: data.razonSocial || "",
            nombreComercial: data.nombreComercial || "",
            direccion: data.direccion || "",
            rfc: data.rfc || "",
            email: data.email || "",
            telefono: data.telefono || "",
            sitioWeb: data.sitioWeb || "",
            aviso: data.aviso || "",
            logoUrl: data.logoUrl || localData.logoUrl || "",
            firmaUrl: data.firmaUrl || localData.firmaUrl || "",
            colorPrimario: data.colorPrimario || localData.colorPrimario || "#2563eb",
            colorSecundario: data.colorSecundario || localData.colorSecundario || "#1e40af"
          };

          setEmpresa(mergedData);

          // Actualizar previews de imágenes
          if (mergedData.logoUrl) {
            setPreviewLogo(mergedData.logoUrl);
          }
          if (mergedData.firmaUrl) {
            setPreviewFirma(mergedData.firmaUrl);
          }

          // También guardar en localStorage como backup
          localStorage.setItem("cfg_empresa", JSON.stringify(mergedData));
        }
      } catch (err) {
        logger.error("[Configuracion] Error cargando configuración", {
          status: err?.response?.status,
          message: err?.message,
        });
        // Si falla, intentar cargar desde localStorage
        const raw = localStorage.getItem("cfg_empresa");
        if (raw) {
          const localData = JSON.parse(raw);
          setEmpresa(localData);
          if (localData.logoUrl) {
            setPreviewLogo(localData.logoUrl);
          }
          if (localData.firmaUrl) {
            setPreviewFirma(localData.firmaUrl);
          }
        }
      } finally {
        setLoadingEmpresa(false);
      }
    };

    loadEmpresaConfig();
  }, []);

  // ------- Helpers almacenamiento -------
  useEffect(() => {
    const empresaToSave = JSON.stringify(empresa);
    localStorage.setItem("cfg_empresa", empresaToSave);
  }, [empresa]);
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

  // Función para extraer colores dominantes del logo
  const extractColorsFromImage = (img) => {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');

    // Redimensionar a tamaño pequeño para análisis rápido
    const size = 100;
    canvas.width = size;
    canvas.height = size;
    ctx.drawImage(img, 0, 0, size, size);

    const imageData = ctx.getImageData(0, 0, size, size);
    const pixels = imageData.data;
    const colorMap = {};

    // Analizar píxeles (cada 4 valores = 1 píxel: R, G, B, A)
    for (let i = 0; i < pixels.length; i += 4) {
      const r = pixels[i];
      const g = pixels[i + 1];
      const b = pixels[i + 2];
      const a = pixels[i + 3];

      // Ignorar píxeles transparentes y casi blancos/negros
      if (a < 128) continue;
      if (r > 240 && g > 240 && b > 240) continue; // muy blanco
      if (r < 15 && g < 15 && b < 15) continue; // muy negro

      // Agrupar colores similares (reducir precisión)
      const rBucket = Math.floor(r / 20) * 20;
      const gBucket = Math.floor(g / 20) * 20;
      const bBucket = Math.floor(b / 20) * 20;
      const colorKey = `${rBucket},${gBucket},${bBucket}`;

      colorMap[colorKey] = (colorMap[colorKey] || 0) + 1;
    }

    // Ordenar colores por frecuencia
    const sortedColors = Object.entries(colorMap)
      .sort((a, b) => b[1] - a[1])
      .map(([color]) => {
        const [r, g, b] = color.split(',').map(Number);
        return { r, g, b };
      });

    // Convertir a hex
    const rgbToHex = (r, g, b) => {
      return '#' + [r, g, b].map(x => {
        const hex = x.toString(16);
        return hex.length === 1 ? '0' + hex : hex;
      }).join('');
    };

    // Obtener color primario (más dominante)
    const primario = sortedColors[0] || { r: 37, g: 99, b: 235 };

    // Buscar color secundario (diferente al primario)
    let secundario = sortedColors[1] || { r: 30, g: 64, b: 175 };

    // Asegurar que el secundario sea suficientemente diferente
    for (let i = 1; i < sortedColors.length; i++) {
      const candidate = sortedColors[i];
      const diff = Math.abs(candidate.r - primario.r) +
                   Math.abs(candidate.g - primario.g) +
                   Math.abs(candidate.b - primario.b);

      if (diff > 100) { // Suficientemente diferente
        secundario = candidate;
        break;
      }
    }

    return {
      primario: rgbToHex(primario.r, primario.g, primario.b),
      secundario: rgbToHex(secundario.r, secundario.g, secundario.b)
    };
  };

  const onFileChange = (field, file, setPreview) => {
    if (!file) {
      onChangeEmpresa(field, "");
      setPreview("");
      return;
    }

    // Validar tamaño del archivo original
    const maxSize = field === "logoUrl" ? 5 * 1024 * 1024 : 3 * 1024 * 1024; // 5MB para logo, 3MB para firma (antes de optimizar)
    if (file.size > maxSize) {
      const maxSizeMB = field === "logoUrl" ? "5MB" : "3MB";
      alert(`❌ El archivo es demasiado grande. Tamaño máximo: ${maxSizeMB}`);
      return;
    }

    // Validar tipo de archivo
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png'];
    if (!validTypes.includes(file.type)) {
      alert("❌ Formato de archivo no válido. Por favor sube una imagen JPG o PNG.");
      return;
    }

    // Redimensionar y optimizar la imagen
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        // Dimensiones objetivo según el tipo de imagen
        // Para logos: usar dimensiones más pequeñas para mejor compresión
        const targetWidth = field === "logoUrl" ? 300 : 300;  // Reducido de 500 a 300 para logo
        const targetHeight = field === "logoUrl" ? 300 : 100;  // Reducido de 500 a 300 para logo

        // Calcular proporciones manteniendo aspect ratio
        let width = img.width;
        let height = img.height;
        const aspectRatio = width / height;

        if (width > targetWidth || height > targetHeight) {
          if (aspectRatio > targetWidth / targetHeight) {
            width = targetWidth;
            height = width / aspectRatio;
          } else {
            height = targetHeight;
            width = height * aspectRatio;
          }
        }

        // Crear canvas para redimensionar
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');

        // Fondo blanco si la imagen tiene transparencia y es JPG
        if (file.type === 'image/jpeg' || file.type === 'image/jpg') {
          ctx.fillStyle = '#FFFFFF';
          ctx.fillRect(0, 0, width, height);
        }

        // Dibujar imagen redimensionada
        ctx.drawImage(img, 0, 0, width, height);

        // Convertir a base64 con calidad optimizada
        // Para logos: usar 0.65 de calidad para reducir más el tamaño (necesario para jsPDF)
        // Para firmas: usar 0.75 de calidad
        const quality = field === "logoUrl" ? 0.65 : 0.75;
        const resizedBase64 = canvas.toDataURL(file.type, quality);

        // Guardar imagen optimizada
        onChangeEmpresa(field, resizedBase64);
        setPreview(resizedBase64);

        // Si es el logo, extraer colores corporativos
        if (field === "logoUrl") {
          const colors = extractColorsFromImage(img);
          onChangeEmpresa("colorPrimario", colors.primario);
          onChangeEmpresa("colorSecundario", colors.secundario);
        }
      };

      img.onerror = () => {
        alert("❌ Error al procesar la imagen. Por favor intenta con otra imagen.");
      };

      img.src = e.target.result;
    };

    reader.onerror = () => {
      alert("❌ Error al leer el archivo. Por favor intenta de nuevo.");
    };

    reader.readAsDataURL(file);
  };

  const handleGuardarGeneral = async (e) => {
    e.preventDefault();
    if (!validateGeneral()) return;

    setSavingEmpresa(true);
    try {
      await updateEmpresaConfig(empresa);

      // Guardar también en localStorage
      localStorage.setItem("cfg_empresa", JSON.stringify(empresa));

      alert("✅ Configuración guardada exitosamente");
    } catch (err) {
      logger.error("[Configuracion] Error al guardar configuración", {
        status: err?.response?.status,
        message: err?.message,
      });
      alert(`❌ Error al guardar la configuración: ${err.response?.data?.message || err.message}`);
    } finally {
      setSavingEmpresa(false);
    }
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
          {loadingEmpresa ? (
            <Card>
              <CardContent className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-[#2563eb]" />
                <span className="ml-3 text-gray-600">Cargando configuración...</span>
              </CardContent>
            </Card>
          ) : (
            <form onSubmit={handleGuardarGeneral} className="space-y-4">
              <Card>
                <CardHeader>
                  <h2 className="text-lg font-semibold">Datos de la empresa</h2>
                  <p className="text-sm text-gray-600">Esta información se utilizará en documentos oficiales como cotizaciones y facturas.</p>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Nota informativa sobre archivos */}
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                    <h3 className="text-sm font-semibold text-blue-900 mb-2">�️ Información sobre archivos de imagen</h3>
                    <ul className="text-xs text-blue-800 space-y-1">
                      <li>• <strong>Redimensionamiento automático:</strong> No te preocupes por el tamaño, el sistema ajustará automáticamente tus imágenes al tamaño óptimo.</li>
                      <li>• <strong>Logo:</strong> Se optimizará a 500x500px y se mostrará en cotizaciones con tamaño fijo de 40x20mm.</li>
                      <li>• <strong>Firma:</strong> Se optimizará a 300x100px para documentos oficiales.</li>
                      <li>• <strong>Calidad:</strong> Las imágenes se comprimen automáticamente manteniendo excelente calidad visual.</li>
                      <li>• <strong>Tip:</strong> Para mejores resultados, usa imágenes claras y con fondos transparentes (PNG).</li>
                    </ul>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
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
                  <Input type="file" accept="image/jpeg,image/png,image/jpg"
                    onChange={(e) => { const f = e.target.files?.[0] || null; onFileChange("logoUrl", f, setPreviewLogo); }} />
                  <p className="text-xs text-gray-500 mt-1">
                    🎨 Sube cualquier tamaño - se ajustará automáticamente a 500x500px | 📁 JPG o PNG | 📏 Máx: 5MB
                  </p>
                  {previewLogo && (
                    <div className="mt-2 p-2 border rounded bg-gray-50">
                      <p className="text-xs text-green-600 mb-1">✅ Imagen optimizada y lista</p>
                      <img src={previewLogo} alt="Logo" className="h-16 object-contain" />
                    </div>
                  )}
                </div>
                <div>
                  <Label>Firma manuscrita</Label>
                  <Input type="file" accept="image/jpeg,image/png,image/jpg"
                    onChange={(e) => { const f = e.target.files?.[0] || null; onFileChange("firmaUrl", f, setPreviewFirma); }} />
                  <p className="text-xs text-gray-500 mt-1">
                    🎨 Sube cualquier tamaño - se ajustará automáticamente a 300x100px | 📁 JPG o PNG | 📏 Máx: 3MB
                  </p>
                  {previewFirma && (
                    <div className="mt-2 p-2 border rounded bg-gray-50">
                      <p className="text-xs text-green-600 mb-1">✅ Imagen optimizada y lista</p>
                      <img src={previewFirma} alt="Firma" className="h-16 object-contain" />
                    </div>
                  )}
                </div>

                {/* Colores corporativos extraídos del logo */}
                <div className="md:col-span-2">
                  <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-200 rounded-lg p-4">
                    <h3 className="text-sm font-semibold text-purple-900 mb-3">🎨 Colores Corporativos (extraídos automáticamente del logo)</h3>
                    <div className="flex gap-6 items-center">
                      <div>
                        <p className="text-xs text-gray-600 mb-2">Color Primario</p>
                        <div className="flex items-center gap-3">
                          <div
                            className="w-16 h-16 rounded-lg border-2 border-gray-300 shadow-sm"
                            style={{ backgroundColor: empresa.colorPrimario }}
                          ></div>
                          <div>
                            <Input
                              type="color"
                              value={empresa.colorPrimario}
                              onChange={(e) => onChangeEmpresa("colorPrimario", e.target.value)}
                              className="w-20 h-10 cursor-pointer"
                            />
                            <p className="text-xs text-gray-500 mt-1">{empresa.colorPrimario}</p>
                          </div>
                        </div>
                      </div>

                      <div>
                        <p className="text-xs text-gray-600 mb-2">Color Secundario</p>
                        <div className="flex items-center gap-3">
                          <div
                            className="w-16 h-16 rounded-lg border-2 border-gray-300 shadow-sm"
                            style={{ backgroundColor: empresa.colorSecundario }}
                          ></div>
                          <div>
                            <Input
                              type="color"
                              value={empresa.colorSecundario}
                              onChange={(e) => onChangeEmpresa("colorSecundario", e.target.value)}
                              className="w-20 h-10 cursor-pointer"
                            />
                            <p className="text-xs text-gray-500 mt-1">{empresa.colorSecundario}</p>
                          </div>
                        </div>
                      </div>

                      <div className="flex-1">
                        <p className="text-xs text-purple-800">
                          <strong>💡 Tip:</strong> Estos colores se detectan automáticamente cuando subes el logo y se usarán en las cotizaciones PDF para darle un toque personalizado a tu marca. Puedes ajustarlos manualmente si lo deseas.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="md:col-span-2">
                  <Label>Aviso de privacidad</Label>
                  <Textarea value={empresa.aviso} onChange={(e) => onChangeEmpresa("aviso", e.target.value)} placeholder="Pega aquí el aviso de privacidad…" className="min-h-[120px]" />
                </div>
                </div>
              </CardContent>
              <CardFooter className="justify-end">
                <Button type="submit" disabled={savingEmpresa}>
                  {savingEmpresa ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Guardando...
                    </>
                  ) : (
                    "Guardar cambios"
                  )}
                </Button>
              </CardFooter>
            </Card>
          </form>
          )}
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
