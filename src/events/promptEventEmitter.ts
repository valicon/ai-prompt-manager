import { EventEmitter } from "events";

/**
 * Singleton event emitter for new prompt records.
 * Emits "prompt" events after each successful insertPrompt.
 * SSE clients subscribe via GET /api/events.
 */
export const promptEventEmitter = new EventEmitter();
