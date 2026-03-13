/**
 * Structured logger using Pino. LOG_LEVEL: debug | info | warn | error.
 * "verbose" maps to debug for backward compatibility.
 * Request ID is added when set via setRequestId (from middleware).
 */
import pino from "pino";

const LOG_LEVEL = (() => {
  const env = process.env.LOG_LEVEL?.toLowerCase();
  if (env === "verbose") return "debug";
  if (["debug", "info", "warn", "error"].includes(env ?? "")) return env;
  return process.env.NODE_ENV === "production" ? "info" : "debug";
})();

const baseLogger = pino({
  level: LOG_LEVEL,
  formatters: {
    level: (label) => ({ level: label }),
  },
});

const requestIdStore = { current: "" as string };

export function setRequestId(id: string): void {
  requestIdStore.current = id;
}

export function clearRequestId(): void {
  requestIdStore.current = "";
}

function bindings(): Record<string, string> {
  const id = requestIdStore.current;
  return id ? { requestId: id } : {};
}

export function isVerbose(): boolean {
  return baseLogger.isLevelEnabled("debug");
}

export function log(msg: string, ...args: unknown[]): void {
  if (baseLogger.isLevelEnabled("info")) {
    const formatted = args.length > 0 ? formatMsg(msg, args) : msg;
    const obj = bindings();
    if (Object.keys(obj).length > 0) {
      baseLogger.info(obj, formatted);
    } else {
      baseLogger.info(formatted);
    }
  }
}

function formatMsg(msg: string, args: unknown[]): string {
  let i = 0;
  return msg.replace(/%[sdifoO]/g, () => String(args[i++] ?? ""));
}

export function logError(msg: string, err?: unknown): void {
  const obj: Record<string, string> = { ...bindings() };
  if (err instanceof Error) {
    obj.err = err.message;
    if (err.stack) obj.stack = err.stack;
  } else if (err) {
    obj.err = String(err);
  }
  baseLogger.error(obj, msg);
}
