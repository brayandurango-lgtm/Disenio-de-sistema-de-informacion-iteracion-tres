// Registro mínimo de eventos. NUNCA registrar contraseñas, tokens ni secretos.
function linea(nivel, msg, extra) {
  const entrada = { ts: new Date().toISOString(), nivel, msg };
  if (extra) entrada.extra = extra;
  const texto = JSON.stringify(entrada);
  if (nivel === 'error') console.error(texto);
  else console.log(texto);
}

export const logger = {
  info: (msg, extra) => linea('info', msg, extra),
  warn: (msg, extra) => linea('warn', msg, extra),
  error: (msg, extra) => linea('error', msg, extra),
};
