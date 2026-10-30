import { useState } from "react";
import { Redirect } from "expo-router";
import * as SQLite from "expo-sqlite";
import * as SecureStore from "expo-secure-store";
import { Action, Card, Copy, Heading, Notice, Screen, Title } from "../components/ui";
import { pilotOffline } from "../lib/session";

const diagnosticKey = "chambi-device-diagnostic-v1";
const diagnosticDatabase = "chambi-device-diagnostic-v1.db";
const notRun = "NOT RUN · Sin ejecutar";

export default function Diagnostics() {
  const [busy, setBusy] = useState(false);
  const [sqliteResult, setSqliteResult] = useState(notRun);
  const [secureResult, setSecureResult] = useState(notRun);
  if (!pilotOffline) return <Redirect href="/" />;

  async function sqlite() {
    setBusy(true);
    setSqliteResult("Ejecutando…");
    let db: SQLite.SQLiteDatabase | undefined;
    let failure: unknown;
    try {
      const synthetic = `SYNTHETIC-DIAGNOSTIC-${Date.now()}`;
      db = await SQLite.openDatabaseAsync(diagnosticDatabase);
      await db.execAsync(
        "CREATE TABLE IF NOT EXISTS device_check (id INTEGER PRIMARY KEY, value TEXT NOT NULL)",
      );
      await db.runAsync("INSERT OR REPLACE INTO device_check(id,value) VALUES(1,?)", synthetic);
      const before = await db.getFirstAsync<{ value: string }>(
        "SELECT value FROM device_check WHERE id=1",
      );
      if (before?.value !== synthetic) throw new Error("La lectura inicial no coincide");
      await db.closeAsync();
      db = undefined;
      db = await SQLite.openDatabaseAsync(diagnosticDatabase);
      const reopened = await db.getFirstAsync<{ value: string }>(
        "SELECT value FROM device_check WHERE id=1",
      );
      if (reopened?.value !== synthetic) throw new Error("La lectura tras reabrir no coincide");
    } catch (error) {
      failure = error;
    } finally {
      try {
        if (!db) db = await SQLite.openDatabaseAsync(diagnosticDatabase);
        await db.execAsync("DROP TABLE IF EXISTS device_check");
        const remaining = await db.getFirstAsync(
          "SELECT name FROM sqlite_master WHERE type='table' AND name='device_check'",
        );
        if (remaining) throw new Error("No se confirmó la limpieza SQLite");
      } catch (error) {
        failure ??= error;
      }
      try {
        await db?.closeAsync();
      } catch (error) {
        failure ??= error;
      }
      setSqliteResult(
        failure
          ? `FAIL · ${message(failure)}`
          : "PASS · Escrito, leído, cerrado, reabierto y eliminado el registro sintético.",
      );
      setBusy(false);
    }
  }

  async function secure() {
    setBusy(true);
    setSecureResult("Ejecutando…");
    let failure: unknown;
    try {
      const synthetic = `SYNTHETIC-DIAGNOSTIC-${Date.now()}`;
      await SecureStore.setItemAsync(diagnosticKey, synthetic);
      if ((await SecureStore.getItemAsync(diagnosticKey)) !== synthetic)
        throw new Error("La lectura segura no coincide");
    } catch (error) {
      failure = error;
    } finally {
      try {
        await SecureStore.deleteItemAsync(diagnosticKey);
        if ((await SecureStore.getItemAsync(diagnosticKey)) !== null)
          throw new Error("No se confirmó la eliminación de la clave diagnóstica");
      } catch (error) {
        failure ??= error;
      }
      setSecureResult(
        failure
          ? `FAIL · ${message(failure)}`
          : "PASS · Clave sintética escrita, leída y eliminación verificada.",
      );
      setBusy(false);
    }
  }

  return (
    <Screen>
      <Title>Comprobar este dispositivo</Title>
      <Notice text="API: servidor pendiente. Red y acceso del taller deshabilitados en este piloto." />
      <Copy>
        Las pruebas solo empiezan al pulsar cada botón. Usan una base y una clave diagnósticas
        separadas de los datos del taller. Los resultados describen esta ejecución y se reinician al
        salir.
      </Copy>
      <Card>
        <Heading>SQLite: persistencia local</Heading>
        <Copy>{sqliteResult}</Copy>
        <Action
          title="Probar escritura, lectura y reapertura SQLite"
          disabled={busy}
          onPress={() => void sqlite()}
        />
      </Card>
      <Card>
        <Heading>Almacenamiento seguro</Heading>
        <Copy>{secureResult}</Copy>
        <Action
          title="Probar clave sintética de SecureStore"
          disabled={busy}
          onPress={() => void secure()}
        />
      </Card>
      <Copy muted>
        No se abre la cámara, no se leen fotos, contactos ni notas, y no se envían mensajes. Una
        prueba SQLite conserva únicamente su archivo de base vacío tras eliminar la tabla
        diagnóstica.
      </Copy>
    </Screen>
  );
}

function message(error: unknown) {
  return error instanceof Error ? error.message : "No se pudo completar o limpiar la prueba";
}
