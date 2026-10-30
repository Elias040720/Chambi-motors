"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  type ReactNode,
} from "react";
import { DEMO_PLATE, SEED_VEHICLES } from "@/lib/data";
import type {
  LiveEvent,
  PartResolutionMode,
  Vehicle,
} from "@/lib/types";
import { clamp, clockLabel, normalizePlate, uid } from "@/lib/utils";

/* ────────────────────────────────────────────────────────────
   Estado compartido del taller.
   Simula el bus de WebSockets: cualquier acción del "mecánico" o
   del "cliente" actualiza al instante todas las vistas montadas.
   ──────────────────────────────────────────────────────────── */

interface State {
  vehicles: Record<string, Vehicle>;
  activePlate: string;
}

type Action =
  | { type: "select"; plate: string }
  | { type: "startReview"; plate: string }
  | { type: "requestPart"; plate: string }
  | { type: "startRepair"; plate: string }
  | { type: "finish"; plate: string }
  | { type: "resolvePart"; plate: string; mode: PartResolutionMode }
  | { type: "tick" }
  | { type: "reset"; plate: string };

const seedMap = (): Record<string, Vehicle> =>
  Object.fromEntries(
    SEED_VEHICLES.map((v) => [v.plate, structuredClone(v)] as const),
  );

const initialState: State = { vehicles: seedMap(), activePlate: DEMO_PLATE };

const withEvent = (
  v: Vehicle,
  e: Omit<LiveEvent, "id" | "time">,
): LiveEvent[] => [{ ...e, id: uid("ev"), time: clockLabel() }, ...v.events].slice(0, 8);

const hasPendingPart = (v: Vehicle) => !!v.part && v.part.resolution === null;

function update(state: State, plate: string, fn: (v: Vehicle) => Vehicle): State {
  const current = state.vehicles[plate];
  if (!current) return state;
  const next = fn(current);
  return {
    ...state,
    vehicles: { ...state.vehicles, [plate]: { ...next, syncTick: current.syncTick + 1 } },
  };
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "select":
      return state.vehicles[action.plate]
        ? { ...state, activePlate: action.plate }
        : state;

    case "startReview":
      return update(state, action.plate, (v) => ({
        ...v,
        status: "diagnostico",
        progress: Math.min(v.progress, 15),
        events: withEvent(v, {
          tone: "info",
          title: "Revisión iniciada",
          detail: `${v.mechanic.name.split(" ")[0]} inspecciona tu ${v.model}.`,
          source: "mecanico",
        }),
      }));

    case "requestPart":
      return update(state, action.plate, (v) => {
        if (hasPendingPart(v)) return v;
        return {
          ...v,
          status: "esperando_repuesto",
          part: { ...v.partTemplate, id: uid("part"), resolution: null },
          events: withEvent(v, {
            tone: "alert",
            title: "Falta un repuesto",
            detail: `${v.partTemplate.name.split("(")[0]?.trim()}: elige cómo conseguirlo.`,
            source: "mecanico",
          }),
        };
      });

    case "startRepair":
      return update(state, action.plate, (v) => {
        if (hasPendingPart(v)) return v;
        return {
          ...v,
          status: "reparacion",
          progress: v.status === "listo" ? 55 : Math.max(v.progress, 45),
          events: withEvent(v, {
            tone: "progress",
            title: "Reparación en curso",
            detail: `${v.mechanic.name.split(" ")[0]} trabaja en tu vehículo ahora.`,
            source: "mecanico",
          }),
        };
      });

    case "finish":
      return update(state, action.plate, (v) => {
        if (hasPendingPart(v)) return v;
        return {
          ...v,
          status: "listo",
          progress: 100,
          eta: "Listo ahora",
          events: withEvent(v, {
            tone: "success",
            title: "¡Tu vehículo está listo!",
            detail: "Ya puedes recogerlo. Resumen del servicio enviado.",
            source: "mecanico",
          }),
        };
      });

    case "resolvePart":
      return update(state, action.plate, (v) => {
        if (!v.part || v.part.resolution) return v;
        const byClient = action.mode === "client";
        return {
          ...v,
          status: "reparacion",
          progress: clamp(Math.max(v.progress, 40) + 8, 0, 92),
          part: {
            ...v.part,
            resolution: { mode: action.mode, time: clockLabel() },
          },
          events: withEvent(v, {
            tone: "success",
            title: byClient ? "Cliente traerá el repuesto" : "Compra autorizada",
            detail: byClient
              ? `Entrega estimada: ${v.part.clientDeadline.toLowerCase()}`
              : `Chambi Motors compra el repuesto. ${v.part.chambiEta}.`,
            source: "cliente",
          }),
        };
      });

    case "tick": {
      let changed = false;
      const vehicles: Record<string, Vehicle> = {};
      for (const [plate, v] of Object.entries(state.vehicles)) {
        if (v.status === "reparacion" && v.progress < 92) {
          changed = true;
          vehicles[plate] = { ...v, progress: v.progress + 1 };
        } else vehicles[plate] = v;
      }
      return changed ? { ...state, vehicles } : state;
    }

    case "reset": {
      const seed = SEED_VEHICLES.find((v) => v.plate === action.plate);
      if (!seed) return state;
      const current = state.vehicles[action.plate];
      return {
        ...state,
        vehicles: {
          ...state.vehicles,
          [action.plate]: {
            ...structuredClone(seed),
            syncTick: (current?.syncTick ?? 0) + 1,
          },
        },
      };
    }
  }
}

