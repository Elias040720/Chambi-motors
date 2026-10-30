"use client";
import { useState } from "react";

const panel = "mx-auto max-w-xl rounded-2xl border border-white/10 bg-graphite p-5 text-ink sm:p-7";

export default function RecoveryView() {
  const [plate, setPlate] = useState("");
  const [requestId, setRequestId] = useState("");
  const [testCode, setTestCode] = useState("");
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function requestCode(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/v1/public/recovery/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plate }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "No se pudo iniciar la recuperación.");
      setRequestId(result.requestId);
      setTestCode(result.testCode ?? "");
      setMessage(result.message);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo iniciar la recuperación.");
    } finally {
      setBusy(false);
    }
  }

  async function verifyCode(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      const response = await fetch("/api/v1/public/recovery/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ requestId, code }),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error ?? "El código no es válido o venció.");
      window.location.assign(result.redirectTo);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo verificar el código.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen px-4 py-12 sm:px-6">
      <section className={panel}>
        <p className="text-sm font-semibold tracking-widest text-racing">CHAMBI MOTORS</p>
        <h1 className="mt-4 text-3xl font-bold">Recuperar seguimiento</h1>
        <p className="mt-3 text-ink-muted">
          Usaremos el teléfono verificado que el taller registró para esta orden. La placa por sí
          sola no da acceso al expediente.
        </p>
        {!requestId ? (
          <form onSubmit={requestCode} className="mt-7 space-y-4">
            <label className="block font-medium" htmlFor="plate">
              Placa del vehículo
            </label>
            <input
              id="plate"
              name="plate"
              autoComplete="off"
              maxLength={12}
              required
              value={plate}
              onChange={(event) => setPlate(event.target.value.toUpperCase())}
              className="min-h-12 w-full rounded-lg bg-carbon px-4"
            />
            <button
              disabled={busy}
              className="min-h-12 rounded-lg bg-racing px-5 font-semibold text-black disabled:opacity-60"
            >
              {busy ? "Procesando…" : "Continuar"}
            </button>
          </form>
        ) : (
          <form onSubmit={verifyCode} className="mt-7 space-y-4">
            <p className="text-ink-muted">
              Si la orden es elegible, el código se dirige al teléfono verificado.
            </p>
            {testCode && (
              <p className="rounded-lg border border-amber-400/50 p-3 text-amber-200" role="status">
                Código de prueba local: <strong>{testCode}</strong>. No se envió ningún mensaje.
              </p>
            )}
            <label className="block font-medium" htmlFor="code">
              Código de seis dígitos
            </label>
            <input
              id="code"
              name="code"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="[0-9]{6}"
              maxLength={6}
              required
              value={code}
              onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))}
              className="min-h-12 w-full rounded-lg bg-carbon px-4"
            />
            <button
              disabled={busy || code.length !== 6}
              className="min-h-12 rounded-lg bg-racing px-5 font-semibold text-black disabled:opacity-60"
            >
              {busy ? "Verificando…" : "Verificar y abrir seguimiento"}
            </button>
          </form>
        )}
        {message && (
          <p className="mt-5 rounded-lg border border-white/15 p-3" role="status">
            {message}
          </p>
        )}
        <p className="mt-6 text-sm text-ink-muted">
          ¿No tienes acceso al teléfono registrado? Comunícate directamente con el taller para
          verificar tu identidad.
        </p>
      </section>
    </main>
  );
}
