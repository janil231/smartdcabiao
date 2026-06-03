export function sanitizeForFirestore(value) {
  if (value === null) return null;
  if (value === undefined) return undefined;

  const type = typeof value;
  if (type === "string" || type === "number" || type === "boolean" || type === "bigint") {
    return value;
  }

  if (type === "function" || type === "symbol") return undefined;

  if (value instanceof Date) return value;

  if (value && typeof value === "object") {
    const ctorName = value.constructor?.name || "";
    if (
      ctorName === "Timestamp" ||
      ctorName === "GeoPoint" ||
      ctorName === "DocumentReference" ||
      ctorName === "FieldValue" ||
      (typeof value._methodName === "string")
    ) {
      return value;
    }
  }

  if (Array.isArray(value)) {
    const cleaned = value
      .map((item) => sanitizeForFirestore(item))
      .filter((item) => item !== undefined);
    return cleaned;
  }

  if (type === "object") {
    const cleaned = {};
    for (const [key, val] of Object.entries(value)) {
      const sanitized = sanitizeForFirestore(val);
      if (sanitized !== undefined) {
        cleaned[key] = sanitized;
      }
    }
    return cleaned;
  }

  return value;
}

export function stripIdField(obj) {
  if (!obj || typeof obj !== "object") return {};
  const { id, _source, ...rest } = obj;
  return rest;
}
