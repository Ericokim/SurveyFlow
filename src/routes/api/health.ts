import { createFileRoute } from "@tanstack/react-router";
import mongoose from "mongoose";

/**
 * Liveness and dependency check.
 *
 * One of the few things allowed to be an API route rather than a server
 * function (AGENTS.md §9). Always returns 200 when the process is up — a
 * missing database is reported in the body, not by failing the request, so
 * local startup without MongoDB stays possible (docs/production-rules.md).
 */
const DB_STATES = ["disconnected", "connected", "connecting", "disconnecting"];

export const Route = createFileRoute("/api/health")({
  server: {
    handlers: {
      GET: () =>
        Response.json({
          status: "ok",
          database: DB_STATES[mongoose.connection.readyState] ?? "unknown",
          uptime: Math.round(process.uptime()),
        }),
    },
  },
});
