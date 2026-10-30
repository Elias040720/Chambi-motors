import { createHmac, randomBytes, randomInt, timingSafeEqual } from 'node:crypto';

// Reference model for synthetic contract tests ONLY.
// It has deliberately in-memory persistence and a fake messaging sink.
// Do not deploy or copy this class into the production backend.

export const GENERIC_RECOVERY_MESSAGE =
  'Si existe una orden elegible, enviaremos instrucciones al contacto registrado.';

const OTP_TTL_MS = 5 * 60 * 1000;
const SESSION_TTL_MS = 30 * 60 * 1000;
const WINDOW_MS = 10 * 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 3;
const MAX_CODE_ATTEMPTS = 5;

export function normalizePlate(plate) {
  if (typeof plate !== 'string') throw new TypeError('Placa inválida');
  const normalized = plate.toUpperCase().replace(/[\s-]/g, '');
  if (!/^[A-Z0-9]{4,9}$/.test(normalized)) throw new TypeError('Placa inválida');
  return normalized;
}

export class ReferenceWorkshop {
  constructor({ now = () => Date.now() } = {}) {
    this.now = now;
    this.orders = new Map();
    this.quotes = new Map();
    this.challenges = new Map();
    this.sessions = new Map();
    this.deliveries = []; // Fake messaging output: includes code for synthetic tests only.
    this.rateBuckets = new Map();
    this.pepper = randomBytes(32);
    this.approvals = [];
  }

  createOrder({ id, plate, status = 'active', contacts = [] }) {
    if (!id || this.orders.has(id)) throw new Error('Orden repetida o inválida');
    const normalizedPlate = normalizePlate(plate);
    const copy = contacts.map((contact) => this.#validateContact(contact));
    this.orders.set(id, {
      id,
      plate: normalizedPlate,
      status,
      contacts: copy,
      diagnoses: [],
    });
  }

  registerContact(orderId, contact) {
    const order = this.#requireOrder(orderId);
    if (order.contacts.some((row) => row.id === contact.id)) {
      throw new Error('Contacto repetido');
    }
    order.contacts.push(this.#validateContact(contact));
  }

  revokeContact(orderId, contactId) {
    const contact = this.#requireContact(orderId, contactId);
    contact.revoked = true;
    for (const [token, session] of this.sessions.entries()) {
      if (session.orderId === orderId && session.contactId === contactId) {
        this.sessions.delete(token);
      }
    }
  }

  // Public: no observable difference in response shape or message for valid/invalid plates.
  requestRecovery({ plate, clientKey = 'anonymous' }) {
    const normalizedPlate = normalizePlate(plate);
    const requestId = randomBytes(16).toString('hex');
    // Rate limits on separate dimensions; one changing source must not bypass plate quota.
    const limits = [
      this.#rateLimit(`source:${clientKey}`),
      this.#rateLimit(`plate:${normalizedPlate}`),
      this.#rateLimit(`pair:${clientKey}:${normalizedPlate}`),
    ];
    const rateAllowed = limits.every(Boolean);
    const eligible = rateAllowed ? this.#resolveRecoveryTarget(normalizedPlate) : null;
    this.#createChallenge({
      id: requestId,
      purpose: 'recovery',
      orderId: eligible?.orderId ?? null,
      contactId: eligible?.contactId ?? null,
      phone: eligible?.phone ?? null,
    });
    return { requestId, message: GENERIC_RECOVERY_MESSAGE };
  }

