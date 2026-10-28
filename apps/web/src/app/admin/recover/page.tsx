"use client";
import { useEffect, useState } from "react";
export default function Recover() {
  const [token, setToken] = useState(""),
    [message, setMessage] = useState("");
  useEffect(() => {
    const p = new URLSearchParams(window.location.hash.slice(1));
    setToken(p.get("access_token") ?? "");
    window.history.replaceState(null, "", "/admin/recover");
  }, []);
  async function reset(f: FormData) {
    const r = await fetch("/api/v1/admin/session/reset", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ accessToken: token, password: f.get("password") }),
    });
    setMessage(
      r.ok
        ? "Clave actualizada. Inicia sesión nuevamente."
        : "Enlace vencido o clave no válida; solicita otro enlace.",
    );
    if (r.ok) setToken("");
  }
  return (
    <main className="mx-auto max-w-xl space-y-5 p-8 text-ink">
      <h1 className="text-3xl font-bold">Recuperar acceso</h1>
      {token ? (
        <form action={reset} className="space-y-4">
          <label className="block">
            Nueva clave
            <input
              name="password"
              type="password"
              minLength={12}
              required
              autoComplete="new-password"
              className="mt-2 w-full rounded-lg bg-graphite p-3"
            />
          </label>
          <button className="rounded-lg bg-racing p-3 text-black">Guardar nueva clave</button>
        </form>
      ) : (
        <p>{message || "Abre el enlace de recuperación recibido en tu correo."}</p>
      )}
      <p role="status">{token && message}</p>
      <a className="text-racing underline" href="/admin">
        Volver al acceso
      </a>
    </main>
  );
}