interface WorkshopContextValue {
  vehicles: Vehicle[];
  active: Vehicle;
  selectPlate: (plate: string) => void;
  findByPlate: (raw: string) => Vehicle | undefined;
  startReview: () => void;
  requestPart: () => void;
  startRepair: () => void;
  finish: () => void;
  resolvePart: (mode: PartResolutionMode) => void;
  reset: () => void;
}

const WorkshopContext = createContext<WorkshopContextValue | null>(null);

export function WorkshopProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, initialState);

  // Avance "vivo" lento mientras hay reparaciones activas.
  useEffect(() => {
    const id = window.setInterval(() => dispatch({ type: "tick" }), 7000);
    return () => window.clearInterval(id);
  }, []);

  const plate = state.activePlate;

  const findByPlate = useCallback(
    (raw: string) => {
      const n = normalizePlate(raw);
      return Object.values(state.vehicles).find(
        (v) => normalizePlate(v.plate) === n,
      );
    },
    [state.vehicles],
  );

  const value = useMemo<WorkshopContextValue>(() => {
    const active = state.vehicles[plate] ?? Object.values(state.vehicles)[0]!;
    return {
      vehicles: Object.values(state.vehicles),
      active,
      selectPlate: (p) => dispatch({ type: "select", plate: p }),
      findByPlate,
      startReview: () => dispatch({ type: "startReview", plate: active.plate }),
      requestPart: () => dispatch({ type: "requestPart", plate: active.plate }),
      startRepair: () => dispatch({ type: "startRepair", plate: active.plate }),
      finish: () => dispatch({ type: "finish", plate: active.plate }),
      resolvePart: (mode) =>
        dispatch({ type: "resolvePart", plate: active.plate, mode }),
      reset: () => dispatch({ type: "reset", plate: active.plate }),
    };
  }, [state.vehicles, plate, findByPlate]);

  return (
    <WorkshopContext.Provider value={value}>{children}</WorkshopContext.Provider>
  );
}

export function useWorkshop(): WorkshopContextValue {
  const ctx = useContext(WorkshopContext);
  if (!ctx) throw new Error("useWorkshop debe usarse dentro de <WorkshopProvider>");
  return ctx;
}

export const pendingPart = (v: Vehicle) =>
  v.part && v.part.resolution === null ? v.part : null;
