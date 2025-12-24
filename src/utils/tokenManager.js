// utils/tokenManager.js
import CryptoJS from "crypto-js";

const SECRET_KEY = "p2g_token_key_2025";
const STORAGE_KEY = "accessToken";

// Guardar token cifrado
export function setToken(token) {
  // console.log("📝 Guardando token ORIGINAL en localStorage:", token);
  const encrypted = CryptoJS.AES.encrypt(token, SECRET_KEY).toString();
  // console.log("🔒 Token CIFRADO que se guardará:", encrypted);
  localStorage.setItem(STORAGE_KEY, encrypted);
}

// Obtener token cifrado sin descifrar
export function getEncryptedToken() {
  return localStorage.getItem(STORAGE_KEY);
}

// Obtener token descifrado
export function getToken() {
  const encrypted = localStorage.getItem(STORAGE_KEY);
  if (!encrypted) return null;

  try {
    const bytes = CryptoJS.AES.decrypt(encrypted, SECRET_KEY);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    // console.log("🔓 Token DESCIFRADO recuperado:", decrypted);
    return decrypted;
  } catch (error) {
    console.error("tokenManager error:", error);
    return null;
  }
}

// Eliminar token
export function removeToken() {
  // console.log("🗑️ Eliminando token de localStorage");
  localStorage.removeItem(STORAGE_KEY);
}

