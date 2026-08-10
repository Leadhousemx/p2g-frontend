import { api } from "../lib/api";

export interface Usuario {
  _id: string;
  nombre: string;
  apellidos?: string;
  email: string;
  telefono?: string;
  rol: string;
  empresaId: string;
  createdAt: string;
  updatedAt: string;
}

export interface UpdateUsuarioPayload {
  nombre?: string;
  apellidos?: string;
  telefono?: string;
  email?: string;
}

export interface ChangePasswordPayload {
  passwordActual: string;
  passwordNuevo: string;
}

/**
 * Obtener perfil del usuario actual
 */
export const getMyProfile = async (): Promise<Usuario> => {
  const response = await api.get("/usuarios/me");
  return response.data;
};

/**
 * Actualizar perfil del usuario actual
 */
export const updateMyProfile = async (payload: UpdateUsuarioPayload): Promise<Usuario> => {
  const response = await api.put("/usuarios/me", payload);
  return response.data;
};

/**
 * Cambiar contraseña del usuario actual
 */
export const changePassword = async (payload: ChangePasswordPayload): Promise<{ message: string }> => {
  const response = await api.put("/usuarios/me/password", payload);
  return response.data;
};
