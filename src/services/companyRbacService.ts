import { api } from "../lib/api";

export const REGISTER_COMPANY_PATH =
  import.meta.env.VITE_AUTH_REGISTER_COMPANY_PATH || "/auth/register-company";

export const ACCEPT_INVITE_PATH =
  import.meta.env.VITE_AUTH_ACCEPT_INVITE_PATH || "/auth/accept-invite";

export interface RegisterCompanyPayload {
  empresa: {
    razonSocial: string;
    nombreComercial: string;
    direccion: string;
    telefono: string;
    rfc?: string;
    email?: string;
    sitioWeb?: string;
  };
  usuario: {
    nombre: string;
    email: string;
    whatsapp?: string;
    password: string;
  };
}

export interface InviteUserPayload {
  email: string;
  role: "admin" | "ventas";
}

export interface AcceptInvitePayload {
  token: string;
  nombre: string;
  whatsapp?: string;
  password: string;
}

export const registerCompany = async (payload: RegisterCompanyPayload) => {
  const companyPayload = payload;
  const legacyPayload = {
    name: payload?.usuario?.nombre,
    email: payload?.usuario?.email,
    telefono: payload?.usuario?.whatsapp || payload?.empresa?.telefono,
    password: payload?.usuario?.password,
  };

  const modernRoutes = [REGISTER_COMPANY_PATH, "/auth/register-company"];

  for (const route of modernRoutes) {
    try {
      const response = await api.post(route, companyPayload);
      return response.data;
    } catch (error: any) {
      const status = Number(error?.response?.status || 0);
      const shouldFallback =
        status === 404 ||
        status === 403 ||
        status === 405 ||
        status === 500 ||
        status === 502 ||
        status === 503;
      if (!shouldFallback) {
        throw error;
      }
    }
  }

  const legacyResponse = await api.post("/auth/register", legacyPayload);
  return legacyResponse.data;
};

export const inviteUser = async (payload: InviteUserPayload) => {
  const response = await api.post("/company/users/invite", payload);
  return response.data;
};

export const acceptInvite = async (payload: AcceptInvitePayload) => {
  const response = await api.post(ACCEPT_INVITE_PATH, payload);
  return response.data;
};

export const listUsers = async (params?: { role?: string; status?: string }) => {
  const response = await api.get("/company/users", { params });
  return response.data;
};

export const listInvitations = async () => {
  const response = await api.get("/company/invitations");
  return response.data;
};

export const updateCompanyUserStatus = async (
  userId: string,
  status: "active" | "disabled"
) => {
  const response = await api.patch(`/company/users/${userId}/status`, { status });
  return response.data;
};

export const resendInvitation = async (invitationId: string) => {
  const response = await api.post(`/company/invitations/${invitationId}/resend`, {});
  return response.data;
};

export const getInvitationPreview = async (token: string) => {
  const response = await api.get(`/auth/invitations/${token}`);
  return response.data;
};
