import { useState } from "react";
import { View } from "react-native";
import { Action, Card, Choice, Copy, Field, Heading, Notice, styles } from "./ui";
import type { Detail } from "../lib/types";
import { date, money, orderedTasks } from "../lib/types";

export type Perform = (
  action: string,
  fields: Record<string, unknown>,
  confirmation?: string,
) => void;
export function limaTimestamp(value: string): string | undefined {
  if (!value.trim()) return undefined;
  const match = /^(\d{2})\/(\d{2})\/(\d{4}) (\d{2}):(\d{2})$/.exec(value.trim());
  if (!match) throw new Error("Usa el formato DD/MM/AAAA HH:mm (hora de Lima).");
  const [, day, month, year, hour, minute] = match;
  const source = `${year}-${month}-${day}T${hour}:${minute}:00-05:00`;
  const timestamp = new Date(source);
  if (
    Number.isNaN(timestamp.getTime()) ||
    Number(month) > 12 ||
    Number(day) > new Date(Number(year), Number(month), 0).getDate() ||
    Number(hour) > 23 ||
    Number(minute) > 59
  )
    throw new Error("Revisa la fecha y hora.");
  return timestamp.toISOString();
}

export function TaskPanel({
  data,
  perform,
  disabled,
  templates = [],
}: {
  data: Detail;
  perform: Perform;
  disabled: boolean;
  templates?: string[];
}) {
  const [title, setTitle] = useState("");
  const [weight, setWeight] = useState("1");
  const [visible, setVisible] = useState(true);
  const [evidenceRequired, setEvidenceRequired] = useState(false);
  const [evidence, setEvidence] = useState("");
  const [quoteId, setQuoteId] = useState("");
  const [priority, setPriority] = useState<"alta" | "media" | "baja">("media");
  const [dependsOn, setDependsOn] = useState("");
  const tasks = orderedTasks(data.tasks);
  return (
    <>
      <Card>
        <Heading>Tareas y avance real</Heading>
        <Copy>Avance ponderado verificado: {data.progress}%</Copy>
        <Copy muted>
          Los trabajos con costo adicional deben vincularse a la versión de presupuesto aprobada.
        </Copy>
        {templates.length > 0 && (
          <>
            <Copy muted>Plantillas del taller:</Copy>
            {templates.map((template) => (
              <Action
                key={template}
                title={template}
                secondary
                onPress={() => setTitle(template)}
              />
            ))}
          </>
        )}
        <Field label="Nueva tarea" value={title} onChangeText={setTitle} />
        <Field
          label="Peso (1 a 10)"
          value={weight}
          onChangeText={setWeight}
          keyboardType="number-pad"
        />
        <Copy muted>Prioridad:</Copy>
        <View style={styles.row}>
          {(["alta", "media", "baja"] as const).map((value) => (
            <Choice
              key={value}
              label={`Prioridad ${value}`}
              selected={priority === value}
              onPress={() => setPriority(value)}
            />
          ))}
        </View>
        <Copy muted>
          Dependencia opcional. La tarea solo podrá completarse después de su requisito.
        </Copy>
        <Choice label="Sin tarea previa" selected={!dependsOn} onPress={() => setDependsOn("")} />
        {tasks.map((task, index) => (
          <Choice
            key={task.id}
            label={`${index + 1}. ${task.title}${task.completed_at ? " · completada" : " · pendiente"}`}
            selected={dependsOn === task.id}
            onPress={() => setDependsOn(task.id)}
          />
        ))}
        <Choice
          label="Visible para el cliente"
          selected={visible}
          onPress={() => setVisible(!visible)}
        />
        <Choice
          label="Requiere evidencia de finalización"
          selected={evidenceRequired}
          onPress={() => setEvidenceRequired(!evidenceRequired)}
        />
        <Copy muted>Presupuesto asociado (opcional):</Copy>
        <Choice
          label="Sin costo adicional / incluido"
          selected={!quoteId}
          onPress={() => setQuoteId("")}
        />
        {data.quotes.map((quote) => (
          <Choice
            key={quote.id}
            label={`V${quote.version} · ${quote.status} · ${money(quote.total)}`}
            selected={quoteId === quote.id}
            onPress={() => setQuoteId(quote.id)}
          />
        ))}
        <Action
          title="Agregar tarea"
          disabled={disabled || !title.trim()}
          onPress={() =>
            perform("task.add", {
              title,
              weight: Number(weight),
              priority,
              ...(dependsOn ? { dependsOn } : {}),
              visibleToCustomer: visible,
              requiresEvidence: evidenceRequired,
              ...(quoteId ? { quoteId } : {}),
            })
          }
        />
      </Card>
      <Field
        label="Evidencia o resultado de la tarea"
        value={evidence}
        onChangeText={setEvidence}
        multiline
      />
      {tasks.map((task, index) => {
        const dependency = data.tasks.find((item) => item.id === task.depends_on);
        const dependencyPending = !!task.depends_on && !dependency?.completed_at;
        const completedDependents = data.tasks.filter(
          (item) => item.depends_on === task.id && item.completed_at,
        );
        return (
          <Card key={task.id}>
            <Heading>
              {index + 1}. {task.title}
            </Heading>
            <Copy muted>
              Prioridad {task.priority ?? "media"} · Peso {task.weight} ·{" "}
              {task.completed_at ? `Completada ${date(task.completed_at)}` : "Pendiente"} ·{" "}
              {task.visible_to_customer ? "Visible al cliente" : "Interna"}
            </Copy>
            {task.depends_on && (
              <Copy muted>
                Requiere: {dependency?.title ?? "Tarea no disponible en esta copia"} ·{" "}
                {dependency?.completed_at ? "completada" : "pendiente"}
              </Copy>
            )}
            {task.completed_at && completedDependents.length > 0 && (
              <Copy muted>
                Para reabrir, marca primero pendientes sus tareas dependientes completadas.
              </Copy>
            )}
            {task.requires_evidence && <Copy muted>Requiere evidencia para finalizar.</Copy>}
            <Action
              title={task.completed_at ? "Marcar pendiente" : "Completar tarea"}
              secondary
              disabled={
                disabled ||
                (!task.completed_at && dependencyPending) ||
                (!!task.completed_at && completedDependents.length > 0)
              }
              onPress={() =>
                perform(
                  "task.complete",
                  { taskId: task.id, completed: !task.completed_at, evidence },
                  task.completed_at
                    ? "Se registrará que la tarea vuelve a estar pendiente."
                    : undefined,
                )
              }
            />
          </Card>
        );
      })}
      {data.tasks.length === 0 && (
        <Copy muted>No hay tareas. Agrega las verificaciones concretas del servicio.</Copy>
      )}
    </>
  );
}
type LineDraft = {
  description: string;
  kind: "trabajo" | "repuesto";
  quantity: string;
  unitPrice: string;
};
const line = (): LineDraft => ({ description: "", kind: "trabajo", quantity: "1", unitPrice: "" });
export function QuotePanel({
  data,
  perform,
  disabled,
}: {
  data: Detail;
  perform: Perform;
  disabled: boolean;
}) {
  const [lines, setLines] = useState<LineDraft[]>([line()]);
  const [expiry, setExpiry] = useState("");
  const [evidence, setEvidence] = useState("");
  const [error, setError] = useState("");
  function update(index: number, key: keyof LineDraft, value: string) {
    setLines((current) =>
      current.map((item, position) => (position === index ? { ...item, [key]: value } : item)),
    );
  }
  function create() {
    try {
      const expiresAt = limaTimestamp(expiry);
      setError("");
      perform(
        "quote.create",
        {
          lines: lines.map((item) => ({
            description: item.description,
            kind: item.kind,
            quantity: Number(item.quantity.replace(",", ".")),
            unitPrice: Number(item.unitPrice.replace(",", ".")),
          })),
          ...(expiresAt ? { expiresAt } : {}),
        },
        "Se guardará una nueva versión del presupuesto. Los cambios posteriores requerirán otra versión y una nueva aprobación.",
      );
    } catch (error) {
      setError(error instanceof Error ? error.message : "Fecha no válida");
    }
  }
  const total = lines.reduce(
    (sum, item) =>
      sum + Number(item.quantity.replace(",", ".")) * Number(item.unitPrice.replace(",", ".")),
    0,
  );
  return (
    <>
      <Card>
        <Heading>Nueva versión de presupuesto</Heading>
        <Copy muted>Importes orientativos en soles. Este sistema no cobra dinero.</Copy>
        {lines.map((item, index) => (
          <Card key={index}>
            <Field
              label={`Concepto ${index + 1}`}
              value={item.description}
              onChangeText={(value) => update(index, "description", value)}
            />
            <View style={styles.row}>
              <Choice
                label="Trabajo"
                selected={item.kind === "trabajo"}
                onPress={() => update(index, "kind", "trabajo")}
              />
              <Choice
                label="Repuesto"
                selected={item.kind === "repuesto"}
                onPress={() => update(index, "kind", "repuesto")}
              />
            </View>
            <Field
              label={`Cantidad ${index + 1}`}
              value={item.quantity}
              onChangeText={(value) => update(index, "quantity", value)}
              keyboardType="decimal-pad"
            />
            <Field
              label={`Precio unitario ${index + 1} (PEN)`}
              value={item.unitPrice}
              onChangeText={(value) => update(index, "unitPrice", value)}
              keyboardType="decimal-pad"
            />
            {lines.length > 1 && (
              <Action
                title={`Quitar concepto ${index + 1}`}
                secondary
                onPress={() =>
                  setLines((current) => current.filter((_, position) => position !== index))
                }
              />
            )}
          </Card>
        ))}
        <Action
          title="Agregar concepto"
          secondary
          onPress={() => setLines((current) => [...current, line()])}
        />
        <Field
          label="Vence el (DD/MM/AAAA HH:mm, Lima), opcional"
          value={expiry}
          onChangeText={setExpiry}
          placeholder="27/10/2026 18:00"
        />
        <Copy>Total: {money(Number.isFinite(total) ? total : 0)}</Copy>
        <Notice text={error} error />
        <Action
          title="Guardar nueva versión"
          disabled={
            disabled ||
            lines.some(
              (item) => !item.description.trim() || !item.unitPrice || Number(item.quantity) <= 0,
            )
          }
          onPress={create}
        />
      </Card>
      <Field
        label="Constancia de aprobación o rechazo presencial"
        value={evidence}
        onChangeText={setEvidence}
        multiline
        placeholder="Quién confirmó, alcance revisado y constancia del consentimiento presencial"
      />
      {data.quotes.map((quote) => (
        <Card key={quote.id}>
          <Heading>
            Presupuesto V{quote.version} · {money(quote.total)}
          </Heading>
          <Copy>
            {quote.status} · Vence: {date(quote.expires_at)}
          </Copy>
          {quote.lines.map((item, index) => (
            <Copy key={index}>
              {item.description} · {item.quantity} × {money(item.unit_price)}
            </Copy>
          ))}
          {quote.decision && (
            <Copy muted>Decisión registrada por canal {quote.decision.channel}.</Copy>
          )}
          {quote.status === "pendiente" && (
            <>
              <Action
                title={`Registrar aprobación presencial V${quote.version}`}
                disabled={disabled || evidence.trim().length < 5}
                onPress={() =>
                  perform(
                    "quote.decide",
                    { quoteId: quote.id, decision: "aprobado", channel: "presencial", evidence },
                    `Se registrará la aprobación presencial de V${quote.version} por ${money(quote.total)}. Confirma que el cliente autorizó estos conceptos exactos.`,
                  )
                }
              />
              <Action
                title={`Registrar rechazo presencial V${quote.version}`}
                secondary
                disabled={disabled || evidence.trim().length < 5}
                onPress={() =>
                  perform(
                    "quote.decide",
                    { quoteId: quote.id, decision: "rechazado", channel: "presencial", evidence },
                    "Se registrará el rechazo. Los trabajos vinculados permanecerán bloqueados.",
                  )
                }
              />
            </>
          )}
        </Card>
      ))}
      {data.quotes.length === 0 && <Copy muted>Todavía no hay un presupuesto.</Copy>}
    </>
  );
}

