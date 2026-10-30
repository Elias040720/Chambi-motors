import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import * as SecureStore from "expo-secure-store";
import Constants from "expo-constants";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { clearLocal } from "./storage";
import { assertApiEnabled, isDevicePilot } from "./build-config";

export const pilotOffline = isDevicePilot(Constants.expoConfig?.extra);
export const base = pilotOffline
  ? ""
  : (process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000").replace(/\/$/, "");
export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}
type Session = {
  token: string;
  booting: boolean;
  request: <T>(path: string, init?: RequestInit) => Promise<T>;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<string>;
};
const context = createContext<Session | undefined>(undefined);
const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false, staleTime: 15_000 } },
});
export function SessionProvider({ children }: { children: ReactNode }) {
  const [token, setToken] = useState("");
  const [booting, setBooting] = useState(true);
  useEffect(() => {
    if (pilotOffline) {
      setBooting(false);
      return;
    }
    void SecureStore.getItemAsync("admin-token")
      .then((value) => {
        if (value) setToken(value);
      })
      .catch(() => setToken(""))
      .finally(() => setBooting(false));
  }, []);
  async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
    assertApiEnabled(pilotOffline);
    if (!__DEV__ && !base.startsWith("https://"))
      throw new ApiError("Configura una URL HTTPS del taller para usar esta compilación.", 0);
    const controller = new AbortController();
    const cancel = () => controller.abort();
    if (init.signal?.aborted) controller.abort();
    else init.signal?.addEventListener("abort", cancel);
    const timeout = setTimeout(() => controller.abort(), 20_000);
    try {
      const form = init.body instanceof FormData;
      const response = await fetch(base + path, {
        ...init,
        signal: controller.signal,
        headers: {
          ...(!form ? { "Content-Type": "application/json" } : {}),
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...init.headers,
        },
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        if (response.status === 401 && token) {
          await SecureStore.deleteItemAsync("admin-token");
          setToken("");
          queryClient.clear();
        }
        throw new ApiError(body.error ?? "No se pudo completar la solicitud", response.status);
      }
      return body as T;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(
        "Sin respuesta del taller. El cambio no se confirmó; revisa la conexión y vuelve a intentar.",
        0,
      );
    } finally {
      clearTimeout(timeout);
      init.signal?.removeEventListener("abort", cancel);
    }
  }
  async function login(email: string, password: string) {
    const result = await request<{ token: string }>("/api/v1/admin/session/native", {
      method: "POST",
      body: JSON.stringify({ email: email.trim() || undefined, password }),
    });
    await SecureStore.setItemAsync("admin-token", result.token);
    setToken(result.token);
  }
  async function logout() {
    let message = "Sesión cerrada en este teléfono.";
    try {
      await request("/api/v1/admin/session", { method: "DELETE" });
    } catch {
      message =
        "Se cerró la sesión en este teléfono. Sin conexión no se pudo confirmar la revocación en el servidor.";
    }
    await queryClient.cancelQueries();
    try {
      await SecureStore.deleteItemAsync("admin-token");
    } catch {
      message +=
        " No se pudo eliminar la credencial del almacenamiento seguro; bloquea el teléfono y comprueba la revocación al recuperar conexión.";
    }
    queryClient.clear();
    setToken("");
    try {
      await clearLocal();
      message += " Borradores, fotos y caché eliminados.";
    } catch {
      message +=
        " No se pudo completar la limpieza local. Conserva el teléfono bloqueado hasta eliminar los datos de la app.";
    }
    return message;
  }
  return (
    <QueryClientProvider client={queryClient}>
      <context.Provider value={{ token, booting, request, login, logout }}>
        {children}
      </context.Provider>
    </QueryClientProvider>
  );
}
export function useSession() {
  const value = useContext(context);
  if (!value) throw new Error("SessionProvider requerido");
  return value;
}
