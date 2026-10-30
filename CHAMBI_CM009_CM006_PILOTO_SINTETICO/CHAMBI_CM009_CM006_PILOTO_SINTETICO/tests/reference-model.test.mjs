import test from 'node:test';
import assert from 'node:assert/strict';
import {
  GENERIC_RECOVERY_MESSAGE,
  ReferenceWorkshop,
  normalizePlate,
} from '../src/reference-model.mjs';

function setup() {
  let clock = 1_800_000_000_000;
  const model = new ReferenceWorkshop({ now: () => clock });
  const primary = {
    id: 'customer-A',
    phone: '+51911111111',
    type: 'client',
    verifiedAt: '2026-10-29T12:00:00Z',
    verificationMethod: 'intake-otp',
    scopes: ['view_progress', 'approve_quote'],
  };
  const representative = {
    id: 'rep-A',
    phone: '+51922222222',
    type: 'representative',
    verifiedAt: '2026-10-29T12:05:00Z',
    verificationMethod: 'intake-otp',
    delegationVerified: true,
    scopes: ['view_progress', 'approve_quote'],
  };
  model.createOrder({ id: 'OT-A', plate: 'ABC-123', contacts: [primary, representative] });
  model.createOrder({
    id: 'OT-B',
    plate: 'XYZ-987',
    contacts: [{ ...primary, id: 'customer-B', phone: '+51933333333' }],
  });
  return { model, primary, representative, advance: (milliseconds) => { clock += milliseconds; } };
}

function lastCode(model, challengeId) {
  const delivery = model.deliveries.find((row) => row.challengeId === challengeId);
  assert.ok(delivery, 'El proveedor sintético debe recibir el OTP');
  return delivery.code;
}

function recoverySession(model, plate = 'ABC-123') {
  const response = model.requestRecovery({ plate });
  const code = lastCode(model, response.requestId);
  const token = model.verifyRecovery({ requestId: response.requestId, code });
  assert.ok(token);
  return token;
}

test('R00 normaliza placa y rechaza entradas inválidas', () => {
  assert.equal(normalizePlate(' abc-123 '), 'ABC123');
  assert.throws(() => normalizePlate('xx'), /inválida/);
});

test('R01 una placa inexistente produce la misma forma y mensaje que la existente', () => {
  const { model } = setup();
  const a = model.requestRecovery({ plate: 'ABC123', clientKey: 'ip1' });
  const b = model.requestRecovery({ plate: 'N0EX15', clientKey: 'ip2' });
  assert.deepEqual(Object.keys(a), Object.keys(b));
  assert.equal(a.message, GENERIC_RECOVERY_MESSAGE);
  assert.equal(a.message, b.message);
  assert.match(a.requestId, /^[a-f0-9]{32}$/);
  assert.match(b.requestId, /^[a-f0-9]{32}$/);
  assert.equal(model.deliveries.length, 1, 'No se envía mensaje a placa inexistente');
});

test('R02 no se envía OTP a un teléfono no verificado', () => {
  const { model } = setup();
  model.createOrder({ id: 'OT-C', plate: 'TST-123', contacts: [{
    id: 'unverified', phone: '+51944444444', type: 'client', scopes: ['view_progress'],
  }] });
  const response = model.requestRecovery({ plate: 'TST123' });
  assert.equal(model.deliveries.length, 0);
  assert.equal(model.verifyRecovery({ requestId: response.requestId, code: '000000' }), null);
});

test('R03 recuperación se envía solo al teléfono principal previamente verificado', () => {
  const { model } = setup();
  const response = model.requestRecovery({ plate: 'abc-123' });
  assert.equal(model.deliveries.length, 1);
  assert.equal(model.deliveries[0].to, '+51911111111');
  assert.equal(model.deliveries[0].purpose, 'recovery');
  assert.equal(model.deliveries[0].challengeId, response.requestId);
});

