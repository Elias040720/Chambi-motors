# Evidencia y provenance

## Fase 1.1

`verify_evidence.py` valida únicamente la forma documental: `check`, `claim` y `provenance`. Una frase, salida copiada, comando escrito o campo JSON con `status: passed` sigue siendo una **afirmación**, no una observación verificada. El validador siempre devuelve `execution_observation: unverified`; no contiene ruta para emitir aprobación. El arreglo vacío es inválido.

No registrar stdout/stderr completos, secretos, tokens, datos personales ni variables de entorno. El registro futuro usa digest SHA-256 del artefacto y referencias redactadas, no el contenido sensible.

## Diseño de provenance para Fase 2

1. El host o runner de pruebas observa el proceso y produce un evento estructurado fuera del control del modelo: `producer`, `event_id`, `event_type`, `observed_at`, `artifact_digest`, `signer_key_id` y `signature`.
2. El manifiesto de claves públicas confiables lo entrega el adaptador del host desde su configuración confiable; nunca se acepta una clave pública o permiso de ejecución propuesto dentro del mismo JSON del modelo.
3. La firma cubre una serialización canónica de identidad del check, comando normalizado sin secretos, exit code/resultado resumido, timestamp, digest y request id. El evento almacena el mínimo; datos sin redacción se descartan.
4. El verificador de Fase 2 valida la firma contra la clave anclada al host, vigencia/replay (`event_id`), integridad del digest y la correspondencia del check con la tarea. Sin firma válida, queda `unverified`.
5. Un resultado válido acredita solo ese check en ese entorno y momento. No certifica seguridad global ni habilita por sí solo despliegues o cambios privilegiados.

Fase 1.1 no implementa firma, ejecución de comandos ni lectura de credenciales.
