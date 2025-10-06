export function success(data) {
  return typeof data === 'undefined' ? { ok: true } : { ok: true, data };
}

export function failure(code, message, details) {
  const error = { code };
  if (message) {
    error.message = message;
  }
  if (typeof details !== 'undefined') {
    error.details = details;
  }
  return { ok: false, error };
}