test('R04 OTP correcto entrega sesión limitada y proyección sin notas privadas', () => {
  const { model } = setup();
  model.addDiagnosis({
    orderId: 'OT-A', kind: 'preliminary', publicSummary: 'Ruido en frenos',
    internalNotes: 'Proveedor caro, nota estrictamente interna', published: true,
  });
  const token = recoverySession(model);
  const view = model.readPortalOrder({ token });
  assert.equal(view.orderId, 'OT-A');
  assert.equal(view.diagnosis.summary, 'Ruido en frenos');
  assert.ok(!JSON.stringify(view).includes('Proveedor caro'));
});

test('R05 OTP consumido no puede reutilizarse', () => {
  const { model } = setup();
  const response = model.requestRecovery({ plate: 'ABC123' });
  const code = lastCode(model, response.requestId);
  assert.ok(model.verifyRecovery({ requestId: response.requestId, code }));
  assert.equal(model.verifyRecovery({ requestId: response.requestId, code }), null);
});

test('R06 OTP vencido a los cinco minutos es rechazado', () => {
  const { model, advance } = setup();
  const response = model.requestRecovery({ plate: 'ABC123' });
  const code = lastCode(model, response.requestId);
  advance(5 * 60 * 1000);
  assert.equal(model.verifyRecovery({ requestId: response.requestId, code }), null);
});

test('R07 cinco intentos fallidos bloquean ese desafío, incluso si luego se acierta', () => {
  const { model } = setup();
  const response = model.requestRecovery({ plate: 'ABC123' });
  const actual = lastCode(model, response.requestId);
  const incorrect = actual === '000000' ? '000001' : '000000';
  for (let i = 0; i < 5; i += 1) {
    assert.equal(model.verifyRecovery({ requestId: response.requestId, code: incorrect }), null);
  }
  assert.equal(model.verifyRecovery({ requestId: response.requestId, code: actual }), null);
});

test('R08 límite sintético por placa y origen evita mensajes sucesivos', () => {
  const { model } = setup();
  for (let i = 0; i < 4; i += 1) {
    const response = model.requestRecovery({ plate: 'ABC123', clientKey: 'ip1' });
    assert.equal(response.message, GENERIC_RECOVERY_MESSAGE);
  }
  assert.equal(model.deliveries.length, 3);
});

test('R08b cambiar origen no permite superar la cuota de una placa', () => {
  const { model } = setup();
  for (let i = 0; i < 5; i += 1) {
    model.requestRecovery({ plate: 'ABC123', clientKey: `ip-${i}` });
  }
  assert.equal(model.deliveries.length, 3);
});

test('R08c consultar varias placas no permite superar la cuota por origen', () => {
  const { model } = setup();
  for (const plate of ['ABC123', 'XYZ987', 'N0EX15', 'TST123', 'TST124']) {
    model.requestRecovery({ plate, clientKey: 'same-source' });
  }
  assert.equal(model.deliveries.length, 2);
});

test('R09 dos órdenes activas con la misma placa no eligen una al azar', () => {
  const { model, primary } = setup();
  model.createOrder({ id: 'OT-C', plate: 'ABC-123', contacts: [{ ...primary, id: 'other' }] });
  const response = model.requestRecovery({ plate: 'ABC123' });
  assert.equal(response.message, GENERIC_RECOVERY_MESSAGE);
  assert.equal(model.deliveries.length, 0);
});

test('R10 revocar contacto después de generar código impide abrir sesión', () => {
  const { model } = setup();
  const response = model.requestRecovery({ plate: 'ABC123' });
  const code = lastCode(model, response.requestId);
  model.revokeContact('OT-A', 'customer-A');
  assert.equal(model.verifyRecovery({ requestId: response.requestId, code }), null);
});

test('R11 una sesión de OT-A no puede leer OT-B', () => {
  const { model } = setup();
  const token = recoverySession(model);
  assert.throws(() => model.readPortalOrder({ token, requestedOrderId: 'OT-B' }), /FORBIDDEN_ORDER/);
});