export function PartsPanel({
  data,
  perform,
  disabled,
}: {
  data: Detail;
  perform: Perform;
  disabled: boolean;
}) {
  const [description, setDescription] = useState("");
  const [resolution, setResolution] = useState<"cliente" | "taller">("cliente");
  const [urgency, setUrgency] = useState("media");
  const [provider, setProvider] = useState("");
  const [promised, setPromised] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  function act(action: string, fields: Record<string, unknown>, confirmation?: string) {
    try {
      const promisedAt = limaTimestamp(promised);
      setError("");
      perform(action, { ...fields, ...(promisedAt ? { promisedAt } : {}) }, confirmation);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Fecha no válida");
    }
  }
  return (
    <>
      <Card>
        <Heading>Solicitar repuesto</Heading>
        <Field
          label="Repuesto y compatibilidad requerida"
          value={description}
          onChangeText={setDescription}
          multiline
        />
        <Field label="Proveedor interno opcional" value={provider} onChangeText={setProvider} />
        <View style={styles.row}>
          <Choice
            label="Lo trae el cliente"
            selected={resolution === "cliente"}
            onPress={() => setResolution("cliente")}
          />
          <Choice
            label="Lo consigue el taller"
            selected={resolution === "taller"}
            onPress={() => setResolution("taller")}
          />
        </View>
        <View style={styles.row}>
          {["alta", "media", "baja"].map((value) => (
            <Choice
              key={value}
              label={`Urgencia ${value}`}
              selected={urgency === value}
              onPress={() => setUrgency(value)}
            />
          ))}
        </View>
        <Field
          label="Fecha comprometida (DD/MM/AAAA HH:mm, Lima)"
          value={promised}
          onChangeText={setPromised}
        />
        <Copy muted>
          La promesa no acredita recepción. El bloqueo se conserva hasta recibir e inspeccionar el
          repuesto.
        </Copy>
        <Notice text={error} error />
        <Action
          title="Registrar solicitud y bloqueo"
          disabled={disabled || !description.trim()}
          onPress={() => act("part.request", { description, resolution, urgency, provider })}
        />
      </Card>
      <Field
        label="Resultado de inspección o motivo de rechazo"
        value={note}
        onChangeText={setNote}
        multiline
      />
      {data.parts.map((part) => (
        <Card key={part.id}>
          <Heading>{part.description}</Heading>
          <Copy>
            {part.status} ·{" "}
            {part.resolution === "cliente" ? "Lo trae el cliente" : "Lo consigue el taller"}
          </Copy>
          <Copy muted>
            Compromiso: {date(part.promised_at)}
            {part.provider ? ` · Proveedor interno: ${part.provider}` : ""}
          </Copy>
          {!["conforme"].includes(part.status) && (
            <>
              <Action
                title="Actualizar promesa con datos de arriba"
                secondary
                disabled={disabled}
                onPress={() =>
                  act(
                    "part.promise",
                    { partId: part.id, resolution },
                    "Se actualizará el compromiso de entrega; el repuesto seguirá pendiente de recepción.",
                  )
                }
              />
              <Action
                title="Recibido e inspeccionado: conforme"
                disabled={disabled || note.trim().length < 3}
                onPress={() =>
                  perform(
                    "part.receive",
                    { partId: part.id, accepted: true, note },
                    "Confirma que el repuesto llegó físicamente y su compatibilidad fue inspeccionada.",
                  )
                }
              />
              <Action
                title="Registrar recepción rechazada"
                secondary
                danger
                disabled={disabled || note.trim().length < 3}
                onPress={() =>
                  perform(
                    "part.receive",
                    { partId: part.id, accepted: false, note },
                    "Se conservará el bloqueo y la constancia de rechazo del repuesto.",
                  )
                }
              />
            </>
          )}
        </Card>
      ))}
      {data.parts.length === 0 && <Copy muted>No hay repuestos solicitados.</Copy>}
    </>
  );
}

