import { NextResponse } from "next/server";

export type ErrorKey =
  | "InvalidParametersError"
  | "AuthenticationError"
  | "PermissionsError"
  | "NotFoundError"
  | "DuplicateEntryError"
  | "UnsupportedMediaTypeError"
  | "InvalidCreationError"
  | "InvalidUpdateError"
  | "InvalidDeletionError"
  | "RateLimitError"
  | "InternalServerError";

export type APIError = {
  code: number; // HTTP status code (e.g. 400)
  message: string;
  detail?: string;
};

/** Single source of truth: status + default messages */
const ERROR_CATALOG: Record<ErrorKey, { status: number; defaultMessage: string }> = {
  InvalidParametersError: { status: 400, defaultMessage: "Invalid parameters provided" },
  AuthenticationError: { status: 401, defaultMessage: "Unauthorised usage of the API" }, // keep spelling if you prefer
  PermissionsError: { status: 403, defaultMessage: "Insufficient permissions to use API" },
  NotFoundError: { status: 404, defaultMessage: "Specified resource(s) was not found" },
  DuplicateEntryError: { status: 409, defaultMessage: "Attempt to create duplicate entry" },
  UnsupportedMediaTypeError: {
    status: 415,
    defaultMessage: "Unsupported media content was uploaded to the server",
  },
  InvalidCreationError: { status: 422, defaultMessage: "Unable to create resource" },
  InvalidUpdateError: { status: 422, defaultMessage: "Unable to update resource" },
  InvalidDeletionError: { status: 422, defaultMessage: "Unable to delete resource" },
  RateLimitError: { status: 429, defaultMessage: "API was invoked too many times" },
  InternalServerError: { status: 500, defaultMessage: "Internal server error" },
};

export function apiError(
  key: ErrorKey,
  opts?: Partial<Pick<APIError, "message" | "detail">> & Record<string, unknown>
) {
  const def = ERROR_CATALOG[key];
  const message: string = opts?.message ?? def.defaultMessage;
  const body: APIError & Record<string, unknown> = {
    code: def.status,
    message: message,
    ...(opts?.detail ? { detail: opts.detail } : {}),
  };

  return new NextResponse(JSON.stringify(body), {
    status: def.status,
    headers: { "content-type": "application/json" },
  });
}

/** Convenience shorthands (optional) */
export const Err = {
  badParams: (msg?: string, extras?: Record<string, unknown>) =>
    apiError("InvalidParametersError", { message: msg, ...extras }),
  unauthorized: (msg?: string, extras?: Record<string, unknown>) =>
    apiError("AuthenticationError", { message: msg, ...extras }),
  forbidden: (msg?: string, extras?: Record<string, unknown>) =>
    apiError("PermissionsError", { message: msg, ...extras }),
  notFound: (msg?: string, extras?: Record<string, unknown>) =>
    apiError("NotFoundError", { message: msg, ...extras }),
  conflict: (msg?: string, extras?: Record<string, unknown>) =>
    apiError("DuplicateEntryError", { message: msg, ...extras }),
  unsupported: (msg?: string, extras?: Record<string, unknown>) =>
    apiError("UnsupportedMediaTypeError", { message: msg, ...extras }),
  invalidCreate: (msg?: string, extras?: Record<string, unknown>) =>
    apiError("InvalidCreationError", { message: msg, ...extras }),
  invalidUpdate: (msg?: string, extras?: Record<string, unknown>) =>
    apiError("InvalidUpdateError", { message: msg, ...extras }),
  invalidDelete: (msg?: string, extras?: Record<string, unknown>) =>
    apiError("InvalidDeletionError", { message: msg, ...extras }),
  rateLimited: (msg?: string, extras?: Record<string, unknown>) =>
    apiError("RateLimitError", { message: msg, ...extras }),
  internal: (msg?: string, extras?: Record<string, unknown>) =>
    apiError("InternalServerError", { message: msg, ...extras }),
};
