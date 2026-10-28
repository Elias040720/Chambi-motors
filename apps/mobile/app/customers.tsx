import { useState } from "react";
import { Alert } from "react-native";
import { Redirect } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import {
  Action,
  Busy,
  Card,
  Choice,
  Copy,
  Field,
  Heading,
  Notice,
  Screen,
  Title,
} from "../components/ui";
import { useSession } from "../lib/session";
import { useApiQuery } from "../lib/query";
import type { Customer, Order } from "../lib/types";
import { date, statusNames } from "../lib/types";

type Profile = Customer & {
  contact_preference?: string;
  vehicles?: { id: string; plate: string; make: string; model: string; year?: number }[];
  history?: Order[];
};
export default function Customers() {
  const { token, booting, request } = useSession();
  const query = useApiQuery<{ customers: Profile[] }>("customers", "/api/v1/admin/customers");
  const client = useQueryClient();
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Profile>();
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [preference, setPreference] = useState("whatsapp");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  function edit(customer: Profile) {
    setSelected(customer);
    setName(customer.name);
    setPhone(customer.phone);
    setEmail(customer.email ?? "");
    setPreference(customer.contact_preference ?? "whatsapp");
    setMessage("");
  }
  async function save() {
    setBusy(true);
    setMessage("");
    try {
      await request(`/api/v1/admin/customers/${selected!.id}`, {
        method: "PATCH",
        body: JSON.stringify({
          name: name.trim(),
          phone: phone.trim(),
          email: email.trim() || "",
          contactPreference: preference,
        }),
      });
      await client.invalidateQueries({ queryKey: ["customers"] });
      await client.invalidateQueries({ queryKey: ["orders"] });
      setMessage("Datos del cliente guardados.");
      setSelected(undefined);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo guardar");
    } finally {
      setBusy(false);
    }
  }
  async function remove(customer: Profile) {
    setBusy(true);
    try {
      await request(`/api/v1/admin/customers/${customer.id}`, { method: "DELETE" });
      await client.invalidateQueries({ queryKey: ["customers"] });
      setSelected(undefined);
      setMessage(
        "Cliente eliminado. El historial de servicios se conserva por las restricciones del servidor.",
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo eliminar");
    } finally {
      setBusy(false);
    }
  }
  if (!booting && !token) return <Redirect href="/" />;
  return (
    <Screen>
      <Title>Clientes y vehículos</Title>
      <Field label="Buscar nombre, celular o placa" value={search} onChangeText={setSearch} />
      {query.isError && (
        <Notice error text="Se muestra la última copia local. Actualiza antes de editar." />
      )}
      <Action
        title="Actualizar clientes"
        secondary
        disabled={query.isFetching || busy}
        onPress={() => {
          void query.refetch();
        }}
      />
      <Notice text={message} />
      {query.isPending && <Busy />}
      {selected && (
        <Card>
          <Heading>Editar cliente</Heading>
          <Field label="Nombre" value={name} onChangeText={setName} />
          <Field label="Celular" value={phone} onChangeText={setPhone} keyboardType="phone-pad" />
          <Field
            label="Correo opcional"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <Copy muted>Preferencia de contacto:</Copy>
          {[
            ["whatsapp", "WhatsApp"],
            ["phone", "Llamada"],
            ["email", "Correo"],
          ].map(([value, label]) => (
            <Choice
              key={value}
              label={label}
              selected={preference === value}
              onPress={() => setPreference(value)}
            />
          ))}
          <Action
            title="Guardar cambios del cliente"
            disabled={busy || query.isError}
            onPress={() => void save()}
          />
          <Action title="Volver a la lista" secondary onPress={() => setSelected(undefined)} />
          <Action
            title="Eliminar cliente sin historial"
            secondary
            danger
            disabled={busy || query.isError}
            onPress={() =>
              Alert.alert(
                "Eliminar cliente",
                "Solo se permite si no tiene órdenes ni historial asociado. Esta acción no borra registros de servicio.",
                [
                  { text: "Volver", style: "cancel" },
                  { text: "Eliminar", style: "destructive", onPress: () => void remove(selected) },
                ],
              )
            }
          />
        </Card>
      )}
      {query.data?.customers
        .filter((customer) =>
          `${customer.name} ${customer.phone} ${(customer.vehicles ?? []).map((vehicle) => vehicle.plate).join(" ")}`
            .toLocaleLowerCase("es")
            .includes(search.toLocaleLowerCase("es")),
        )
        .map((customer) => (
          <Card key={customer.id}>
            <Heading>{customer.name}</Heading>
            <Copy>
              {customer.phone}
              {customer.email ? ` · ${customer.email}` : ""}
            </Copy>
            {customer.vehicles?.map((vehicle) => (
              <Copy key={vehicle.id}>
                {vehicle.plate} · {vehicle.make} {vehicle.model} {vehicle.year ?? ""}
              </Copy>
            ))}
            {customer.history?.map((order) => (
              <Copy key={order.id}>
                {order.code} · {statusNames[order.status] ?? order.status} ·{" "}
                {date(order.created_at)}
              </Copy>
            ))}
            <Action
              title={`Editar ${customer.name}`}
              secondary
              disabled={busy || query.isError}
              onPress={() => edit(customer)}
            />
          </Card>
        ))}
      {query.data?.customers.length === 0 && (
        <Copy muted>No hay clientes todavía. Registra el primero al crear un ingreso.</Copy>
      )}
    </Screen>
  );
}
