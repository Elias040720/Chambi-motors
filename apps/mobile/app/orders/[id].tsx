import { useEffect, useRef, useState } from "react";
import { Alert, Image, Linking, Share, View } from "react-native";
import { Redirect, useLocalSearchParams } from "expo-router";
import * as Crypto from "expo-crypto";
import * as Clipboard from "expo-clipboard";
import * as ImagePicker from "expo-image-picker";
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
  styles,
} from "../../components/ui";
import {
  PartsPanel,
  QualityPanel,
  QuotePanel,
  TaskPanel,
  limaTimestamp,
  type Perform,
} from "../../components/operations";
import { ApiError, base, useSession } from "../../lib/session";
import { useApiQuery } from "../../lib/query";
import { discardPhoto, keepPhoto, readLocal, removeLocal, saveLocal } from "../../lib/storage";
import type { Config, Detail, PhotoDraft } from "../../lib/types";
import { date, nextStatuses, statusNames } from "../../lib/types";
import {
  recoverNotes,
  editNotesDraft,
  refreshNotesDraft,
  notesConflict,
  recoveryReady,
  replaceDraftPhoto,
  type NotesDraft,
} from "../../lib/drafts";

type Pending = { endpoint: "actions" | "transition"; body: Record<string, unknown> };
type QueuedPhoto = {
  photo: PhotoDraft;
  key: string;
  category: string;
  caption: string;
  visible: boolean;
};
const sections = [
  "Resumen",
  "Diagnóstico",
  "Contactos",
  "Tareas",
  "Presupuestos",
  "Repuestos",
  "QA y entrega",
  "Fotos",
  "Historial",
];

