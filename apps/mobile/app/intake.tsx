import { useEffect, useRef, useState } from "react";
import { Alert, Image, View } from "react-native";
import { Redirect, useRouter } from "expo-router";
import { useQueryClient } from "@tanstack/react-query";
import * as Crypto from "expo-crypto";
import * as ImagePicker from "expo-image-picker";
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
  styles,
} from "../components/ui";
import { ApiError, useSession } from "../lib/session";
import { useApiQuery } from "../lib/query";
import { discardPhoto, keepPhoto, readLocal, removeLocal, saveLocal } from "../lib/storage";
import type { Config, Customer, IntakeDraft, Order, Vehicle } from "../lib/types";
import { canPersistDraft, canEditIntake, replaceDraftPhoto } from "../lib/drafts";

const storageKey = "draft:intake";
const empty = (): IntakeDraft => ({
  key: Crypto.randomUUID(),
  customerId: "",
  newCustomer: true,
  name: "",
  phone: "",
  email: "",
  plate: "",
  make: "",
  model: "",
  year: "",
  color: "",
  vin: "",
  mileage: "",
  concern: "",
  fuel: "",
  accessories: "",
  damage: "",
  checklist: [],
  step: 1,
});
const checks = [
  "Documentos revisados",
  "Luces revisadas",
  "Accesorios registrados",
  "Daños de ingreso registrados",
];