test('R12 OTP de recuperación nunca autoriza presupuesto', () => {
  const { model } = setup();
  model.createQuote({ orderId: 'OT-A', quoteId: 'Q-A', version: 1, total: 600 });
  const recovery = model.requestRecovery({ plate: 'ABC123' });
  assert.equal(model.approveQuote({
    challengeId: recovery.requestId,
    code: lastCode(model, recovery.requestId),
    orderId: 'OT-A', contactId: 'customer-A', quoteId: 'Q-A', version: 1, total: 600,
  }), false);
});

test('R13 representante sin permiso o sin delegación verificada no aprueba', () => {
  const { model, representative } = setup();
  model.createQuote({ orderId: 'OT-A', quoteId: 'Q-A', version: 1, total: 600 });
  model.registerContact('OT-A', { ...representative, id: 'rep-without-scope', scopes: ['view_progress'] });
  model.registerContact('OT-A', { ...representative, id: 'rep-without-delegation', delegationVerified: false });
  assert.throws(() => model.requestQuoteApproval({
    orderId: 'OT-A', quoteId: 'Q-A', version: 1, contactId: 'rep-without-scope',
  }), /AUTORIZANTE_NO_VALIDADO/);
  assert.throws(() => model.requestQuoteApproval({
    orderId: 'OT-A', quoteId: 'Q-A', version: 1, contactId: 'rep-without-delegation',
  }), /DELEGACION_NO_VALIDADA/);
});

test('R14 representante registrado/verificado aprueba versión y total exactos', () => {
  const { model } = setup();
  model.createQuote({ orderId: 'OT-A', quoteId: 'Q-A', version: 1, total: 600 });
  const challengeId = model.requestQuoteApproval({
    orderId: 'OT-A', quoteId: 'Q-A', version: 1, contactId: 'rep-A',
  });
  assert.ok(model.approveQuote({
    challengeId, code: lastCode(model, challengeId), orderId: 'OT-A', contactId: 'rep-A',
    quoteId: 'Q-A', version: 1, total: 600,
  }));
  assert.equal(model.approvals.length, 1);
  assert.equal(model.approvals[0].contactId, 'rep-A');
  assert.equal(model.approvals[0].currency, 'PEN');
});

test('R15 nueva versión impide aprobar con OTP ligado a versión anterior', () => {
  const { model } = setup();
  model.createQuote({ orderId: 'OT-A', quoteId: 'Q-A', version: 1, total: 600 });
  const challengeId = model.requestQuoteApproval({
    orderId: 'OT-A', quoteId: 'Q-A', version: 1, contactId: 'rep-A',
  });
  model.createQuote({ orderId: 'OT-A', quoteId: 'Q-A', version: 2, total: 800 });
  assert.equal(model.approveQuote({
    challengeId, code: lastCode(model, challengeId), orderId: 'OT-A', contactId: 'rep-A',
    quoteId: 'Q-A', version: 1, total: 600,
  }), false);
  assert.equal(model.approvals.length, 0);
});

test('R16 aprobación remota del modelo es de un solo uso', () => {
  const { model } = setup();
  model.createQuote({ orderId: 'OT-A', quoteId: 'Q-A', version: 1, total: 600 });
  const challengeId = model.requestQuoteApproval({
    orderId: 'OT-A', quoteId: 'Q-A', version: 1, contactId: 'rep-A',
  });
  const input = {
    challengeId, code: lastCode(model, challengeId), orderId: 'OT-A',
    contactId: 'rep-A', quoteId: 'Q-A', version: 1, total: 600,
  };
  assert.equal(model.approveQuote(input), true);
  assert.equal(model.approveQuote(input), false);
  assert.equal(model.approvals.length, 1);
});

test('R17 el teléfono revocado invalida incluso la sesión ya emitida', () => {
  const { model } = setup();
  const token = recoverySession(model);
  model.revokeContact('OT-A', 'customer-A');
  assert.throws(() => model.readPortalOrder({ token }), /UNAUTHORIZED/);
});