export default function OrderDetail() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { token, booting, request } = useSession();
  const query = useApiQuery<Detail>(`detail:${id}`, `/api/v1/admin/work-orders/${id}`);
  const config = useApiQuery<Config>("config", "/api/v1/admin/config");
  const client = useQueryClient();
  const [section, setSection] = useState("Resumen");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState<Pending>();
  const [photo, setPhoto] = useState<QueuedPhoto>();
  const [category, setCategory] = useState("diagnostico");
  const [caption, setCaption] = useState("");
  const [visible, setVisible] = useState(false);
  const [link, setLink] = useState<{ url: string; expiresAt?: string }>();
  const [shareDays, setShareDays] = useState("7");
  const [reason, setReason] = useState("");
  const [notes, setNotes] = useState<NotesDraft>({
    internal: "",
    public: "",
    baseVersion: null,
    dirty: false,
  });
  const internalNotes = notes.internal;
  const publicNotes = notes.public;
  const [notesLoaded, setNotesLoaded] = useState(false);
  const [queueLoaded, setQueueLoaded] = useState(false);
  const [recoveryError, setRecoveryError] = useState(false);
  const [recoveryAttempt, setRecoveryAttempt] = useState(0);
  const notesReady = useRef(false);
  const latestNotes = useRef(notes);
  const [etaFrom, setEtaFrom] = useState("");
  const [etaTo, setEtaTo] = useState("");
  const [confidence, setConfidence] = useState("tentativa");
  const [blockKind, setBlockKind] = useState("pausado");
  const [diagnosisKind, setDiagnosisKind] = useState("preliminary");
  const [diagnosisInternal, setDiagnosisInternal] = useState("");
  const [diagnosisPublic, setDiagnosisPublic] = useState("");
  const [diagnosisPublished, setDiagnosisPublished] = useState(false);
  const [diagnosisSupersedes, setDiagnosisSupersedes] = useState("");
  const [diagnosisEvidence, setDiagnosisEvidence] = useState<string[]>([]);
  const [contactName, setContactName] = useState("");
  const [contactPhone, setContactPhone] = useState("");
  const [contactRelation, setContactRelation] = useState<"client" | "representative">("client");
  const [contactCanView, setContactCanView] = useState(true);
  const [contactCanApprove, setContactCanApprove] = useState(false);
  const [contactVerifiedInPerson, setContactVerifiedInPerson] = useState(false);
  const [contactVerificationNote, setContactVerificationNote] = useState("");
  const [contactDelegationNote, setContactDelegationNote] = useState("");
  const uploadController = useRef<AbortController>(null);
  const notesKey = `draft:notes:${id}`;
  latestNotes.current = notes;
  notesReady.current = notesLoaded;
  useEffect(
    () => () => {
      if (notesReady.current && latestNotes.current.dirty)
        void saveLocal(notesKey, latestNotes.current).catch(() => {});
    },
    [notesKey],
  );
  useEffect(() => {
    let current = true;
    setQueueLoaded(false);
    void Promise.all([readLocal<Pending>(`pending:${id}`), readLocal<QueuedPhoto>(`photo:${id}`)])
      .then(([savedPending, savedPhoto]) => {
        if (!current) return;
        setPending(savedPending?.value);
        setPhoto(savedPhoto?.value);
        setQueueLoaded(true);
      })
      .catch(() => {
        if (current) setRecoveryError(true);
      });
    return () => {
      current = false;
    };
  }, [id, recoveryAttempt]);
  useEffect(() => {
    if (!query.data || notesLoaded) return;
    let current = true;
    void readLocal<NotesDraft>(notesKey)
      .then((saved) => {
        if (!current) return;
        setNotes(recoverNotes(saved?.value, query.data!.workOrder));
        setNotesLoaded(true);
      })
      .catch(() => {
        if (current) setRecoveryError(true);
      });
    return () => {
      current = false;
    };
  }, [query.data, notesLoaded, notesKey, recoveryAttempt]);
  useEffect(() => {
    if (notesLoaded && query.data)
      setNotes((previous) => refreshNotesDraft(previous, query.data.workOrder));
  }, [query.data, notesLoaded]);
  useEffect(() => {
    if (!notesLoaded || !notes.dirty) return;
    const timer = setTimeout(() => {
      if (!latestNotes.current.dirty) return;
      void saveLocal(notesKey, notes).catch(() =>
        setMessage("No se pudo guardar el borrador local de notas."),
      );
    }, 250);
    return () => clearTimeout(timer);
  }, [notes, notesLoaded, notesKey]);
  function editNotes(field: "internal" | "public", value: string) {
    setNotes((previous) => editNotesDraft(previous, field, value));
  }
  async function refresh() {
    await client.invalidateQueries({ queryKey: [`detail:${id}`] });
    await client.invalidateQueries({ queryKey: ["orders"] });
  }
  async function send(operation: Pending) {
    setBusy(true);
    setMessage("");
    setPending(operation);
    try {
      await saveLocal(`pending:${id}`, operation);
      await request(`/api/v1/admin/work-orders/${id}/${operation.endpoint}`, {
        method: "POST",
        body: JSON.stringify(operation.body),
      });
      setPending(undefined);
      await removeLocal(`pending:${id}`);
      setMessage("Cambio confirmado en el servidor.");
      if (operation.body.action === "note") {
        latestNotes.current = { ...latestNotes.current, dirty: false };
        setNotes(latestNotes.current);
        await removeLocal(notesKey);
      }
      await refresh();
    } catch (error) {
      if (error instanceof ApiError && error.status > 0 && error.status < 500) {
        setPending(undefined);
        await removeLocal(`pending:${id}`);
        if (error.status === 409) await refresh();
      }
      setMessage(error instanceof Error ? error.message : "No se pudo confirmar el cambio.");
    } finally {
      setBusy(false);
    }
  }
  const perform: Perform = (action, fields, confirmation) => {
    if (!recoveryReady(queueLoaded, notesLoaded, recoveryError)) return;
    if (action === "note" && notesConflict(notes, query.data!.workOrder.version)) {
      setMessage(
        "Las notas parten de otra versión. Conserva el borrador o descártalo explícitamente para usar las notas actuales.",
      );
      return;
    }
    if (pending) {
      setMessage(
        "Primero confirma o descarta la operación pendiente. No se enviarán otras acciones encima.",
      );
      return;
    }
    const operation: Pending = {
      endpoint: "actions",
      body: {
        action,
        ...fields,
        expectedVersion: action === "note" ? notes.baseVersion : query.data?.workOrder.version,
        idempotencyKey: Crypto.randomUUID(),
      },
    };
    if (confirmation)
      Alert.alert("Confirmar acción", confirmation, [
        { text: "Volver", style: "cancel" },
        { text: "Confirmar", onPress: () => void send(operation) },
      ]);
    else void send(operation);
  };
  function transition(status: string) {
    if (pending) {
      setMessage("Hay una operación pendiente de confirmar.");
      return;
    }
    Alert.alert(
      "Cambiar etapa",
      `${statusNames[status]}. ${reason || "La acción quedará en la bitácora."}`,
      [
        { text: "Volver", style: "cancel" },
        {
          text: "Confirmar",
          onPress: () =>
            void send({
              endpoint: "transition",
              body: {
                status,
                reason: reason || undefined,
                expectedVersion: query.data?.workOrder.version,
                idempotencyKey: Crypto.randomUUID(),
              },
            }),
        },
      ],
    );
  }
  async function choosePhoto(camera: boolean) {
    try {
      if (camera && !(await ImagePicker.requestCameraPermissionsAsync()).granted) {
        setMessage("Permite el uso de cámara desde Ajustes para capturar evidencia.");
        return;
      }
      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: ["images"],
        quality: 0.65,
        allowsEditing: true,
      };
      const selected = camera
        ? await ImagePicker.launchCameraAsync(options)
        : await ImagePicker.launchImageLibraryAsync(options);
      if (selected.canceled) return;
      const asset = selected.assets[0];
      const mime = asset.mimeType ?? "image/jpeg";
      if (
        !["image/jpeg", "image/png", "image/webp"].includes(mime) ||
        (asset.fileSize ?? 0) > 8 * 1024 * 1024
      ) {
        setMessage("Elige JPG, PNG o WebP de hasta 8 MB.");
        return;
      }
      const durable = await keepPhoto(asset.uri, mime);
      const queued = { photo: durable, key: Crypto.randomUUID(), category, caption, visible };
      await replaceDraftPhoto(
        photo?.photo,
        durable,
        () => saveLocal(`photo:${id}`, queued),
        discardPhoto,
      );
      setPhoto(queued);
      setMessage("Foto guardada en el teléfono. Falta enviarla al taller.");
    } catch {
      setMessage("No se pudo guardar la foto. Revisa permisos y espacio disponible.");
    }
  }
  async function upload() {
    if (!photo) return;
    setBusy(true);
    setMessage("Subiendo foto. Espera la confirmación del servidor.");
    const controller = new AbortController();
    uploadController.current = controller;
    try {
      const form = new FormData();
      form.append("photo", {
        uri: photo.photo.uri,
        name: photo.photo.name,
        type: photo.photo.mime,
      } as unknown as Blob);
      form.append("category", photo.category);
      form.append("caption", photo.caption);
      form.append("visibleToCustomer", String(photo.visible));
      form.append("idempotencyKey", photo.key);
      await request(`/api/v1/admin/work-orders/${id}/media`, {
        method: "POST",
        body: form,
        signal: controller.signal,
      });
      await removeLocal(`photo:${id}`);
      discardPhoto(photo.photo);
      setPhoto(undefined);
      setMessage("Foto guardada en el servidor.");
      await refresh();
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "No se pudo enviar. La foto se conserva para reintentar.",
      );
    } finally {
      setBusy(false);
      uploadController.current = null;
    }
  }
  async function saveDiagnosis() {
    setBusy(true);
    setMessage("");
    try {
      await request(`/api/v1/admin/work-orders/${id}/diagnoses`, {
        method: "POST",
        body: JSON.stringify({
          expectedVersion: order.version,
          kind: diagnosisKind,
          ...(diagnosisKind === "correction" ? { supersedesId: diagnosisSupersedes } : {}),
          internalNotes: diagnosisInternal,
          publicSummary: diagnosisPublic,
          evidenceIds: diagnosisEvidence,
          publish: diagnosisPublished,
        }),
      });
      setDiagnosisInternal("");
      setDiagnosisPublic("");
      setDiagnosisEvidence([]);
      setMessage("Nueva revisión de diagnóstico guardada. El historial anterior se conserva.");
      await client.invalidateQueries({ queryKey: [`detail:${id}`] });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo guardar el diagnóstico.");
    } finally {
      setBusy(false);
    }
  }
  async function saveContact() {
    setBusy(true);
    setMessage("");
    try {
      await request(`/api/v1/admin/work-orders/${id}/contacts`, {
        method: "POST",
        body: JSON.stringify({
          name: contactName,
          phone: contactPhone,
          relationType: contactRelation,
          canViewProgress: contactCanView,
          canApproveQuote: contactCanApprove,
          verifiedInPerson: true,
          verificationNote: contactVerificationNote,
          ...(contactCanApprove ? { delegationNote: contactDelegationNote } : {}),
        }),
      });
      setContactName("");
      setContactPhone("");
      setContactVerificationNote("");
      setContactDelegationNote("");
      setContactVerifiedInPerson(false);
      setMessage("Contacto registrado. El número y sus permisos están limitados a esta orden.");
      await client.invalidateQueries({ queryKey: [`detail:${id}`] });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo registrar el contacto.");
    } finally {
      setBusy(false);
    }
  }
  async function revokeContact(contactId: string) {
    Alert.alert("Revocar contacto", "Se cerrarán sus enlaces de recuperación de esta orden.", [
      { text: "Volver", style: "cancel" },
      {
        text: "Revocar",
        style: "destructive",
        onPress: () => {
          setBusy(true);
          void request(`/api/v1/admin/work-orders/${id}/contacts/${contactId}`, {
            method: "DELETE",
          })
            .then(() => client.invalidateQueries({ queryKey: [`detail:${id}`] }))
            .catch((error) =>
              setMessage(error instanceof Error ? error.message : "No se pudo revocar."),
            )
            .finally(() => setBusy(false));
        },
      },
    ]);
  }
  async function generateLink() {
    setBusy(true);
    try {
      const result = await request<{ url: string; expiresAt?: string }>(
        `/api/v1/admin/work-orders/${id}/share`,
        { method: "POST", body: JSON.stringify({ days: Number(shareDays) }) },
      );
      setLink(result);
      setMessage("Enlace privado generado. Compártelo solo con el cliente de esta orden.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo generar el enlace");
    } finally {
      setBusy(false);
    }
  }
  async function revoke() {
    setBusy(true);
    try {
      await request(`/api/v1/admin/work-orders/${id}/share`, { method: "DELETE" });
      setLink(undefined);
      setMessage("Enlaces de esta orden revocados.");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "No se pudo revocar");
    } finally {
      setBusy(false);
    }
  }
  function eta() {
    try {
      perform("eta", {
        from: limaTimestamp(etaFrom),
        to: limaTimestamp(etaTo),
        confidence,
        reason,
      });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Fecha no válida");
    }
  }
  if (!booting && !token) return <Redirect href="/" />;
  if (!query.data)
    return (
      <Screen>
        <Title>Orden de trabajo</Title>
        {query.isPending ? (
          <Busy />
        ) : (
          <>
            <Notice error text={query.error?.message ?? "No se pudo abrir esta orden"} />
            <Action
              title="Reintentar consulta"
              onPress={() => {
                void query.refetch();
              }}
            />
          </>
        )}
      </Screen>
    );
  const data = query.data;
  const order = data.workOrder;
  if (!recoveryReady(queueLoaded, notesLoaded, recoveryError))
    return (
      <Screen>
        <Title>Recuperando datos locales</Title>
        {recoveryError ? (
          <>
            <Notice
              error
              text="No se pudo recuperar la cola o el borrador. Los cambios están bloqueados para conservarlos."
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
  const closed = ["entregado", "cancelado"].includes(order.status);
  const disabled = busy || query.isError || closed || !!pending;
  return (
    <Screen>
      <Title>{order.code}</Title>
      <Copy>
        {order.plate} · {order.make} {order.model}
      </Copy>
      <Copy>
        {order.customer_name}
        {order.phone ? ` · ${order.phone}` : ""}
      </Copy>
      <Heading>{statusNames[order.status] ?? order.status}</Heading>
      <Copy muted>
        Versión {order.version} · Actualizado: {date(order.updated_at)}
      </Copy>
      {query.isError && (
        <Notice
          error
          text={`Copia local del ${date(query.cachedAt)}. Los cambios están deshabilitados hasta actualizar.`}
        />
      )}
      <Notice text={message} />
      <Action
        title={query.isFetching ? "Actualizando…" : "Actualizar orden"}
        secondary
        disabled={busy || query.isFetching}
        onPress={() => {
          void query.refetch();
        }}
      />
      {pending && (
        <Card>
          <Heading>Acción pendiente de confirmación</Heading>
          <Copy>
            El teléfono conserva el mismo identificador de reintento. No se enviará otra acción
            hasta resolver esta.
          </Copy>
          <Action
            title="Reintentar la misma operación"
            disabled={busy}
            onPress={() => void send(pending)}
          />
          <Action
            title="Descartar reintento y consultar servidor"
            secondary
            disabled={busy}
            onPress={() =>
              Alert.alert(
                "Consultar antes de continuar",
                "Descartar el reintento no deshace una acción que el servidor haya guardado. Revisa el historial y la versión actual.",
                [
                  { text: "Volver", style: "cancel" },
                  {
                    text: "Consultar",
                    onPress: () => {
                      void removeLocal(`pending:${id}`).then(() => {
                        setPending(undefined);
                        return refresh();
                      });
                    },
                  },
                ],
              )
            }
          />
        </Card>
      )}
      <View style={styles.row}>
        {sections.map((name) => (
          <Action
            key={name}
            title={name}
            secondary={name !== section}
            onPress={() => setSection(name)}
          />
        ))}
      </View>
      {section === "Resumen" && (
        <>
          <Card>
            <Heading>Servicio</Heading>
            <Copy>{order.concern}</Copy>
            <Copy>Avance verificado: {data.progress}%</Copy>
            <Copy muted>Ingreso: {date(order.created_at)}</Copy>
            <Copy>
              ETA {order.eta_confidence ?? "no disponible"}: {date(order.eta_from)} —{" "}
              {date(order.eta_to)}
            </Copy>
            {data.blockers.map((blocker) => (
              <Card key={blocker.id}>
                <Heading>Bloqueo: {statusNames[blocker.kind] ?? blocker.kind}</Heading>
                <Copy>{blocker.reason}</Copy>
                <Action
                  title="Resolver bloqueo con motivo de abajo"
                  secondary
                  disabled={disabled}
                  onPress={() =>
                    perform(
                      "blocker.resolve",
                      { blockerId: blocker.id, reason },
                      "Confirma que el motivo del bloqueo se resolvió. Los repuestos pendientes se validan por recepción e inspección.",
                    )
                  }
                />
              </Card>
            ))}
          </Card>
          <Card>
            <Heading>Etapa y motivo</Heading>
            <Field
              label="Motivo de cambio, bloqueo o ETA"
              value={reason}
              onChangeText={setReason}
              multiline
            />
            {(nextStatuses[order.status] ?? []).map((status) => (
              <Action
                key={status}
                title={`Pasar a ${statusNames[status]}`}
                secondary
                disabled={disabled}
                onPress={() => transition(status)}
              />
            ))}
            {closed && (
              <Copy muted>
                Orden cerrada. Las correcciones requieren una nueva orden o un registro auditado.
              </Copy>
            )}
          </Card>
          <Card>
            <Heading>Bloqueo paralelo</Heading>
            {["pausado", "esperando_cliente", "esperando_repuesto"].map((kind) => (
              <Choice
                key={kind}
                label={statusNames[kind]}
                selected={blockKind === kind}
                onPress={() => setBlockKind(kind)}
              />
            ))}
            <Action
              title="Registrar bloqueo"
              disabled={disabled || reason.trim().length < 3}
              onPress={() => perform("blocker.add", { kind: blockKind, reason })}
            />
          </Card>
          <Card>
            <Heading>Fecha estimada</Heading>
            <Field
              label="Desde (DD/MM/AAAA HH:mm, Lima)"
              value={etaFrom}
              onChangeText={setEtaFrom}
            />
            <Field label="Hasta (DD/MM/AAAA HH:mm, Lima)" value={etaTo} onChangeText={setEtaTo} />
            {["tentativa", "confirmada", "no_disponible"].map((value) => (
              <Choice
                key={value}
                label={value.replace("_", " ")}
                selected={confidence === value}
                onPress={() => setConfidence(value)}
              />
            ))}
            <Action
              title="Guardar ETA con motivo"
              disabled={disabled || reason.trim().length < 3}
              onPress={eta}
            />
          </Card>
          <Card>
            <Heading>Notas separadas</Heading>
            {notesConflict(notes, order.version) && (
              <>
                <Notice
                  error
                  text="El borrador de notas pertenece a otra versión (o es anterior al control de versiones). Se conserva, pero no se enviará sobre cambios más recientes."
                />
                <Action
                  title="Descartar borrador y cargar notas actuales"
                  secondary
                  disabled={busy || !!pending}
                  onPress={() =>
                    Alert.alert(
                      "Descartar borrador de notas",
                      "Se perderá el texto local. Se cargarán las notas de la versión consultada del servidor.",
                      [
                        { text: "Volver", style: "cancel" },
                        {
                          text: "Descartar",
                          style: "destructive",
                          onPress: () => {
                            void removeLocal(notesKey)
                              .then(() => {
                                const clean = recoverNotes(undefined, order);
                                latestNotes.current = clean;
                                setNotes(clean);
                              })
                              .catch(() =>
                                setMessage("No se pudo eliminar el borrador; se conserva."),
                              );
                          },
                        },
                      ],
                    )
                  }
                />
              </>
            )}
            <Copy muted>
              Se conserva un borrador local. Las notas no se publican hasta confirmar en el
              servidor.
            </Copy>
            <Field
              label="Nota interna del taller"
              value={internalNotes}
              editable={!busy && !pending}
              onChangeText={(value) => editNotes("internal", value)}
              multiline
            />
            <Field
              label="Nota visible para el cliente"
              value={publicNotes}
              editable={!busy && !pending}
              onChangeText={(value) => editNotes("public", value)}
              multiline
            />
            <Action
              title="Guardar notas en el servidor"
              disabled={disabled || !notes.dirty || notesConflict(notes, order.version)}
              onPress={() =>
                perform(
                  "note",
                  { internalNotes, publicNotes },
                  "La nota visible aparecerá en el portal del cliente. Revisa que no incluya información interna.",
                )
              }
            />
          </Card>
          <Card>
            <Heading>Enlace privado del cliente</Heading>
            <Field
              label="Duración del enlace en días"
              value={shareDays}
              onChangeText={setShareDays}
              keyboardType="number-pad"
            />
            <Action
              title="Generar enlace privado"
              disabled={busy || query.isError}
              onPress={() => void generateLink()}
            />
            {link && (
              <>
                <Copy muted>Vence: {date(link.expiresAt)}</Copy>
                <Action
                  title="Copiar enlace"
                  secondary
                  onPress={() => {
                    void Clipboard.setStringAsync(link.url).then(() =>
                      setMessage("Enlace copiado. Compártelo solo con el cliente de esta orden."),
                    );
                  }}
                />
                <Action
                  title="Compartir por el teléfono"
                  secondary
                  onPress={() => {
                    void Share.share({
                      title: "Seguimiento CHAMBI MOTORS",
                      message: `Consulta tu servicio de CHAMBI MOTORS: ${link.url}`,
                    }).catch(() => setMessage("No se pudo abrir el menú para compartir."));
                  }}
                />
                <Action
                  title="Compartir por WhatsApp"
                  secondary
                  onPress={() => {
                    void Linking.openURL(
                      `https://wa.me/?text=${encodeURIComponent(`Consulta tu servicio de CHAMBI MOTORS: ${link.url}`)}`,
                    ).catch(() =>
                      setMessage("No se pudo abrir WhatsApp. Usa compartir por el teléfono."),
                    );
                  }}
                />
              </>
            )}
            <Action
              title="Revocar enlaces de esta orden"
              secondary
              danger
              disabled={busy || query.isError}
              onPress={() =>
                Alert.alert(
                  "Revocar acceso",
                  "Los enlaces actuales dejarán de mostrar la orden y sus fotos.",
                  [
                    { text: "Volver", style: "cancel" },
                    { text: "Revocar", style: "destructive", onPress: () => void revoke() },
                  ],
                )
              }
            />
          </Card>
        </>
      )}
      {section === "Tareas" && (
        <TaskPanel
          data={data}
          perform={perform}
          disabled={disabled}
          templates={config.data?.templates}
        />
      )}
      {section === "Diagnóstico" && (
        <>
          <Card>
            <Heading>Nueva revisión de diagnóstico</Heading>
            <Copy muted>
              La evaluación inicial no afirma una causa confirmada. Las correcciones crean una
              revisión nueva y conservan las anteriores.
            </Copy>
            {["preliminary", "confirmed", "correction"].map((kind) => (
              <Choice
                key={kind}
                label={
                  kind === "preliminary"
                    ? "Evaluación preliminar"
                    : kind === "confirmed"
                      ? "Diagnóstico confirmado"
                      : "Corregir revisión vigente"
                }
                selected={diagnosisKind === kind}
                onPress={() => setDiagnosisKind(kind)}
              />
            ))}
            {diagnosisKind === "correction" && data.diagnoses.length > 0 && (
              <>
                <Heading>Revisión que se corrige</Heading>
                {data.diagnoses.map((item) => (
                  <Choice
                    key={item.id}
                    label={`Revisión ${item.revision} · ${item.effective_kind === "preliminary" ? "Preliminar" : "Confirmada"}`}
                    selected={diagnosisSupersedes === item.id}
                    onPress={() => setDiagnosisSupersedes(item.id)}
                  />
                ))}
              </>
            )}
            <Field
              label="Notas internas y motivo de corrección"
              value={diagnosisInternal}
              onChangeText={setDiagnosisInternal}
              multiline
            />
            <Field
              label="Resumen para el cliente"
              value={diagnosisPublic}
              onChangeText={setDiagnosisPublic}
              multiline
            />
            <Heading>Evidencia de esta orden</Heading>
            {data.media.length === 0 ? (
              <Copy muted>Primero carga una fotografía en la sección Fotos.</Copy>
            ) : (
              data.media.map((asset) => (
                <Choice
                  key={asset.id}
                  label={`${asset.category} · ${asset.caption ?? "Foto"}${asset.visible_to_customer ? " · visible" : " · privada"}`}
                  selected={diagnosisEvidence.includes(asset.id)}
                  onPress={() =>
                    setDiagnosisEvidence((current) =>
                      current.includes(asset.id)
                        ? current.filter((item) => item !== asset.id)
                        : [...current, asset.id],
                    )
                  }
                />
              ))
            )}
            <Choice
              label="Publicar este resumen en el portal"
              selected={diagnosisPublished}
              onPress={() => setDiagnosisPublished(!diagnosisPublished)}
            />
            <Action
              title="Guardar revisión"
              disabled={
                disabled ||
                (diagnosisPublished && diagnosisPublic.trim().length === 0) ||
                (diagnosisKind === "confirmed" && diagnosisEvidence.length === 0) ||
                (diagnosisKind === "correction" &&
                  (!diagnosisSupersedes || diagnosisInternal.trim().length < 3))
              }
              onPress={() => void saveDiagnosis()}
            />
          </Card>
          <Heading>Historial de diagnósticos</Heading>
          {data.diagnoses.map((item) => (
            <Card key={item.id}>
              <Heading>
                Revisión {item.revision} ·{" "}
                {item.effective_kind === "preliminary"
                  ? "Evaluación preliminar"
                  : "Diagnóstico confirmado"}
              </Heading>
              {item.kind === "correction" && <Copy muted>Corrige una revisión anterior.</Copy>}
              {item.published_at ? (
                <Copy>{item.public_summary}</Copy>
              ) : (
                <Copy muted>Revisión interna, no publicada.</Copy>
              )}
              {item.internal_notes && <Copy muted>Interno: {item.internal_notes}</Copy>}
              <Copy muted>{date(item.created_at)}</Copy>
            </Card>
          ))}
        </>
      )}
      {section === "Contactos" && (
        <>
          <Card>
            <Heading>Contactos de esta orden</Heading>
            <Copy muted>
              La recuperación se habilita solo para un cliente principal con teléfono verificado.
              Los permisos de representantes son exclusivos de esta orden.
            </Copy>
            {data.contacts.map((contact) => (
              <Card key={contact.id}>
                <Heading>{contact.name}</Heading>
                <Copy>
                  {contact.phone_e164} ·{" "}
                  {contact.relation_type === "client" ? "Cliente" : "Representante"}
                </Copy>
                <Copy muted>
                  {contact.can_view_progress ? "Puede consultar" : "Sin consulta"} ·{" "}
                  {contact.can_approve_quote
                    ? "Autorización registrada; aprobación remota pendiente"
                    : "No puede aprobar presupuestos"}
                </Copy>
                <Copy muted>
                  Verificación presencial: {date(contact.verified_at)} · {contact.verification_note}
                </Copy>
                {contact.delegation_note && (
                  <Copy muted>Delegación: {contact.delegation_note}</Copy>
                )}
                {contact.revoked_at ? (
                  <Notice error text={`Revocado: ${date(contact.revoked_at)}`} />
                ) : (
                  <Action
                    title="Revocar acceso"
                    secondary
                    danger
                    disabled={disabled}
                    onPress={() => revokeContact(contact.id)}
                  />
                )}
              </Card>
            ))}
          </Card>
          <Card>
            <Heading>Registrar contacto verificado</Heading>
            <Field
              label="Nombre"
              value={contactName}
              onChangeText={setContactName}
              autoComplete="name"
            />
            <Field
              label="Teléfono verificado (+519XXXXXXXX)"
              value={contactPhone}
              onChangeText={setContactPhone}
              keyboardType="phone-pad"
              autoComplete="tel"
            />
            {(["client", "representative"] as const).map((relation) => (
              <Choice
                key={relation}
                label={relation === "client" ? "Cliente" : "Representante"}
                selected={contactRelation === relation}
                onPress={() => setContactRelation(relation)}
              />
            ))}
            <Choice
              label="Puede consultar el seguimiento"
              selected={contactCanView}
              onPress={() => setContactCanView(!contactCanView)}
            />
            <Choice
              label="Registrar autorización de aprobación (flujo remoto pendiente)"
              selected={contactCanApprove}
              onPress={() => setContactCanApprove(!contactCanApprove)}
            />
            <Field
              label="Cómo comprobaste el teléfono y la identidad"
              value={contactVerificationNote}
              onChangeText={setContactVerificationNote}
              multiline
            />
            {contactCanApprove && (
              <Field
                label="Delegación para aprobar presupuestos"
                value={contactDelegationNote}
                onChangeText={setContactDelegationNote}
                multiline
              />
            )}
            <Choice
              label="Confirmo que comprobé presencialmente la identidad y el teléfono"
              selected={contactVerifiedInPerson}
              onPress={() => setContactVerifiedInPerson(!contactVerifiedInPerson)}
            />
            <Action
              title="Registrar para esta orden"
              disabled={
                disabled ||
                !contactVerifiedInPerson ||
                contactName.trim().length < 2 ||
                !/^\+519\d{8}$/.test(contactPhone) ||
                (!contactCanView && !contactCanApprove) ||
                contactVerificationNote.trim().length < 3 ||
                (contactRelation === "representative" &&
                  contactCanApprove &&
                  contactDelegationNote.trim().length < 3)
              }
              onPress={() => void saveContact()}
            />
          </Card>
        </>
      )}
      {section === "Presupuestos" && (
        <QuotePanel data={data} perform={perform} disabled={disabled} />
      )}
      {section === "Repuestos" && <PartsPanel data={data} perform={perform} disabled={disabled} />}
      {section === "QA y entrega" && (
        <QualityPanel data={data} perform={perform} disabled={disabled} />
      )}
      {section === "Fotos" && (
        <>
          <Card>
            <Heading>Evidencia del servicio</Heading>
            {["ingreso", "diagnostico", "reparacion", "control", "entrega"].map((value) => (
              <Choice
                key={value}
                label={value}
                selected={category === value}
                onPress={() => setCategory(value)}
              />
            ))}
            <Field label="Descripción de la evidencia" value={caption} onChangeText={setCaption} />
            <Choice
              label="Visible para el cliente"
              selected={visible}
              onPress={() => setVisible(!visible)}
            />
            <View style={styles.row}>
              <Action
                title="Tomar foto"
                secondary
                disabled={disabled}
                onPress={() => void choosePhoto(true)}
              />
              <Action
                title="Elegir foto"
                secondary
                disabled={disabled}
                onPress={() => void choosePhoto(false)}
              />
            </View>
          </Card>
          {photo && (
            <Card>
              <Heading>Foto pendiente de subir</Heading>
              <Image
                source={{ uri: photo.photo.uri }}
                style={{ height: 200 }}
                resizeMode="contain"
                accessibilityLabel="Foto pendiente de sincronización"
              />
              <Copy>
                {photo.category} · {photo.visible ? "Visible para cliente" : "Privada"} ·{" "}
                {photo.caption}
              </Copy>
              <Action
                title={busy ? "Subiendo…" : "Subir o reintentar foto"}
                disabled={disabled}
                onPress={() => void upload()}
              />
              {uploadController.current && (
                <Action
                  title="Cancelar subida"
                  secondary
                  onPress={() => uploadController.current?.abort()}
                />
              )}
            </Card>
          )}
          {data.media.map((asset) => (
            <Card key={asset.id}>
              <Image
                source={{
                  uri: `${base}/api/v1/admin/media/${asset.id}`,
                  headers: { Authorization: `Bearer ${token}` },
                }}
                style={{ height: 220, borderRadius: 10 }}
                resizeMode="contain"
                accessibilityLabel={asset.caption ?? `Evidencia de ${asset.category}`}
              />
              <Copy>
                {asset.category} · {asset.caption}
              </Copy>
              <Copy muted>
                {asset.visible_to_customer ? "Visible para el cliente" : "Solo taller"}
              </Copy>
              <Action
                title={asset.visible_to_customer ? "Hacer privada" : "Compartir con el cliente"}
                secondary
                disabled={disabled}
                onPress={() =>
                  perform(
                    "media.visibility",
                    { mediaId: asset.id, visibleToCustomer: !asset.visible_to_customer },
                    asset.visible_to_customer
                      ? "El cliente dejará de ver esta evidencia."
                      : "La foto aparecerá en el portal del cliente. Comprueba que pertenece a esta orden y puede compartirse.",
                  )
                }
              />
            </Card>
          ))}
        </>
      )}
      {section === "Historial" && (
        <>
          <Heading>Bitácora de la orden</Heading>
          {data.events.map((event) => (
            <Card key={event.id}>
              <Copy>
                {event.event_type}{" "}
                {event.to_status ? `· ${statusNames[event.to_status] ?? event.to_status}` : ""}
              </Copy>
              {event.reason && <Copy>{event.reason}</Copy>}
              <Copy muted>{date(event.created_at)}</Copy>
            </Card>
          ))}
          <Heading>Historial de este vehículo</Heading>
          {data.history.map((history) => (
            <Card key={history.id}>
              <Copy>
                {history.code} · {statusNames[history.status] ?? history.status}
              </Copy>
              <Copy>{history.concern}</Copy>
              <Copy muted>{date(history.created_at)}</Copy>
            </Card>
          ))}
        </>
      )}
    </Screen>
  );
}
