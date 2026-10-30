import { useEffect, useState } from "react";
import { Redirect } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import { Action, Busy, Card, Copy, Field, Notice, Screen, Title } from "../components/ui";
import { useSession } from "../lib/session";
import { useApiQuery } from "../lib/query";
import type { Config } from "../lib/types";

export default function SettingsScreen() {
  const { token, booting, request } = useSession();
  const query = useApiQuery<Config>("config", "/api/v1/admin/config");
  const client = useQueryClient();
  const [loaded, setLoaded] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [hours, setHours] = useState("");
  const [privacy, setPrivacy] = useState("");
  const [retention, setRetention] = useState("365");
  const [days, setDays] = useState("7");
  const [templates, setTemplates] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    if (!query.data || loaded) return;
    setName(query.data.business.name);
    setPhone(query.data.business.phone ?? "");
    setHours(query.data.business.hours ?? "");
    setPrivacy(query.data.business.privacyNotice ?? "");
    setRetention(String(query.data.business.retentionDays ?? 365));
    setDays(String(query.data.business.linkDays ?? 7));
    setTemplates(query.data.templates.join("\n"));
    setLoaded(true);
  }, [query.data, loaded]);
  async function save() {
    const taskTemplates = templates
      .split("\n")
      .map((value) => value.trim())
      .filter(Boolean);
    if (
      taskTemplates.length < 1 ||
      taskTemplates.length > 30 ||
      taskTemplates.some((value) => value.length < 3 || value.length > 200)
    ) {
      setMessage("Registra de 1 a 30 plantillas, una por línea, con 3 a 200 caracteres cada una.");
      return;
    }
    setBusy(true);
    setMessage("");
    try {
      await request("/api/v1/admin/config", {
        method: "PATCH",
        body: JSON.stringify({
          name,
          phone,
          hours,
          privacyNotice: privacy,
          retentionDays: Number(retention),
          linkDays: Number(days),
          templates: taskTemplates,
        }),
      });
      await client.invalidateQueries({ queryKey: ["config"] });
      setMessage("Datos del taller guardados.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo guardar");
    } finally {
      setBusy(false);
    }
  }
  if (!booting && !token) return <Redirect href="/" />;
  return (
    <Screen>
      <Title>Ajustes del taller</Title>
      <Copy muted>
        Registra únicamente datos reales del negocio. No publiques números ni direcciones de
        ejemplo.
      </Copy>
      {query.isError && (
        <Notice error text="Copia local. Actualiza la conexión antes de guardar ajustes." />
      )}
      {query.isPending && <Busy />}
      <Card>
        <Field label="Nombre del negocio" value={name} onChangeText={setName} />
        <Field
          label="Teléfono público del taller"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
        />
        <Field label="Horario del taller" value={hours} onChangeText={setHours} />
        <Field label="Aviso de privacidad" value={privacy} onChangeText={setPrivacy} multiline />
        <Field
          label="Plazo de retención en días"
          value={retention}
          onChangeText={setRetention}
          keyboardType="number-pad"
        />
        <Field
          label="Duración habitual de enlaces en días"
          value={days}
          onChangeText={setDays}
          keyboardType="number-pad"
        />
        <Field
          label="Plantillas de tareas, una por línea (máximo 30)"
          value={templates}
          onChangeText={setTemplates}
          multiline
        />
        <Copy muted>
          El plazo registrado debe corresponder a la política real del taller y a sus obligaciones
          de conservación. Consulta la guía de seguridad antes de usar datos personales reales.
        </Copy>
        <Action
          title={busy ? "Guardando…" : "Guardar ajustes"}
          disabled={busy || query.isError || !loaded}
          onPress={() => void save()}
        />
        <Notice text={message} />
      </Card>
      <Action
        title="Actualizar ajustes"
        secondary
        onPress={() => {
          void query.refetch();
        }}
      />
    </Screen>
  );
}