  verifyRecovery({ requestId, code }) {
    const challenge = this.#consumeChallenge(requestId, code, 'recovery');
    if (!challenge) return null;
    const contact = this.#findEligibleContact(
      challenge.orderId,
      challenge.contactId,
      'view_progress',
    );
    if (!contact) return null;
    const token = randomBytes(32).toString('base64url');
    this.sessions.set(token, {
      orderId: challenge.orderId,
      contactId: challenge.contactId,
      scope: 'view_progress',
      expiresAt: this.now() + SESSION_TTL_MS,
    });
    return token;
  }

  readPortalOrder({ token, requestedOrderId = undefined }) {
    const session = this.#requireSession(token);
    if (requestedOrderId && session.orderId !== requestedOrderId) {
      throw new Error('FORBIDDEN_ORDER');
    }
    const order = this.#requireOrder(session.orderId);
    return {
      orderId: order.id,
      plate: order.plate,
      status: order.status,
      diagnosis: this.#getPublishedDiagnosis(order),
    };
  }

  addDiagnosis({ orderId, kind, publicSummary, internalNotes, published = false, evidenceIds = [], supersedesRevision }) {
    const order = this.#requireOrder(orderId);
    if (!['preliminary', 'confirmed', 'correction'].includes(kind)) {
      throw new Error('Tipo de diagnóstico inválido');
    }
    if (kind === 'confirmed' && evidenceIds.length === 0) {
      throw new Error('Diagnóstico confirmado requiere evidencia');
    }
    const previous = order.diagnoses.at(-1);
    if (kind === 'correction' && (!previous || supersedesRevision !== previous.revision)) {
      throw new Error('Corrección debe referenciar última revisión');
    }
    const effectiveKind = kind === 'correction' ? previous.effectiveKind : kind;
    const revision = order.diagnoses.length + 1;
    const row = Object.freeze({
      revision,
      kind,
      effectiveKind,
      supersedesRevision: kind === 'correction' ? supersedesRevision : null,
      publicSummary,
      internalNotes,
      evidenceIds: [...evidenceIds],
      publishedAt: published ? this.now() : null,
      createdAt: this.now(),
    });
    order.diagnoses.push(row);
    return { revision, kind, effectiveKind };
  }

  createQuote({ orderId, quoteId, version, total, currency = 'PEN' }) {
    this.#requireOrder(orderId);
    if (!(Number.isInteger(version) && version > 0 && total >= 0)) {
      throw new Error('Cotización inválida');
    }
    const prior = this.quotes.get(orderId);
    if (prior && (prior.quoteId !== quoteId || version <= prior.version)) {
      throw new Error('Versión no creciente');
    }
    this.quotes.set(orderId, Object.freeze({ quoteId, version, total, currency }));
  }

  requestQuoteApproval({ orderId, quoteId, version, contactId }) {
    const quote = this.quotes.get(orderId);
    if (!quote || quote.quoteId !== quoteId || quote.version !== version) {
      throw new Error('Cotización inexistente u obsoleta');
    }
    const contact = this.#findEligibleContact(orderId, contactId, 'approve_quote');
    if (!contact) throw new Error('AUTORIZANTE_NO_VALIDADO');
    if (contact.type === 'representative' && !contact.delegationVerified) {
      throw new Error('DELEGACION_NO_VALIDADA');
    }
    const id = randomBytes(16).toString('hex');
    this.#createChallenge({
      id,
      purpose: 'approve_quote',
      orderId,
      contactId,
      phone: contact.phone,
      quote: { ...quote },
    });
    return id;
  }

  approveQuote({ challengeId, code, orderId, contactId, quoteId, version, total, currency = 'PEN' }) {
    const challenge = this.challenges.get(challengeId);
    if (!challenge || challenge.purpose !== 'approve_quote') return false;
    const current = this.quotes.get(orderId);
    if (!current || current.quoteId !== quoteId || current.version !== version ||
      current.total !== total || current.currency !== currency) return false;
    const original = challenge.quote;
    if (challenge.orderId !== orderId || challenge.contactId !== contactId ||
      original.quoteId !== quoteId || original.version !== version ||
      original.total !== total || original.currency !== currency) return false;
    const contact = this.#findEligibleContact(orderId, contactId, 'approve_quote');
    if (!contact || (contact.type === 'representative' && !contact.delegationVerified)) return false;
    if (!this.#consumeChallenge(challengeId, code, 'approve_quote')) return false;
    this.approvals.push(Object.freeze({
      orderId, contactId, quoteId, version, total, currency, approvedAt: this.now(),
    }));
    return true;
  }

  #getPublishedDiagnosis(order) {
    const published = order.diagnoses.filter((row) => row.publishedAt !== null);
    const latest = published.at(-1);
    if (!latest) return null;
    return {
      revision: latest.revision,
      label: latest.effectiveKind === 'preliminary'
        ? 'Evaluación inicial, pendiente de confirmar'
        : 'Diagnóstico confirmado',
      summary: latest.publicSummary,
      updatedAt: latest.publishedAt,
    };
  }

  #validateContact(contact) {
    if (!contact?.id || !/^\+[1-9]\d{7,14}$/.test(contact.phone ?? '')) {
      throw new Error('Contacto inválido');
    }
    return {
      id: contact.id,
      phone: contact.phone,
      type: contact.type ?? 'client',
      verifiedAt: contact.verifiedAt ?? null,
      verificationMethod: contact.verificationMethod ?? null,
      scopes: [...(contact.scopes ?? [])],
      delegationVerified: Boolean(contact.delegationVerified),
      revoked: Boolean(contact.revoked),
    };
  }

  #requireOrder(orderId) {
    const order = this.orders.get(orderId);
    if (!order) throw new Error('Orden no encontrada');
    return order;
  }

  #requireContact(orderId, contactId) {
    const contact = this.#requireOrder(orderId).contacts.find((row) => row.id === contactId);
    if (!contact) throw new Error('Contacto no encontrado');
    return contact;
  }

  #findEligibleContact(orderId, contactId, scope) {
    if (!orderId || !contactId) return null;
    const order = this.orders.get(orderId);
    const contact = order?.contacts.find((row) => row.id === contactId);
    if (order?.status !== 'active' || !contact || contact.revoked ||
      !contact.verifiedAt || !contact.verificationMethod || !contact.scopes.includes(scope)) return null;
    return contact;
  }

  #resolveRecoveryTarget(plate) {
    const matches = [...this.orders.values()].filter((order) => order.plate === plate && order.status === 'active');
    if (matches.length !== 1) return null;
    const order = matches[0];
    const eligible = order.contacts.filter((contact) =>
      contact.type === 'client' && this.#findEligibleContact(order.id, contact.id, 'view_progress'),
    );
    if (eligible.length !== 1) return null;
    return { orderId: order.id, contactId: eligible[0].id, phone: eligible[0].phone };
  }

  #rateLimit(bucketKey) {
    const valid = (this.rateBuckets.get(bucketKey) ?? []).filter((timestamp) =>
      timestamp > this.now() - WINDOW_MS,
    );
    valid.push(this.now());
    this.rateBuckets.set(bucketKey, valid);
    return valid.length <= MAX_REQUESTS_PER_WINDOW;
  }

  #digest(id, purpose, code) {
    return createHmac('sha256', this.pepper).update(`${id}:${purpose}:${code}`).digest();
  }

  #createChallenge({ id, purpose, orderId, contactId, phone, quote = null }) {
    const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
    this.challenges.set(id, {
      id, purpose, orderId, contactId, phone,
      digest: this.#digest(id, purpose, code),
      expiresAt: this.now() + OTP_TTL_MS,
      consumedAt: null,
      attempts: 0,
      quote,
    });
    if (phone) this.deliveries.push({ challengeId: id, purpose, to: phone, code });
  }

  #consumeChallenge(id, code, expectedPurpose) {
    const challenge = this.challenges.get(id);
    if (!challenge || challenge.purpose !== expectedPurpose || challenge.consumedAt !== null ||
      challenge.expiresAt <= this.now() || challenge.attempts >= MAX_CODE_ATTEMPTS) return null;
    challenge.attempts += 1;
    const candidate = typeof code === 'string' && /^\d{6}$/.test(code)
      ? this.#digest(id, expectedPurpose, code)
      : Buffer.alloc(32);
    if (!timingSafeEqual(candidate, challenge.digest)) return null;
    challenge.consumedAt = this.now();
    return challenge;
  }

  #requireSession(token) {
    const session = this.sessions.get(token);
    if (!session || session.scope !== 'view_progress' || session.expiresAt <= this.now()) {
      throw new Error('UNAUTHORIZED');
    }
    if (!this.#findEligibleContact(session.orderId, session.contactId, 'view_progress')) {
      throw new Error('UNAUTHORIZED');
    }
    return session;
  }
}
