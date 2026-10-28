"use client";

import { useEffect, useState } from "react";

import Link from "next/link";

import { useRouter } from "next/navigation";

type Order = {
  progress: number;
  blockers: { reason: string }[];
  eta_to: string | null;
  id: string;
  code: string;
  status: string;
  concern: string;
  version: number;
  customer_name: string;
  plate: string;
  make: string;
  model: string;
};

type Customer = { id: string; name: string; phone: string };

const statusLabel: Record<string, string> = {
  recepcion: "Recepción",
  diagnostico: "Diagnóstico",
  esperando_aprobacion: "Aprobación",
  reparacion: "Reparación",
  esperando_repuesto: "Repuesto",
  pausado: "Pausado",
  esperando_cliente: "Cliente",
  control_calidad: "Control de calidad",
  listo: "Listo",
  entregado: "Entregado",
  cancelado: "Cancelado",
};

export default function Admin() {
  const [ready, setReady] = useState(false),
    [orders, setOrders] = useState<Order[]>([]),
    [customers, setCustomers] = useState<Customer[]>([]),
    [error, setError] = useState(""),
    [share, setShare] = useState("");
  const [busy, setBusy] = useState(false);
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [authMode, setAuthMode] = useState("development");

  async function load() {
    const [o, c] = await Promise.all([
      fetch("/api/v1/admin/work-orders", { cache: "no-store" }),
      fetch("/api/v1/admin/customers", { cache: "no-store" }),
    ]);
    if (o.status === 401) {
      setReady(false);
      return;
    }
    const oj = await o.json(),
      cj = await c.json();
    setOrders(oj.workOrders ?? []);
    setCustomers(cj.customers ?? []);
    setReady(true);
  }

  useEffect(() => {
    void load().catch(() => setError("No se pudo conectar con el taller."));
    void fetch("/api/v1/admin/config")
      .then((r) => r.json())
      .then((j) => setAuthMode(j.authMode));
  }, []);

  async function loginCore(form: FormData) {
    setError("");
    const r = await fetch("/api/v1/admin/session", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: form.get("email") || undefined,
        password: form.get("password"),
      }),
    });
    if (!r.ok) {
      setError(
        "No se pudo iniciar sesión. Revisa tus datos de acceso o espera antes de reintentar.",
      );
      return;
    }
    await load();
  }

  async function createCore(form: FormData) {
    setError("");
    let customerId = String(form.get("customerId") ?? "");
    if (customerId === "new") {
      const c = await fetch("/api/v1/admin/customers", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: form.get("name"), phone: form.get("phone") }),
      });
      const cj = await c.json();
      if (!c.ok) {
        setError(cj.error);
        return;
      }
      customerId = cj.customer.id;
    }
    const r = await fetch("/api/v1/admin/work-orders", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        idempotencyKey: crypto.randomUUID(),
        customerId,
        concern: form.get("concern"),
        mileage: Number(form.get("mileage")) || undefined,
        vehicle: {
          plate: form.get("plate"),
          make: form.get("make"),
          model: form.get("model"),
          year: Number(form.get("year")) || undefined,
          mileage: Number(form.get("mileage")) || undefined,
        },
      }),
    });
    const j = await r.json();
    if (!r.ok) {
      setError(j.error);
      return;
    }
    await load();
  }

  async function createLinkCore(id: string) {
    const r = await fetch(`/api/v1/admin/work-orders/${id}/share`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ days: 14 }),
    });
    const j = await r.json();
    if (!r.ok) {
      setError(j.error);
      return;
    }
    setShare(j.url);
  }

  async function safely(run: () => Promise<void>) {
    if (busy) return;
    setBusy(true);
    try {
      await run();
    } catch {
      setError(
        "No se confirmó la respuesta del taller. Revisa la conexión y actualiza antes de repetir.",
      );
    } finally {
      setBusy(false);
    }
  }

  const login = (f: FormData) => safely(() => loginCore(f)),
    create = (f: FormData) => safely(() => createCore(f)),
    createLink = (id: string) => safely(() => createLinkCore(id));

  if (!ready)
    return (
      <main className="mx-auto max-w-xl px-5 py-16 text-ink">
        <a href="/" className="text-racing">
          CHAMBI MOTORS
        </a>
        <h1 className="mt-8 text-3xl font-bold">Acceso del taller</h1>
        <p className="mt-3 text-ink-muted">
          {authMode === "development"
            ? "Acceso local de desarrollo"
            : "Una cuenta administradora · Sin registro público"}
        </p>
        <form action={login} className="mt-8 space-y-4">
          {authMode === "supabase" && (
            <label className="block">
              Correo
              <input
                name="email"
                type="email"
                required
                autoComplete="username"
                className="mt-2 w-full rounded-lg border border-white/15 bg-graphite px-4 py-3"
              />
            </label>
          )}
          <label className="block">
            Clave
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              required
              className="mt-2 w-full rounded-lg border border-white/15 bg-graphite px-4 py-3"
            />
          </label>
          <button
            disabled={busy}
            className="rounded-lg bg-racing px-5 py-3 font-semibold text-black"
          >
            Ingresar
          </button>
        </form>
        {authMode === "supabase" && (
          <form
            action={async (f) => {
              await fetch("/api/v1/admin/session/recover", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: f.get("email") }),
              });
              setError("Si la cuenta está configurada recibirás instrucciones en tu correo.");
            }}
            className="mt-6 space-y-3"
          >
            <label className="block">
              Correo de recuperación
              <input
                name="email"
                type="email"
                required
                className="mt-2 w-full rounded-lg bg-graphite p-3"
              />
            </label>
            <button className="min-h-11 underline">Recuperar acceso</button>
          </form>
        )}
        {error && (
          <p role="alert" className="mt-4 text-red-300">
            {error}
          </p>
        )}
      </main>
    );

  return (
    <main className="mx-auto max-w-5xl px-5 py-8 text-ink">
      <header className="flex items-center justify-between">
        <div>
          <p className="text-sm text-racing">CHAMBI MOTORS · TALLER</p>
          <h1 className="mt-2 text-3xl font-bold">Órdenes de trabajo</h1>
        </div>
        <button
          onClick={async () => {
            await fetch("/api/v1/admin/session", { method: "DELETE" });
            router.refresh();
            setReady(false);
          }}
          className="rounded-lg border border-white/20 px-4 py-2"
        >
          Cerrar sesión
        </button>
      </header>
      <section className="mt-8 rounded-xl border border-white/10 bg-graphite p-5">
        <h2 className="text-xl font-semibold">Registrar ingreso</h2>
        <form action={create} className="mt-4 grid gap-3 sm:grid-cols-2">
          <select
            aria-label="Cliente"
            name="customerId"
            required
            className="rounded-lg bg-carbon px-3 py-3 sm:col-span-2"
          >
            <option value="">Selecciona un cliente</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} · {c.phone}
              </option>
            ))}
            <option value="new">Crear cliente nuevo</option>
          </select>
          <input
            name="name"
            placeholder="Nombre (si es nuevo)"
            aria-label="Nombre (si es nuevo)"
            className="rounded-lg bg-carbon px-3 py-3"
          />
          <input
            name="phone"
            placeholder="Celular peruano 9XXXXXXXX"
            aria-label="Celular peruano 9XXXXXXXX"
            className="rounded-lg bg-carbon px-3 py-3"
          />
          <input
            name="plate"
            placeholder="Placa"
            aria-label="Placa"
            required
            className="rounded-lg bg-carbon px-3 py-3"
          />
          <input
            name="make"
            placeholder="Marca"
            aria-label="Marca"
            required
            className="rounded-lg bg-carbon px-3 py-3"
          />
          <input
            name="model"
            placeholder="Modelo"
            aria-label="Modelo"
            required
            className="rounded-lg bg-carbon px-3 py-3"
          />
          <input
            name="year"
            type="number"
            placeholder="Año"
            aria-label="Año"
            className="rounded-lg bg-carbon px-3 py-3"
          />
          <input
            name="mileage"
            type="number"
            min="0"
            placeholder="Kilometraje"
            aria-label="Kilometraje"
            className="rounded-lg bg-carbon px-3 py-3"
          />
          <textarea
            name="concern"
            placeholder="Motivo de ingreso"
            aria-label="Motivo de ingreso"
            required
            className="min-h-24 rounded-lg bg-carbon px-3 py-3 sm:col-span-2"
          />
          <button
            disabled={busy}
            className="rounded-lg bg-racing px-5 py-3 font-semibold text-black sm:col-span-2"
          >
            Guardar orden
          </button>
        </form>
        {error && (
          <p role="alert" className="mt-3 text-red-300">
            {error}
          </p>
        )}
        {share && (
          <p className="mt-3 break-all">
            Enlace privado:{" "}
            <a className="text-racing underline" href={share}>
              {share}
            </a>
            <button
              className="ml-3 underline"
              onClick={() => void navigator.clipboard.writeText(share)}
            >
              Copiar
            </button>
          </p>
        )}
      </section>
      <section className="mt-6 grid grid-cols-3 gap-3 text-center">
        {[
          ["Activas", orders.filter((o) => !["entregado", "cancelado"].includes(o.status)).length],
          ["Bloqueadas", orders.filter((o) => o.blockers?.length).length],
          ["Listas", orders.filter((o) => o.status === "listo").length],
        ].map(([label, count]) => (
          <div className="rounded-xl bg-graphite p-4" key={label}>
            <p className="text-2xl font-semibold text-racing">{count}</p>
            <p className="text-sm">{label}</p>
          </div>
        ))}
      </section>
      <h2 className="mt-10 text-xl font-semibold">Órdenes recientes</h2>
      <label className="mt-4 block">
        Buscar placa, cliente u orden
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="mt-2 w-full rounded-lg bg-graphite p-3"
        />
      </label>
      <div className="mt-4 space-y-3">
        {orders
          .filter((o) =>
            `${o.plate} ${o.code} ${o.customer_name}`.toLowerCase().includes(search.toLowerCase()),
          )
          .map((o) => (
            <article
              key={o.id}
              className="flex flex-col gap-3 rounded-xl border border-white/10 bg-graphite p-4 sm:flex-row sm:items-center sm:justify-between"
            >
              <div>
                <Link
                  href={`/admin/orders/${o.id}`}
                  className="inline-flex min-h-11 items-center font-semibold text-racing underline"
                >
                  {o.code} · {o.plate}
                </Link>
                <p className="text-sm text-ink-muted">
                  {o.customer_name} · {o.make} {o.model}
                </p>
                <p className="mt-1 text-sm">
                  {statusLabel[o.status] ?? o.status} · {o.concern}
                </p>
                <p className="mt-2 text-sm text-ink-muted">
                  Tareas: {o.progress}%
                  {o.blockers?.length ? ` · ${o.blockers.length} bloqueo(s)` : ""}
                </p>
              </div>
              <button
                disabled={busy}
                onClick={() => void createLink(o.id)}
                className="min-h-11 rounded-lg border border-racing px-4 py-2 text-racing"
              >
                Generar enlace privado
              </button>
            </article>
          ))}
        {orders.length === 0 && <p className="text-ink-muted">Aún no hay órdenes registradas.</p>}
      </div>
    </main>
  );
}
