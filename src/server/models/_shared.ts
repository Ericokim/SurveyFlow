import type { SchemaOptions } from "mongoose";

/**
 * Serialize documents to the ambient shapes declared in `type.d.ts`:
 * `_id` becomes a string `id`, `__v` is dropped, and Date values become ISO
 * strings so a server function's return value matches the client's type
 * without a second mapping step.
 */
const transform = (
  _doc: unknown,
  ret: Record<string, unknown>,
): Record<string, unknown> => {
  if (ret._id != null) {
    ret.id = String(ret._id);
    delete ret._id;
  }

  delete ret.__v;

  for (const [key, value] of Object.entries(ret)) {
    if (value instanceof Date) ret[key] = value.toISOString();
  }

  return ret;
};

/**
 * Spread into every schema so serialization is consistent across models.
 *
 * Note: each model registers itself with `mongoose.models.X ?? mongoose.model(…)`
 * — Vite HMR re-evaluates model modules, and a bare `mongoose.model()` on the
 * second evaluation throws `OverwriteModelError`.
 */
export const baseSchemaOptions: SchemaOptions = {
  timestamps: true,
  toJSON: { virtuals: false, versionKey: false, transform },
  toObject: { virtuals: false, versionKey: false, transform },
};
