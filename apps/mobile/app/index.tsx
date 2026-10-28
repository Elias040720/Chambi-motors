import { useEffect, useState } from "react";
import { Alert, Text, View } from "react-native";
import { useRouter } from "expo-router";
import {
  Action,
  Busy,
  Card,
  Copy,
  Field,
  Heading,
  Notice,
  Screen,
  Title,
  styles,
} from "../components/ui";
import { useSession } from "../lib/session";
import { useApiQuery } from "../lib/query";
import type { Config, Order } from "../lib/types";
import { date, statusNames } from "../lib/types";

export default function Home() {
  const { token, booting } = useSession();
  return booting ? (
    <Screen>
      <Busy />
    </Screen>
  ) : token ? (
    <Dashboard />
  ) : (
    <Login />
  );
}
function Login() {
  const { login, request } = useSession();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  async function enter() {
    setBusy(true);
    setMessage("");
    try {
      await login(email.trim(), password);
      setPassword("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo ingresar");
    } finally {
      setBusy(false);
    }
  }
  async function recover() {
    if (!email.includes("@")) {
      setMessage("Escribe tu correo para recuperar el acceso.");
      return;
    }
    setBusy(true);
    try {
      await request("/api/v1/admin/session/recover", {
        method: "POST",
        body: JSON.stringify({ email: email.trim() }),
      });
      setMessage(
        "Si la cuenta está configurada, recibirás instrucciones de recuperación en tu correo.",
      );
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo solicitar la recuperación");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Screen>
      <Title>Acceso del taller</Title>
      <Copy muted>
        Una cuenta administradora. Usa tu correo y contraseña; en el entorno local se usa la clave
        de desarrollo.
      </Copy>
      <Card>
        <Field
          label="Correo del administrador"
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
        />
        <Field
          label="Contraseña"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          autoComplete="current-password"
          onSubmitEditing={() => void enter()}
        />
        <Action
          title={busy ? "Conectando…" : "Ingresar"}
          disabled={busy || !password}
          onPress={() => void enter()}
        />
        <Action title="Recuperar acceso" secondary disabled={busy} onPress={() => void recover()} />
        <Notice text={message} />
      </Card>
      <Copy muted>
        Los borradores se guardan en este teléfono. Para proteger los datos, cierra sesión al dejar
        de usarlo.
      </Copy>
    </Screen>
  );
}
function Dashboard() {
  const router = useRouter();
  const { logout } = useSession();
  const query = useApiQuery<{ workOrders: Order[] }>("orders", "/api/v1/admin/work-orders");
  const config = useApiQuery<Config>("config", "/api/v1/admin/config");
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("activas");
  const [now, setNow] = useState(Date.now);
  useEffect(() => {
    const clock = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(clock);
  }, []);
  const orders = query.data?.workOrders ?? [];
  const active = orders.filter((order) => !["entregado", "cancelado"].includes(order.status));
  const blocked = active.filter((order) => (order.blockers?.length ?? 0) > 0);
  const overdue = active.filter((order) => order.eta_to && new Date(order.eta_to).getTime() < now);
  const dueSoon = active.filter((order) => {
    const deadline = order.eta_to ? new Date(order.eta_to).getTime() : NaN;
    return deadline >= now && deadline <= now + 24 * 60 * 60 * 1000;
  });
  const approval = active.filter((order) => order.status === "esperando_aprobacion");
  const ready = active.filter((order) => order.status === "listo");
  const groups: Record<string, Order[]> = {
    activas: active,
    bloqueadas: blocked,
    atrasadas: overdue,
    por_vencer: dueSoon,
    esperando_aprobacion: approval,
    listo: ready,
    todas: orders,
  };
  const groupLabels: Record<string, string> = {
    activas: "Órdenes activas",
    bloqueadas: "Órdenes bloqueadas",
    atrasadas: "Órdenes con ETA superada",
    por_vencer: "Por vencer en las próximas 24 horas",
    esperando_aprobacion: "Pendientes de aprobación",
    listo: "Listas para entrega",
    todas: "Todas las órdenes consultadas",
  };
  const visible = (groups[filter] ?? active).filter((order) =>
    `${order.code} ${order.plate} ${order.customer_name}`
      .toLocaleLowerCase("es")
      .includes(search.toLocaleLowerCase("es")),
  );
  function exit() {
    Alert.alert(
      "Cerrar sesión",
      "Se eliminarán los borradores, las fotos pendientes y la caché de este teléfono. Envía o conserva lo necesario antes de continuar.",
      [
        { text: "Volver", style: "cancel" },
        {
          text: "Cerrar y eliminar",
          style: "destructive",
          onPress: () => {
            void logout().then((message) => Alert.alert("Sesión", message));
          },
        },
      ],
    );
  }
  return (
    <Screen>
      <Title>Órdenes de trabajo</Title>
      <Copy muted>{config.data?.business.name ?? "CHAMBI MOTORS"} · America/Lima</Copy>
      {config.data?.authMode === "development" && <Notice text="Entorno local de desarrollo" />}
      {query.isError && (
        <Notice
          error
          text={
            query.data
              ? `Sin conexión. Última copia: ${date(query.cachedAt)}. Actualiza antes de realizar cambios.`
              : "No se pudieron consultar las órdenes. Revisa la conexión y vuelve a intentar."
          }
        />
      )}
      <Notice error text={query.storageWarning} />
      <View style={styles.row}>
        <Card>
          <Heading>{active.length}</Heading>
          <Copy muted>Activas</Copy>
        </Card>
        <Card>
          <Heading>{blocked.length}</Heading>
          <Copy muted>Bloqueadas</Copy>
        </Card>
        <Card>
          <Heading>{overdue.length}</Heading>
          <Copy muted>Atrasadas</Copy>
        </Card>
        <Card>
          <Heading>{dueSoon.length}</Heading>
          <Copy muted>Por vencer (24 h)</Copy>
        </Card>
        <Card>
          <Heading>{approval.length}</Heading>
          <Copy muted>Por aprobar</Copy>
        </Card>
        <Card>
          <Heading>{ready.length}</Heading>
          <Copy muted>Para entrega</Copy>
        </Card>
      </View>
      <Copy muted>
        Conteos de las órdenes consultadas. Las alertas de tiempo usan la ETA guardada; las órdenes
        sin ETA no se cuentan como atrasadas ni por vencer.
      </Copy>
      <Action title="Registrar nuevo ingreso" onPress={() => router.push("/intake")} />
      <View style={styles.row}>
        <Action title="Clientes" secondary onPress={() => router.push("/customers")} />
        <Action title="Ajustes" secondary onPress={() => router.push("/settings")} />
      </View>
      <Field
        label="Buscar placa, cliente o código de OT"
        value={search}
        onChangeText={setSearch}
        autoCapitalize="none"
      />
      <View style={styles.row}>
        {[
          ["activas", "Activas"],
          ["bloqueadas", "Bloqueadas"],
          ["atrasadas", "Atrasadas"],
          ["por_vencer", "Por vencer (24 h)"],
          ["esperando_aprobacion", "Por aprobar"],
          ["listo", "Para entrega"],
          ["todas", "Todas"],
        ].map(([value, label]) => (
          <Action
            key={value}
            title={label}
            secondary={filter !== value}
            onPress={() => setFilter(value)}
          />
        ))}
      </View>
      <Action
        title={query.isFetching ? "Actualizando…" : "Actualizar órdenes"}
        secondary
        disabled={query.isFetching}
        onPress={() => {
          void query.refetch();
        }}
      />
      <Heading>{groupLabels[filter] ?? groupLabels.activas}</Heading>
      <Copy muted>{visible.length} órdenes en esta vista.</Copy>
      {query.isPending && <Busy />}
      {!query.isPending && visible.length === 0 && (
        <Copy muted>No hay órdenes que coincidan. Registra un ingreso o cambia tu búsqueda.</Copy>
      )}
      {visible.map((order) => (
        <Card key={order.id}>
          <Heading>
            {order.code} · {order.plate}
          </Heading>
          <Copy>
            {order.customer_name} · {order.make} {order.model}
          </Copy>
          <Text style={{ color: "#ffda19", fontSize: 17, fontWeight: "700" }}>
            {statusNames[order.status] ?? order.status}
          </Text>
          <Copy>{order.concern}</Copy>
          <Copy muted>
            Avance verificado: {order.progress ?? 0}% · ETA: {date(order.eta_to)}
          </Copy>
          {order.blockers?.map((blocker) => (
            <Notice key={blocker.id} text={blocker.reason} />
          ))}
          <Action
            title={`Abrir ${order.code}`}
            secondary
            onPress={() => router.push(`/orders/${order.id}`)}
          />
        </Card>
      ))}
      <Action title="Cerrar sesión" secondary onPress={exit} />
    </Screen>
  );
}