test('R18 la sesión de recuperación caduca y no permite lectura', () => {
  const { model, advance } = setup();
  const token = recoverySession(model);
  advance(30 * 60 * 1000);
  assert.throws(() => model.readPortalOrder({ token }), /UNAUTHORIZED/);
});

test('D01 una evaluación preliminar publicada se identifica como no confirmada', () => {
  const { model } = setup();
  model.addDiagnosis({
    orderId: 'OT-A', kind: 'preliminary', publicSummary: 'Se escuchó un ruido',
    internalNotes: 'No se ha desmontado', published: true,
  });
  const view = model.readPortalOrder({ token: recoverySession(model) });
  assert.equal(view.diagnosis.label, 'Evaluación inicial, pendiente de confirmar');
});

test('D02 notas internas y revisiones no publicadas no salen en portal', () => {
  const { model } = setup();
  model.addDiagnosis({
    orderId: 'OT-A', kind: 'preliminary', publicSummary: 'Falla por confirmar',
    internalNotes: 'Proveedor y precio interno', published: false,
  });
  assert.equal(model.readPortalOrder({ token: recoverySession(model) }).diagnosis, null);
});

test('D03 confirmado exige evidencia y se muestra como confirmado', () => {
  const { model } = setup();
  assert.throws(() => model.addDiagnosis({
    orderId: 'OT-A', kind: 'confirmed', publicSummary: 'Revisado',
    internalNotes: 'Interno', published: true,
  }), /evidencia/);
  model.addDiagnosis({
    orderId: 'OT-A', kind: 'confirmed', publicSummary: 'Pastillas gastadas',
    internalNotes: 'Nota de mano de obra', evidenceIds: ['foto-test-01'], published: true,
  });
  assert.equal(model.readPortalOrder({ token: recoverySession(model) }).diagnosis.label, 'Diagnóstico confirmado');
});

test('D04 corrección crea revisión sin borrar el diagnóstico previo', () => {
  const { model } = setup();
  model.addDiagnosis({
    orderId: 'OT-A', kind: 'preliminary', publicSummary: 'Revisar frenos',
    internalNotes: 'Primera revisión', published: true,
  });
  model.addDiagnosis({
    orderId: 'OT-A', kind: 'correction', publicSummary: 'Revisar frenos delanteros',
    internalNotes: 'Corrección después de inspección', supersedesRevision: 1, published: true,
  });
  const view = model.readPortalOrder({ token: recoverySession(model) });
  assert.equal(view.diagnosis.revision, 2);
  assert.equal(view.diagnosis.summary, 'Revisar frenos delanteros');
  assert.equal(model.orders.get('OT-A').diagnoses[0].publicSummary, 'Revisar frenos');
});

test('D05 una sesión de OT B nunca puede consultar diagnóstico de OT A', () => {
  const { model } = setup();
  const token = recoverySession(model, 'XYZ987');
  assert.throws(() => model.readPortalOrder({ token, requestedOrderId: 'OT-A' }), /FORBIDDEN_ORDER/);
});

test('D06 cambiar diagnóstico no reescribe una aprobación versionada anterior', () => {
  const { model } = setup();
  model.createQuote({ orderId: 'OT-A', quoteId: 'Q-A', version: 1, total: 600 });
  const challengeId = model.requestQuoteApproval({
    orderId: 'OT-A', quoteId: 'Q-A', version: 1, contactId: 'rep-A',
  });
  assert.ok(model.approveQuote({
    challengeId, code: lastCode(model, challengeId), orderId: 'OT-A', contactId: 'rep-A',
    quoteId: 'Q-A', version: 1, total: 600,
  }));
  model.addDiagnosis({
    orderId: 'OT-A', kind: 'confirmed', publicSummary: 'Falla específica',
    internalNotes: 'Revisión', evidenceIds: ['test-1'], published: true,
  });
  assert.equal(model.approvals[0].total, 600);
  assert.equal(model.approvals[0].version, 1);
});
