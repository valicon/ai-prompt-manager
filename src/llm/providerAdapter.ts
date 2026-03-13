import { log, logError } from "../utils/logger";

export type Provider = "openai" | "openrouter" | "ollama" | "groq";

let configLogged = false;

function logConfigOnce(provider: Provider, url: string, apiKey: string | undefined): void {
  if (configLogged) return;
  configLogged = true;
  const keyStatus = provider === "ollama" ? "n/a" : apiKey?.trim() ? "present" : "missing";
  log("Provider: %s, URL: %s, key: %s", provider, url, keyStatus);
}

/** Call at startup so config is logged immediately; avoids duplicate log on first request */
export function logProviderConfig(): void {
  const provider = getProvider();
  const { url, apiKey } = getProviderConfig(provider);
  logConfigOnce(provider, url, apiKey);
}

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface CreateChatCompletionOptions {
  model?: string;
  response_format?: { type: "json_object" };
}

export interface ChatCompletionResponse {
  choices: Array<{ message?: { content?: string } }>;
}

const PROVIDER_CONFIG: Record<
  Provider,
  { urlEnv: string; keyEnv: string; defaultUrl: string }
> = {
  openai: {
    urlEnv: "OPENAI_API_URL",
    keyEnv: "OPENAI_KEY",
    defaultUrl: "https://api.openai.com/v1",
  },
  openrouter: {
    urlEnv: "OPENROUTER_API_URL",
    keyEnv: "OPENROUTER_API_KEY",
    defaultUrl: "https://openrouter.ai/api/v1",
  },
  ollama: {
    urlEnv: "OLLAMA_BASE_URL",
    keyEnv: "",
    defaultUrl: "http://localhost:11434",
  },
  groq: {
    urlEnv: "GROQ_API_URL",
    keyEnv: "GROQ_API_KEY",
    defaultUrl: "https://api.groq.com/openai/v1",
  },
};

export function getProvider(): Provider {
  const raw = process.env.LLM_PROVIDER?.toLowerCase();
  if (raw === "openrouter" || raw === "ollama" || raw === "groq") return raw;
  return "openai";
}

export function getProviderConfig(provider: Provider): {
  url: string;
  apiKey: string | undefined;
} {
  const config = PROVIDER_CONFIG[provider];
  const url = (process.env[config.urlEnv] ?? config.defaultUrl).replace(/\/$/, "");
  const apiKey = config.keyEnv ? process.env[config.keyEnv] : undefined;
  return { url, apiKey };
}

export function hasValidConfig(provider: Provider): boolean {
  if (provider === "ollama") return true;
  const { apiKey } = getProviderConfig(provider);
  return Boolean(apiKey?.trim());
}

export function getKeyEnvName(provider: Provider): string {
  return PROVIDER_CONFIG[provider].keyEnv;
}

export async function createChatCompletion(
  messages: ChatMessage[],
  options: CreateChatCompletionOptions = {}
): Promise<ChatCompletionResponse> {
  const provider = getProvider();
  const { url, apiKey } = getProviderConfig(provider);
  logConfigOnce(provider, url, apiKey);

  if (provider !== "ollama" && !apiKey) {
    const msg = `Missing API key for provider ${provider}. Set ${PROVIDER_CONFIG[provider].keyEnv}.`;
    logError("LLM config error", new Error(msg));
    log("Remediation: Set %s in .env", PROVIDER_CONFIG[provider].keyEnv);
    throw new Error(msg);
  }

  const model = options.model ?? getDefaultModel(provider);
  const body: Record<string, unknown> = {
    model,
    messages: messages.map((m) => ({ role: m.role, content: m.content })),
  };
  if (options.response_format) {
    body.response_format = options.response_format;
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (apiKey) {
    headers["Authorization"] = `Bearer ${apiKey}`;
  }

  const endpoint = `${url}/chat/completions`;
  const res = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errText = await res.text();
    const err = new Error(`LLM request failed: ${res.status} ${errText}`);
    logError("LLM request failed", err);
    const hint =
      res.status === 401
        ? "Check API key validity"
        : res.status >= 500
          ? "Provider may be down, retry later"
          : "Check request and provider config";
    log("Remediation: %s", hint);
    throw err;
  }

  return res.json() as Promise<ChatCompletionResponse>;
}

/**
 * Forward a raw chat completion request to the configured provider.
 * Used by the proxy to pass through the client's request.
 */
export async function forwardChatCompletion(
  body: Record<string, unknown>
): Promise<Response> {
  const provider = getProvider();
  const { url, apiKey } = getProviderConfig(provider);
  logConfigOnce(provider, url, apiKey);

  if (provider !== "ollama" && !apiKey) {
    const msg = `Missing API key for provider ${provider}. Set ${PROVIDER_CONFIG[provider].keyEnv}.`;
    logError("LLM config error", new Error(msg));
    log("Remediation: Set %s in .env", PROVIDER_CONFIG[provider].keyEnv);
    throw new Error(msg);
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (apiKey) {
    headers["Authorization"] = `Bearer ${apiKey}`;
  }

  const endpoint = `${url}/chat/completions`;
  const res = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    logError("Upstream LLM failed", new Error(`HTTP ${res.status}`));
    const hint =
      res.status === 401
        ? "Check API key validity"
        : res.status >= 500
          ? "Provider may be down"
          : "Check request";
    log("Remediation: %s", hint);
  }
  return res;
}

function getDefaultModel(provider: Provider): string {
  const override = process.env.LLM_REWRITE_MODEL;
  if (override) return override;

  switch (provider) {
    case "openai":
      return "gpt-4o-mini";
    case "openrouter":
      return "openrouter/free";
    case "ollama":
      return "llama3";
    case "groq":
      return "llama-3.3-70b-versatile";
    default:
      return "gpt-4o-mini";
  }
}
