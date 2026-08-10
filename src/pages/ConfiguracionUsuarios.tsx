import { useEffect, useMemo, useState } from "react";
import { AlertCircle, AlertTriangle, Loader2, Send, UserPlus } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import ContentShell from "../components/common/ContentShell";
import ResponsiveDataList from "../components/common/ResponsiveDataList";
import MobileEntityCard from "../components/common/MobileEntityCard";
import AdminEntityActionsMenu from "../components/common/AdminEntityActionsMenu";
import { useAuth } from "../context/auth-context";
import {
  inviteUser,
  listInvitations,
  listUsers,
  resendInvitation,
  updateCompanyUserStatus,
} from "../services/companyRbacService";
import { canInviteUsers, isVentasRole } from "../utils/rolePermissions";
import { useToast } from "../components/ui/use-toast";
import { LoginBackground } from "../components/LoginBackground";

type CompanyUser = {
  id?: string;
  _id?: string;
  nombre?: string;
  email: string;
  role: "admin" | "ventas";
  status: "active" | "invited" | "disabled";
};

type Invitation = {
  id?: string;
  _id?: string;
  email: string;
  role: "admin" | "ventas";
  status: "pending" | "accepted" | "expired";
};

type ConfigUsersRow = {
  id: string;
  nombre: string;
  email: string;
  role: "admin" | "ventas";
  status: "active" | "invited" | "disabled";
  source: "user" | "invitation";
  displayName: string;
  roleLabel: string;
  statusLabel: string;
  statusClassName: string;
  actionLabel: string;
  isPendingInvitation: boolean;
  canToggleStatus: boolean;
};

function getRoleLabel(role: "admin" | "ventas") {
  return role === "admin" ? "Admin" : "Ventas";
}

function getStatusAppearance(status: "active" | "invited" | "disabled") {
  if (status === "active") {
    return {
      label: "active",
      className: "bg-green-50 text-green-700 border-green-200",
    };
  }

  if (status === "disabled") {
    return {
      label: "disabled",
      className: "bg-gray-100 text-gray-700 border-gray-200",
    };
  }

  return {
    label: "Invitación pendiente",
    className: "bg-amber-50 text-amber-700 border-amber-200",
  };
}

function normalizeConfigUsersRow(row: {
  id: string;
  nombre: string;
  email: string;
  role: "admin" | "ventas";
  status: "active" | "invited" | "disabled";
  source: "user" | "invitation";
}): ConfigUsersRow {
  const statusAppearance = getStatusAppearance(row.status);
  const isPendingInvitation = row.status === "invited";

  return {
    ...row,
    displayName: row.nombre || "-",
    roleLabel: getRoleLabel(row.role),
    statusLabel: statusAppearance.label,
    statusClassName: statusAppearance.className,
    actionLabel: isPendingInvitation
      ? "Reenviar invitación"
      : row.status === "disabled"
      ? "Habilitar usuario"
      : "Deshabilitar usuario",
    isPendingInvitation,
    canToggleStatus: row.source === "user" && !isPendingInvitation,
  };
}

