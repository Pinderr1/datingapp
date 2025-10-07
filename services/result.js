export function success(data) {
  return typeof data === 'undefined' ? { ok: true } : { ok: true, data };
}

export function failure(code, message) {
  const error = { code };
  if (message) {
    error.message = message;
  }
  return { ok: false, error };
}
