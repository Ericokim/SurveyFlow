/**
 * Base for errors that map to an HTTP status.
 *
 * Every error we throw on purpose carries a status, so callers can turn it into
 * a response without a pile of `instanceof` checks. Subclasses only supply a
 * message and a status; the name is taken from the class.
 */
export class AppError extends Error {
  readonly status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = new.target.name;
    this.status = status;
  }
}