export default function Intake() {
  const { token, booting, request } = useSession();
  const router = useRouter();
  const client = useQueryClient();
  const customers = useApiQuery<{ customers: Customer[] }>("customers", "/api/v1/admin/customers");
  const config = useApiQuery<Config>("config", "/api/v1/admin/config");
  const [draft, setDraft] = useState<IntakeDraft>(empty);
  const latest = useRef(draft);
  const finished = useRef(false);
  const recovered = useRef(false);
  const photoSaving = useRef(false);
  const [recoveryAttempt, setRecoveryAttempt] = useState(0);
  const [recoveryError, setRecoveryError] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    let current = true;
    void readLocal<IntakeDraft>(storageKey)
      .then((savedDraft) => {
        if (!current) return;
        if (savedDraft) {
          const restored = { ...empty(), ...savedDraft.value };
          latest.current = restored;
          setDraft(restored);
          setMessage("Se recuperó tu borrador. Aún no se ha confirmado el ingreso.");
        }
        recovered.current = true;
        setLoaded(true);
        setRecoveryError(false);
      })
      .catch(() => {
        if (current) setRecoveryError(true);
      });
    return () => {
      current = false;
      if (canPersistDraft(recovered.current, finished.current) && !photoSaving.current)
        void saveLocal(storageKey, latest.current).catch(() => {});
    };
  }, [recoveryAttempt]);
  useEffect(() => {
    latest.current = draft;
    if (!canPersistDraft(recovered.current, finished.current) || !loaded) return;
    setSaved(false);
    const timer = setTimeout(() => {
      if (photoSaving.current || latest.current !== draft) return;
      void saveLocal(storageKey, draft)
        .then(() => setSaved(true))
        .catch(() =>
          setMessage("No se pudo guardar el borrador en este teléfono. No cierres la pantalla."),
        );
    }, 250);
    return () => clearTimeout(timer);
  }, [draft, loaded]);
  function update<K extends keyof IntakeDraft>(key: K, value: IntakeDraft[K]) {
    if (!canEditIntake(photoSaving.current)) return;
    setDraft((current) => ({ ...current, [key]: value, updatedAt: new Date().toISOString() }));
  }
  function selectCustomer(customerId: string, newCustomer = false) {
    if (!canEditIntake(photoSaving.current)) return;
    setDraft((current) => ({
      ...current,
      customerId,
      newCustomer,
      vehicleId: undefined,
      plate: "",
      make: "",
      model: "",
      year: "",
      color: "",
      vin: "",
      mileage: "",
      updatedAt: new Date().toISOString(),
    }));
  }
  function selectVehicle(vehicle?: Vehicle) {
    if (!canEditIntake(photoSaving.current)) return;
    setDraft((current) => ({
      ...current,
      vehicleId: vehicle?.id,
      plate: vehicle?.plate ?? "",
      make: vehicle?.make ?? "",
      model: vehicle?.model ?? "",
      year: vehicle?.year ? String(vehicle.year) : "",
      color: vehicle?.color ?? "",
      vin: vehicle?.vin ?? "",
      mileage: vehicle?.mileage != null ? String(vehicle.mileage) : "",
      updatedAt: new Date().toISOString(),
    }));
  }
  async function photo(camera: boolean) {
    if (!canEditIntake(photoSaving.current)) return;
    photoSaving.current = true;
    setBusy(true);
    try {
      if (camera && !(await ImagePicker.requestCameraPermissionsAsync()).granted) {
        setMessage("Permite usar la cámara desde Ajustes para tomar evidencia.");
        return;
      }
      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: ["images"],
        quality: 0.65,
        allowsEditing: true,
      };
      const result = camera
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);
      if (result.canceled) return;
      const asset = result.assets[0];
      const mime =
        asset.mimeType ?? (asset.uri.toLowerCase().endsWith(".png") ? "image/png" : "image/jpeg");
      if (
        !["image/jpeg", "image/png", "image/webp"].includes(mime) ||
        (asset.fileSize ?? 0) > 8 * 1024 * 1024
      ) {
        setMessage("Elige una imagen JPG, PNG o WebP de hasta 8 MB.");
        return;
      }
      const savedPhoto = await keepPhoto(asset.uri, mime);
      const current = latest.current;
      const replacement = { ...current, photo: savedPhoto, updatedAt: new Date().toISOString() };
      await replaceDraftPhoto(
        current.photo,
        savedPhoto,
        () => saveLocal(storageKey, replacement),
        discardPhoto,
      );
      latest.current = replacement;
      setDraft(replacement);
    } catch {
      setMessage("No se pudo guardar la foto. Revisa el permiso y el espacio disponible.");
    } finally {
      photoSaving.current = false;
      setBusy(false);
      if (canPersistDraft(recovered.current, finished.current))
        void saveLocal(storageKey, latest.current).catch(() =>
          setMessage("No se pudo guardar el borrador. No cierres la pantalla."),
        );
    }
  }
  function advance() {
    if (!canEditIntake(photoSaving.current)) return;
    if (
      draft.step === 1 &&
      (draft.newCustomer
        ? draft.name.trim().length < 2 || !/^(?:\+?51)?9\d{8}$/.test(draft.phone.trim())
        : !draft.customerId)
    ) {
      setMessage("Selecciona un cliente o completa nombre y celular peruano válido.");
      return;
    }
    if (draft.step === 2 && (!draft.plate.trim() || !draft.make.trim() || !draft.model.trim())) {
      setMessage("Completa placa, marca y modelo.");
      return;
    }
    if (draft.step === 3 && draft.concern.trim().length < 3) {
      setMessage("Describe el motivo del ingreso.");
      return;
    }
    setMessage("");
    update("step", Math.min(4, draft.step + 1));
  }
  async function confirm() {
    setBusy(true);
    setMessage("");
    let current = { ...draft };
    try {
      if (!current.createdOrderId) {
        if (!current.customerId) {
          const result = await request<{ customer: Customer }>("/api/v1/admin/customers", {
            method: "POST",
            body: JSON.stringify({
              name: current.name.trim(),
              phone: current.phone.trim(),
              email: current.email.trim() || undefined,
            }),
          });
          current = { ...current, customerId: result.customer.id };
          setDraft(current);
          await saveLocal(storageKey, current);
        }
        const submissionPayload =
          current.submissionPayload ??
          JSON.stringify({
            customerId: current.customerId,
            vehicleId: current.vehicleId,
            concern: current.concern,
            idempotencyKey: current.key,
            mileage: current.mileage ? Number(current.mileage) : undefined,
            vehicle: {
              plate: current.plate.trim().toUpperCase(),
              make: current.make.trim(),
              model: current.model.trim(),
              year: current.year ? Number(current.year) : undefined,
              color: current.color || undefined,
              vin: current.vin.trim().toUpperCase() || undefined,
              mileage: current.mileage ? Number(current.mileage) : undefined,
            },
            intake: {
              fuel: current.fuel,
              accessories: current.accessories,
              damage: current.damage,
              checklist: current.checklist,
            },
          });
        current = { ...current, submissionPayload };
        setDraft(current);
        await saveLocal(storageKey, current);
        const result = await request<{ workOrder: Order }>("/api/v1/admin/work-orders", {
          method: "POST",
          body: submissionPayload,
        });
        current = {
          ...current,
          createdOrderId: result.workOrder.id,
          createdOrderCode: result.workOrder.code,
        };
        setDraft(current);
        await saveLocal(storageKey, current);
      }
      if (current.photo) {
        const form = new FormData();
        form.append("category", "ingreso");
        form.append("visibleToCustomer", "false");
        form.append("idempotencyKey", current.key);
        form.append("photo", {
          uri: current.photo.uri,
          name: current.photo.name,
          type: current.photo.mime,
        } as unknown as Blob);
        await request(`/api/v1/admin/work-orders/${current.createdOrderId}/media`, {
          method: "POST",
          body: form,
        });
      }
      finished.current = true;
      await removeLocal(storageKey);
      discardPhoto(current.photo);
      await client.invalidateQueries({ queryKey: ["orders"] });
      await client.invalidateQueries({ queryKey: ["customers"] });
      Alert.alert(
        "Ingreso confirmado",
        `${current.createdOrderCode} se guardó en el taller${current.photo ? " con foto privada" : ""}.`,
      );
      router.replace(`/orders/${current.createdOrderId}`);
    } catch (error) {
      if (
        !current.createdOrderId &&
        error instanceof ApiError &&
        [400, 404, 422].includes(error.status)
      ) {
        current = { ...current, submissionPayload: undefined };
        setDraft(current);
        await saveLocal(storageKey, current);
      }
      setMessage(
        `${current.createdOrderId ? `La orden ${current.createdOrderCode} ya está guardada. La foto está pendiente. ` : "El ingreso no se ha confirmado. "}${error instanceof Error ? error.message : "Revisa tu conexión."}`,
      );
    } finally {
      setBusy(false);
    }
  }
  function discard() {
    Alert.alert(
      "Eliminar borrador",
      "Esta acción elimina el borrador y la foto local pendiente. Una orden ya confirmada en el servidor se conserva. Si perdiste la respuesta de un envío, consulta las órdenes antes de registrar otro ingreso.",
      [
        { text: "Volver", style: "cancel" },
        {
          text: "Eliminar",
          style: "destructive",
          onPress: () => {
            void (async () => {
              finished.current = true;
              await removeLocal(storageKey);
              discardPhoto(draft.photo);
              router.back();
            })();
          },
        },
      ],
    );
  }
  if (!booting && !token) return <Redirect href="/" />;
  if (!loaded)
    return (
      <Screen>
        {recoveryError ? (
          <>
            <Notice
              error
              text="No se pudo recuperar el borrador. No se reemplazará el contenido guardado."
            />
            <Action
              title="Reintentar recuperación"
              onPress={() => {
                setRecoveryError(false);
                setRecoveryAttempt((attempt) => attempt + 1);
              }}
            />
          </>
        ) : (
          <Busy />
        )}
      </Screen>
    );
  return (
    <Screen>
      <View pointerEvents={busy ? "none" : "auto"}>
        <Title>Nuevo ingreso</Title>
        <Copy muted>
          Paso {draft.step} de 4 ·{" "}
          {saved ? "Borrador guardado en este teléfono" : "Guardando borrador…"}
        </Copy>
        <Notice text={message} error={!!message && !message.startsWith("Se recuperó")} />
        {draft.createdOrderId ? (
          <Card>
            <Heading>{draft.createdOrderCode} guardada</Heading>
            <Copy>
              Quedó pendiente completar el envío. Reintenta con el mismo identificador sin crear
              otra orden.
            </Copy>
            <Action
              title={busy ? "Completando envío…" : "Reintentar envío pendiente"}
              disabled={busy}
              onPress={() => void confirm()}
            />
            <Action
              title="Ver orden guardada"
              secondary
              onPress={() => router.push(`/orders/${draft.createdOrderId}`)}
            />
          </Card>
        ) : draft.submissionPayload ? (
          <Card>
            <Heading>Confirmación de ingreso pendiente</Heading>
            <Copy>
              No se recibió la confirmación del servidor. El teléfono conserva exactamente los datos
              enviados para reintentar sin duplicar la orden.
            </Copy>
            <Action
              title={busy ? "Consultando envío…" : "Reintentar el mismo ingreso"}
              disabled={busy}
              onPress={() => void confirm()}
            />
          </Card>
        ) : (
          <>
            {draft.step === 1 && (
              <Card>
                <Heading>Cliente</Heading>
                {config.data?.business.privacyNotice && (
                  <Copy muted>{config.data.business.privacyNotice}</Copy>
                )}
                <Choice
                  label="Registrar cliente nuevo"
                  selected={draft.newCustomer}
                  onPress={() => {
                    selectCustomer("", true);
                  }}
                />
                <Choice
                  label="Elegir cliente registrado"
                  selected={!draft.newCustomer}
                  onPress={() => update("newCustomer", false)}
                />
                {draft.newCustomer ? (
                  <>
                    <Field
                      label="Nombre del cliente"
                      value={draft.name}
                      onChangeText={(value) => update("name", value)}
                      autoComplete="name"
                    />
                    <Field
                      label="Celular peruano"
                      value={draft.phone}
                      onChangeText={(value) => update("phone", value)}
                      keyboardType="phone-pad"
                    />
                    <Field
                      label="Correo opcional"
                      value={draft.email}
                      onChangeText={(value) => update("email", value)}
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                  </>
                ) : (
                  <>
                    {customers.isError && (
                      <Notice
                        error
                        text="Se muestran clientes guardados. La selección se validará al confirmar."
                      />
                    )}
                    {customers.data?.customers.map((customer) => (
                      <Choice
                        key={customer.id}
                        label={`${customer.name} · ${customer.phone}`}
                        selected={draft.customerId === customer.id}
                        onPress={() => selectCustomer(customer.id)}
                      />
                    ))}
                    {customers.data?.customers.length === 0 && (
                      <Copy muted>No hay clientes registrados.</Copy>
                    )}
                  </>
                )}
              </Card>
            )}
            {draft.step === 2 && (
              <Card>
                <Heading>Vehículo</Heading>
                {!draft.newCustomer &&
                  (customers.data?.customers.find((customer) => customer.id === draft.customerId)
                    ?.vehicles?.length ?? 0) > 0 && (
                    <>
                      <Copy muted>
                        Vehículos de este cliente. Selecciona uno para reutilizar su historial.
                      </Copy>
                      {customers.data?.customers
                        .find((customer) => customer.id === draft.customerId)
                        ?.vehicles?.map((vehicle) => (
                          <Choice
                            key={vehicle.id}
                            label={`${vehicle.plate} · ${vehicle.make} ${vehicle.model}`}
                            selected={draft.vehicleId === vehicle.id}
                            onPress={() => selectVehicle(vehicle)}
                          />
                        ))}
                      <Choice
                        label="Registrar otro vehículo"
                        selected={!draft.vehicleId}
                        onPress={() => selectVehicle()}
                      />
                    </>
                  )}
                {draft.vehicleId && (
                  <Copy muted>
                    Vehículo registrado. Se creará una nueva OT en su historial; puedes actualizar
                    el kilometraje de esta recepción.
                  </Copy>
                )}
                <Field
                  label="Placa"
                  value={draft.plate}
                  editable={!draft.vehicleId}
                  autoCapitalize="characters"
                  onChangeText={(value) => update("plate", value)}
                />
                <Field
                  label="Marca"
                  value={draft.make}
                  editable={!draft.vehicleId}
                  onChangeText={(value) => update("make", value)}
                />
                <Field
                  label="Modelo"
                  value={draft.model}
                  editable={!draft.vehicleId}
                  onChangeText={(value) => update("model", value)}
                />
                <Field
                  label="Año opcional"
                  value={draft.year}
                  editable={!draft.vehicleId}
                  onChangeText={(value) => update("year", value)}
                  keyboardType="number-pad"
                  maxLength={4}
                />
                <Field
                  label="Color opcional"
                  value={draft.color}
                  editable={!draft.vehicleId}
                  onChangeText={(value) => update("color", value)}
                />
                <Field
                  label="VIN opcional"
                  value={draft.vin}
                  editable={!draft.vehicleId}
                  autoCapitalize="characters"
                  maxLength={32}
                  onChangeText={(value) => update("vin", value)}
                />
                <Field
                  label="Kilometraje"
                  value={draft.mileage}
                  onChangeText={(value) => update("mileage", value)}
                  keyboardType="number-pad"
                />
              </Card>
            )}
            {draft.step === 3 && (
              <Card>
                <Heading>Recepción y evidencia</Heading>
                <Field
                  label="Motivo de ingreso"
                  value={draft.concern}
                  onChangeText={(value) => update("concern", value)}
                  multiline
                />
                <Field
                  label="Combustible al ingreso"
                  value={draft.fuel}
                  onChangeText={(value) => update("fuel", value)}
                  placeholder="Ejemplo: medio tanque"
                />
                <Field
                  label="Accesorios que deja el cliente"
                  value={draft.accessories}
                  onChangeText={(value) => update("accessories", value)}
                  multiline
                />
                <Field
                  label="Daños observados al ingreso"
                  value={draft.damage}
                  onChangeText={(value) => update("damage", value)}
                  multiline
                />
                {checks.map((check) => (
                  <Choice
                    key={check}
                    label={check}
                    selected={draft.checklist.includes(check)}
                    onPress={() =>
                      update(
                        "checklist",
                        draft.checklist.includes(check)
                          ? draft.checklist.filter((item) => item !== check)
                          : [...draft.checklist, check],
                      )
                    }
                  />
                ))}
                <View style={styles.row}>
                  <Action title="Tomar foto" secondary onPress={() => void photo(true)} />
                  <Action title="Elegir foto" secondary onPress={() => void photo(false)} />
                </View>
                {draft.photo && (
                  <>
                    <Image
                      source={{ uri: draft.photo.uri }}
                      style={{ height: 200, borderRadius: 10 }}
                      resizeMode="contain"
                      accessibilityLabel="Evidencia de ingreso pendiente"
                    />
                    <Copy muted>
                      La foto será privada. Puedes compartirla con el cliente desde la orden.
                    </Copy>
                  </>
                )}
              </Card>
            )}
            {draft.step === 4 && (
              <Card>
                <Heading>Confirmar ingreso</Heading>
                <Copy>
                  {draft.newCustomer
                    ? draft.name
                    : (customers.data?.customers.find(
                        (customer) => customer.id === draft.customerId,
                      )?.name ?? "Cliente seleccionado")}
                </Copy>
                <Copy>
                  {draft.plate.toUpperCase()} · {draft.make} {draft.model}
                </Copy>
                <Copy muted>
                  {draft.vehicleId ? "Vehículo existente" : "Nuevo vehículo"}
                  {draft.vin ? ` · VIN: ${draft.vin.toUpperCase()}` : ""}
                  {draft.mileage ? ` · ${draft.mileage} km` : ""}
                </Copy>
                <Copy>{draft.concern}</Copy>
                <Copy muted>
                  {draft.photo ? "1 foto privada pendiente de cargar" : "Sin foto de ingreso"}. El
                  ingreso se confirmará solo cuando responda el servidor.
                </Copy>
                <Action
                  title={busy ? "Guardando en el taller…" : "Confirmar y enviar ingreso"}
                  disabled={busy}
                  onPress={() =>
                    Alert.alert(
                      "Confirmar ingreso",
                      "Se creará una orden real en el servidor configurado.",
                      [
                        { text: "Volver", style: "cancel" },
                        { text: "Confirmar", onPress: () => void confirm() },
                      ],
                    )
                  }
                />
              </Card>
            )}
            <View style={styles.row}>
              {draft.step > 1 && (
                <Action
                  title="Atrás"
                  secondary
                  disabled={busy}
                  onPress={() => update("step", draft.step - 1)}
                />
              )}
              {draft.step < 4 && <Action title="Continuar" onPress={advance} />}
            </View>
          </>
        )}
        <Action
          title="Eliminar borrador local"
          secondary
          danger
          disabled={busy}
          onPress={discard}
        />
        <Copy muted>
          Puedes volver al panel y retomar este borrador. No se enviarán cambios automáticamente al
          recuperar la conexión.
        </Copy>
      </View>
    </Screen>
  );
}