export function QualityPanel({
  data,
  perform,
  disabled,
}: {
  data: Detail;
  perform: Perform;
  disabled: boolean;
}) {
  const [items, setItems] = useState([
    { title: "Funcionamiento del servicio reparado", passed: false },
    { title: "Sin fugas ni alertas de seguridad", passed: false },
    { title: "Verificación final y limpieza", passed: false },
  ]);
  const [newItem, setNewItem] = useState("");
  const [note, setNote] = useState("");
  const [summary, setSummary] = useState("");
  const [warranty, setWarranty] = useState("");
  return (
    <>
      <Card>
        <Heading>Control de calidad</Heading>
        <Copy muted>
          Marca solo verificaciones aprobadas. Cada casilla sin marcar se registrará como falla y
          devolverá la orden a reparación.
        </Copy>
        {items.map((item, index) => (
          <Card key={index}>
            <Field
              label={`Verificación QA ${index + 1}`}
              value={item.title}
              maxLength={200}
              onChangeText={(value) =>
                setItems((current) =>
                  current.map((entry, position) =>
                    position === index ? { ...entry, title: value } : entry,
                  ),
                )
              }
            />
            <Choice
              label={`${item.title}: aprobada`}
              selected={item.passed}
              onPress={() =>
                setItems((current) =>
                  current.map((entry, position) =>
                    position === index ? { ...entry, passed: !entry.passed } : entry,
                  ),
                )
              }
            />
            <Action
              title={`Quitar verificación ${index + 1}`}
              secondary
              disabled={items.length <= 1}
              onPress={() =>
                setItems((current) => current.filter((_, position) => position !== index))
              }
            />
          </Card>
        ))}
        <Field
          label="Agregar verificación de este servicio"
          value={newItem}
          onChangeText={setNewItem}
          maxLength={200}
        />
        <Action
          title="Añadir verificación"
          secondary
          disabled={newItem.trim().length < 3 || items.length >= 30}
          onPress={() => {
            setItems((current) => [...current, { title: newItem.trim(), passed: false }]);
            setNewItem("");
          }}
        />
        <Field
          label="Resultados, fallas o retrabajo necesario"
          value={note}
          onChangeText={setNote}
          multiline
        />
        <Action
          title="Registrar inspección QA"
          disabled={
            disabled ||
            note.trim().length < 3 ||
            items.some((item) => item.title.trim().length < 3) ||
            data.workOrder.status !== "control_calidad"
          }
          onPress={() =>
            perform(
              "qa",
              { items, note },
              items.every((item) => item.passed)
                ? "Todas las verificaciones quedaron aprobadas. Se registrará el QA antes de marcar la orden lista."
                : "Hay verificaciones fallidas. Se registrará el QA y la orden volverá a reparación con historial.",
            )
          }
        />
      </Card>
      {data.inspections.map((inspection) => (
        <Card key={inspection.id}>
          <Heading>{inspection.passed ? "QA aprobado" : "QA con fallas"}</Heading>
          <Copy>{inspection.note}</Copy>
          {inspection.items.map((item, index) => (
            <Copy key={index}>
              {item.passed ? "✓" : "Falla:"} {item.title}
            </Copy>
          ))}
        </Card>
      ))}
      <Card>
        <Heading>Entrega y cierre</Heading>
        <Field
          label="Resumen de trabajos entregados"
          value={summary}
          onChangeText={setSummary}
          multiline
        />
        <Field
          label="Condiciones de garantía del servicio"
          value={warranty}
          onChangeText={setWarranty}
          multiline
        />
        <Action
          title="Confirmar entrega al cliente"
          disabled={
            disabled ||
            data.workOrder.status !== "listo" ||
            summary.trim().length < 5 ||
            warranty.trim().length < 3
          }
          onPress={() =>
            perform(
              "deliver",
              { summary, warranty },
              "Confirma que el vehículo se entregó al cliente. El resumen y la garantía quedarán en el historial y la orden se cerrará.",
            )
          }
        />
        {data.workOrder.delivery_summary && <Copy>{data.workOrder.delivery_summary}</Copy>}
        {data.workOrder.warranty && <Copy muted>Garantía: {data.workOrder.warranty}</Copy>}
      </Card>
    </>
  );
}