export default function ConfiguracionUsuarios() {
  const navigate = useNavigate();
  const { user } = (useAuth() || {}) as { user?: any };
  const isVentas = isVentasRole(user);
  const canInvite = canInviteUsers(user);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [users, setUsers] = useState<CompanyUser[]>([]);
  const [invitations, setInvitations] = useState<Invitation[]>([]);

  const [openInvite, setOpenInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "ventas">("ventas");
  const [inviteLoading, setInviteLoading] = useState(false);
  const [inviteError, setInviteError] = useState("");
  const [inviteSuccess, setInviteSuccess] = useState("");
  const [inviteFieldErrors, setInviteFieldErrors] = useState<Record<string, string>>({});

  const [statusLoadingId, setStatusLoadingId] = useState<string | null>(null);
  const [resendLoadingId, setResendLoadingId] = useState<string | null>(null);
  const { toast } = useToast();

  // Visual-only: card entrance animation when dialog opens
  const [inviteMounted, setInviteMounted] = useState(false);
  useEffect(() => {
    if (openInvite) {
      const id = requestAnimationFrame(() => setInviteMounted(true));
      return () => cancelAnimationFrame(id);
    } else {
      setInviteMounted(false);
    }
  }, [openInvite]);

  const mapInviteField = (fieldPath?: string) => {
    const raw = String(fieldPath || "").trim();
    if (!raw) return null;

    const normalized = raw.toLowerCase();
    if (normalized === "email" || normalized.includes("usuario.email") || normalized.includes("inviteemail")) return "inviteEmail";
    if (normalized === "role" || normalized.includes("inviterole")) return "inviteRole";
    return null;
  };

  const parseStandardizedError = (err: any) => {
    const data = err?.response?.data;
    if (!data || data?.ok !== false || !data?.error) return null;

    const code = String(data?.error?.code || "");
    const message = String(data?.error?.message || "").trim();
    const field = data?.error?.field;
    const errors = Array.isArray(data?.error?.errors) ? data.error.errors : [];

    const mappedFieldErrors: Record<string, string> = {};

    const singleTarget = mapInviteField(field);
    if (singleTarget && message) {
      mappedFieldErrors[singleTarget] = message;
    }

    errors.forEach((item: any) => {
      const target = mapInviteField(item?.field);
      const targetMessage = String(item?.message || "").trim();
      if (target && targetMessage) {
        mappedFieldErrors[target] = targetMessage;
      }
    });

    return {
      code,
      message,
      fieldErrors: mappedFieldErrors,
      hasFieldInfo: Boolean(field) || errors.length > 0,
    };
  };

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [usersRes, invitationsRes] = await Promise.all([
        listUsers(),
        listInvitations().catch(() => ({ invitations: [] })),
      ]);

      const usersList = (usersRes?.users || usersRes || []) as CompanyUser[];
      const invitesList = (invitationsRes?.invitations || invitationsRes || []) as Invitation[];

      setUsers(Array.isArray(usersList) ? usersList : []);
      setInvitations(Array.isArray(invitesList) ? invitesList : []);
    } catch (err: any) {
      setError(err?.response?.data?.message || "No se pudieron cargar los usuarios");
      setUsers([]);
      setInvitations([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isVentas) {
      navigate("/configuracion", { replace: true });
      return;
    }
    loadData();
  }, [isVentas]);

  const tableRows = useMemo(() => {
    const baseUsers = users.map((u) => ({
      id: u.id || u._id || `${u.email}-${u.role}`,
      nombre: u.nombre || "-",
      email: u.email,
      role: u.role,
      status: u.status,
      source: "user" as const,
    }));

    const pendingInviteRows = invitations
      .filter((inv) => inv.status === "pending")
      .map((inv) => ({
        id: inv.id || inv._id || `${inv.email}-${inv.role}-pending`,
        nombre: "Invitación pendiente",
        email: inv.email,
        role: inv.role,
        status: "invited" as const,
        source: "invitation" as const,
      }))
      .filter((invRow) => !baseUsers.some((u) => u.email.toLowerCase() === invRow.email.toLowerCase()));

    return [...baseUsers, ...pendingInviteRows].map(normalizeConfigUsersRow);
  }, [users, invitations]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError("");
    setInviteSuccess("");
    setInviteFieldErrors({});

    if (!inviteEmail) {
      setInviteError("El email es obligatorio");
      setInviteFieldErrors({ inviteEmail: "El email es obligatorio" });
      return;
    }

    setInviteLoading(true);
    try {
      const result = await inviteUser({ email: inviteEmail, role: inviteRole });
      setInviteEmail("");
      setInviteRole("ventas");
      setInviteFieldErrors({});
      await loadData();

      if (result?.emailSent === false) {
        setInviteSuccess(
          "La invitación fue registrada, pero no se pudo enviar el correo. Puedes reenviarla desde la tabla cuando la configuración de correo esté disponible."
        );
      } else {
        setOpenInvite(false);
        setInviteSuccess("");
        toast({ title: "Invitación enviada correctamente." });
      }
    } catch (err: any) {
      const standardizedError = parseStandardizedError(err);

      if (standardizedError) {
        if (Object.keys(standardizedError.fieldErrors).length > 0) {
          setInviteFieldErrors(standardizedError.fieldErrors);
        }

        const message = standardizedError.message || "No se pudo enviar la invitación";
        setInviteError(message);

        if (!standardizedError.hasFieldInfo) {
          toast({ title: message, variant: "destructive" });
        }
        return;
      }

      const fallbackMessage = err?.response?.data?.message || err?.response?.data?.msg || "No se pudo enviar la invitación";
      setInviteError(fallbackMessage);
      toast({ title: fallbackMessage, variant: "destructive" });
    } finally {
      setInviteLoading(false);
    }
  };

  const handleToggleStatus = async (row: any) => {
    const userId = row?.id;
    if (!userId || row.source !== "user") return;
    const nextStatus = row.status === "disabled" ? "active" : "disabled";
    setStatusLoadingId(userId);
    try {
      await updateCompanyUserStatus(userId, nextStatus);
      await loadData();
    } catch {
    } finally {
      setStatusLoadingId(null);
    }
  };

  const handleResend = async (row: ConfigUsersRow) => {
    const invId = row.id;
    if (!invId || resendLoadingId) return;
    setResendLoadingId(invId);
    try {
      const result = await resendInvitation(invId);
      if (result?.emailSent === false) {
        toast({
          title: "La invitación sigue registrada, pero no se pudo enviar el correo.",
        });
      } else {
        toast({ title: "Invitación reenviada correctamente." });
      }
      await loadData();
    } catch (err: any) {
      const msg =
        err?.response?.data?.error?.message ||
        err?.response?.data?.message ||
        err?.response?.data?.msg ||
        "No se pudo reenviar la invitación";
      toast({ title: msg, variant: "destructive" });
    } finally {
      setResendLoadingId(null);
    }
  };

  const renderDesktop = () => (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-gray-50 border-b border-gray-200">
              <th className="px-4 py-3 text-left font-semibold text-gray-700">Nombre</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">Email</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">Rol</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">Estado</th>
              <th className="px-4 py-3 text-left font-semibold text-gray-700">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {tableRows.map((row) => (
              <tr key={row.id} className="border-b border-gray-100 last:border-b-0">
                <td className="px-4 py-3 text-[#111827] font-medium">{row.displayName}</td>
                <td className="px-4 py-3 text-[#111827]">{row.email}</td>
                <td className="px-4 py-3 text-[#111827]">{row.roleLabel}</td>
                <td className="px-4 py-3">
                  <span className={`inline-flex px-2 py-1 text-xs rounded-full border ${row.statusClassName}`}>
                    {row.statusLabel}
                  </span>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">{renderRowActions(row)}</div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderMobileItem = (row: ConfigUsersRow) => (
    <MobileEntityCard
      title={row.displayName}
      subtitle={row.email}
      meta={
        <span className={`inline-flex px-2 py-1 text-xs rounded-full border ${row.statusClassName}`}>
          {row.statusLabel}
        </span>
      }
      actions={row.isPendingInvitation ? null : renderRowActions(row)}
      className=""
    >
      <dl className="space-y-3 text-sm">
        <div className="flex items-start justify-between gap-3">
          <dt className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">Rol</dt>
          <dd className="text-right text-[#111827]">{row.roleLabel}</dd>
        </div>
        <div className="flex items-start justify-between gap-3">
          <dt className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">Tipo</dt>
          <dd className="text-right text-[#111827]">{row.source === "invitation" ? "Invitación" : "Usuario"}</dd>
        </div>
        {row.isPendingInvitation ? <div className="pt-1">{renderRowActions(row, "mobile")}</div> : null}
      </dl>
    </MobileEntityCard>
  );

  function renderRowActions(row: ConfigUsersRow, variant: "desktop" | "mobile" = "desktop") {
    if (row.isPendingInvitation) {
      const isResending = resendLoadingId === row.id;
      return (
        <button
          type="button"
          onClick={() => handleResend(row)}
          disabled={isResending || resendLoadingId !== null}
          title="Reenviar invitación"
          className={
            variant === "mobile"
              ? "w-full inline-flex items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-sm font-medium text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
              : "inline-flex items-center gap-1.5 rounded-lg border border-blue-200 bg-blue-50 px-3 py-1.5 text-xs font-medium text-blue-700 transition hover:bg-blue-100 disabled:cursor-not-allowed disabled:opacity-50"
          }
        >
          {isResending ? (
            <Loader2 size={13} className="animate-spin" />
          ) : (
            <Send size={13} />
          )}
          {isResending ? "Reenviando..." : row.actionLabel}
        </button>
      );
    }

    if (statusLoadingId === row.id || !row.canToggleStatus) {
      return (
        <button
          type="button"
          disabled
          className={
            variant === "mobile"
              ? "w-full rounded-xl border border-gray-200 px-3 py-2 text-sm text-[#111827] opacity-50"
              : "rounded-lg border border-gray-200 px-3 py-1.5 text-xs text-[#111827] opacity-50"
          }
        >
          {statusLoadingId === row.id ? "Actualizando..." : row.actionLabel}
        </button>
      );
    }

    return (
      <AdminEntityActionsMenu
        align="end"
        extraItems={[
          {
            key: `toggle-${row.id}`,
            label: row.actionLabel,
            onSelect: () => handleToggleStatus(row),
          },
        ]}
      />
    );
  }

  return (
    <ContentShell
      as="section"
      padding="responsive"
      className="mx-auto flex w-full max-w-6xl min-h-0 flex-1 flex-col bg-[#F4F6F9] py-4 sm:py-5"
    >
      <div className="mb-4 sm:mb-6">
        <div className="inline-flex w-full items-center gap-1 overflow-x-auto rounded-2xl bg-gray-100 p-1 sm:w-auto">
          <Link to="/configuracion" className="px-3 py-1.5 text-sm rounded-xl transition text-gray-600 hover:bg-white/60">
            Empresa
          </Link>
          <Link to="/configuracion/usuarios" className="px-3 py-1.5 text-sm rounded-xl transition bg-white shadow text-[#2563eb]">
            Usuarios
          </Link>
        </div>
      </div>

      <div className="mb-6 flex flex-col gap-4 rounded-3xl border border-gray-200 bg-white p-4 shadow-sm sm:p-5 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0 space-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-gray-900 sm:text-3xl">Configuración de Usuarios</h1>
          <p className="max-w-2xl text-sm text-gray-600 sm:text-[15px]">
            Gestiona usuarios e invitaciones de tu empresa desde una vista administrativa optimizada para desktop y mobile.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setOpenInvite(true)}
          disabled={!canInvite}
          className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-violet-600 hover:from-sky-400 hover:to-violet-500 active:scale-95 px-4 py-2.5 text-sm font-medium text-white transition-all duration-200 shadow-lg shadow-sky-500/20 disabled:opacity-50 disabled:cursor-not-allowed sm:w-auto"
        >
          <UserPlus size={16} /> Invitar usuario
        </button>
      </div>

      {error && (
        <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 mt-0.5" />
          <p className="text-red-700 text-sm">{error}</p>
        </div>
      )}

      <ResponsiveDataList
        items={tableRows}
        loading={loading}
        getItemKey={(row) => row.id}
        renderDesktop={renderDesktop}
        renderMobileItem={renderMobileItem}
        mobileBreakpoint="md"
        emptyMessage="No hay usuarios para mostrar"
        emptyView={undefined}
        mobileListClassName={undefined}
        desktopClassName={undefined}
      />

      {/* ── Pantalla de invitación — identidad visual Brentrix ─────────────── */}
      {openInvite && (
        <div
          className="fixed inset-0 z-50 overflow-hidden"
          onClick={() => setOpenInvite(false)}
        >
          <LoginBackground />

          <div className="relative z-10 flex min-h-full items-center justify-center px-4 py-10">
            <div
              className="relative w-full max-w-lg"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Outer ambient glow */}
              <div
                className="pointer-events-none absolute -inset-20 rounded-3xl"
                style={{ background: "rgba(48,18,165,0.07)", filter: "blur(96px)" }}
              />

              {/* Inner ambient glow */}
              <div
                className="pointer-events-none absolute -inset-8 rounded-3xl"
                style={{ background: "rgba(62,30,190,0.13)", filter: "blur(60px)" }}
              />

              {/* Glass card */}
              <div
                className={`relative z-10 rounded-3xl border border-white/[0.20] backdrop-blur-2xl p-8 sm:p-10 transition-all duration-500 ease-out transform ${
                  inviteMounted ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
                }`}
                style={{
                  background:
                    "linear-gradient(to bottom, rgba(255,255,255,0.11) 0%, rgba(255,255,255,0.034) 100%)",
                  boxShadow:
                    "0 0 0 1px rgba(255,255,255,0.14) inset, " +
                    "0 48px 96px rgba(0,0,0,0.65), " +
                    "0 0 72px rgba(55,25,175,0.14)",
                }}
              >
                {/* Header */}
                <h2 className="text-2xl font-extrabold text-white tracking-tight mb-1">
                  Invitar usuario
                </h2>
                <p className="text-sm text-white/60 mb-8">
                  Envía una invitación y asigna el rol inicial sin salir del módulo de configuración.
                </p>

                <form className="space-y-5" onSubmit={handleInvite}>
                  {/* Email */}
                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-1.5">
                      Email *
                    </label>
                    <input
                      type="email"
                      value={inviteEmail}
                      onChange={(e) => {
                        setInviteEmail(e.target.value);
                        setInviteFieldErrors((prev) => ({ ...prev, inviteEmail: "" }));
                      }}
                      className={`w-full h-11 rounded-lg bg-white/90 text-slate-900 placeholder:text-slate-400 px-4 border transition-all duration-200 focus:outline-none font-medium text-sm ${
                        inviteFieldErrors.inviteEmail
                          ? "border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-500/30"
                          : "border-white/20 focus:border-sky-400 focus:ring-2 focus:ring-sky-400/30 hover:border-white/40"
                      }`}
                      placeholder="usuario@empresa.com"
                    />
                    <p className="text-xs text-white/40 mt-1.5">
                      Usa el correo corporativo o personal que recibirá la invitación de acceso.
                    </p>
                    {inviteFieldErrors.inviteEmail && (
                      <p className="text-red-300 text-xs mt-1 font-medium">{inviteFieldErrors.inviteEmail}</p>
                    )}
                  </div>

                  {/* Rol */}
                  <div>
                    <label className="block text-sm font-medium text-white/70 mb-1.5">
                      Rol *
                    </label>
                    <select
                      value={inviteRole}
                      onChange={(e) => {
                        setInviteRole(e.target.value as "admin" | "ventas");
                        setInviteFieldErrors((prev) => ({ ...prev, inviteRole: "" }));
                      }}
                      className={`w-full h-11 rounded-lg bg-white/90 text-slate-900 px-4 border transition-all duration-200 focus:outline-none font-medium text-sm ${
                        inviteFieldErrors.inviteRole
                          ? "border-red-400 focus:border-red-500 focus:ring-2 focus:ring-red-500/30"
                          : "border-white/20 focus:border-sky-400 focus:ring-2 focus:ring-sky-400/30 hover:border-white/40"
                      }`}
                    >
                      <option value="admin">Admin</option>
                      <option value="ventas">Ventas</option>
                    </select>
                    {inviteFieldErrors.inviteRole && (
                      <p className="text-red-300 text-xs mt-1 font-medium">{inviteFieldErrors.inviteRole}</p>
                    )}
                  </div>

                  {/* Error general */}
                  {inviteError && (
                    <div className="p-4 rounded-lg bg-red-500/20 border border-red-500/40 text-red-200 text-sm font-medium">
                      {inviteError}
                    </div>
                  )}

                  {/* Advertencia emailSent=false */}
                  {inviteSuccess && (
                    <div className="flex items-start gap-3 p-4 rounded-lg bg-amber-500/20 border border-amber-400/40 text-amber-200 text-sm">
                      <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-400" />
                      <span>{inviteSuccess}</span>
                    </div>
                  )}

                  {/* Acciones */}
                  <div className="flex flex-col-reverse gap-2 pt-1 sm:flex-row sm:justify-end">
                    <button
                      type="button"
                      onClick={() => setOpenInvite(false)}
                      className="inline-flex w-full items-center justify-center rounded-lg border border-white/20 px-4 py-2.5 text-sm font-medium text-white/70 transition hover:bg-white/10 sm:w-auto"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={inviteLoading}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white bg-gradient-to-r from-sky-500 to-violet-600 hover:from-sky-400 hover:to-violet-500 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 shadow-lg shadow-sky-500/20 sm:w-auto"
                    >
                      {inviteLoading && <Loader2 className="h-4 w-4 animate-spin" />}
                      Enviar invitación
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </ContentShell>
  );
}
