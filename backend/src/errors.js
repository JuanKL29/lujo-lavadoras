export class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export function requireFields(body, fields) {
  const missing = fields.filter((field) => {
    const value = body?.[field];
    return value === undefined || value === null || String(value).trim() === '';
  });
  if (missing.length) {
    throw new HttpError(400, `Faltan campos obligatorios: ${missing.join(', ')}`);
  }
}

export function parseDate(value, field) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(value || ''))) {
    throw new HttpError(400, `La fecha "${field}" debe tener el formato AAAA-MM-DD`);
  }
  return value;
}

export function errorHandler(error, _req, res, _next) {
  if (error instanceof HttpError) {
    return res.status(error.status).json({ error: error.message });
  }
  if (error?.code === 'ER_DUP_ENTRY') {
    return res.status(409).json({ error: 'Ya existe un registro con esos datos' });
  }
  if (error?.code === 'ER_ROW_IS_REFERENCED_2') {
    return res.status(409).json({
      error: 'No se puede eliminar: el registro está siendo usado por otro',
    });
  }
  if (error?.code === 'ER_NO_REFERENCED_ROW_2' || error?.code === 'ER_NO_REFERENCED_ROW') {
    return res.status(409).json({
      error: 'El registro relacionado no existe. Revisa la selección.',
    });
  }
  console.error(error);
  return res.status(500).json({ error: 'Error interno del servidor' });
}
