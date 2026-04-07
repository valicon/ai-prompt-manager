import { useState, useEffect } from "react";

interface DiffChange {
  value: string;
  added?: boolean;
  removed?: boolean;
}

interface PromptRecord {
  id: number;
  original: string;
  improved: string;
  score: number;
  warnings: string[];
  rewriteSucceeded: boolean;
  createdAt: string;
  feedback: string | null;
  pinned: boolean;
  diff?: DiffChange[];
}

interface PromptDetailModalProps {
  promptId: number | null;
  onClose: () => void;
  onRecordUpdate?: (record: PromptRecord) => void;
  apiBase?: string;
}

export default function PromptDetailModal({
  promptId,
  onClose,
  onRecordUpdate,
  apiBase = "/api",
}: PromptDetailModalProps) {
  const [record, setRecord] = useState<PromptRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState<"original" | "improved" | null>(null);
  const [promoteResult, setPromoteResult] = useState<string | null>(null);

  useEffect(() => {
    if (!promptId) {
      setRecord(null);
      setPromoteResult(null);
      return;
    }
    setLoading(true);
    fetch(`${apiBase}/prompts/${promptId}`)
      .then((res) => res.json())
      .then((data: PromptRecord) => {
        setRecord(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [promptId, apiBase]);

  const copyToClipboard = async (text: string, which: "original" | "improved") => {
    try {
      await navigator.clipboard.writeText(text);
      setCopyFeedback(which);
      setTimeout(() => setCopyFeedback(null), 1500);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopyFeedback(which);
      setTimeout(() => setCopyFeedback(null), 1500);
    }
  };

  const setFeedback = async (value: "up" | "down" | null) => {
    if (!record) return;
    const newFeedback = record.feedback === value ? null : value;
    const res = await fetch(`${apiBase}/prompts/${record.id}/feedback`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ feedback: newFeedback }),
    });
    if (res.ok) {
      const updated: PromptRecord = await res.json();
      setRecord((r) => r ? { ...r, feedback: updated.feedback } : r);
      onRecordUpdate?.(updated);
    }
  };

  const togglePin = async () => {
    if (!record) return;
    const res = await fetch(`${apiBase}/prompts/${record.id}/pin`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pinned: !record.pinned }),
    });
    if (res.ok) {
      const updated: PromptRecord = await res.json();
      setRecord((r) => r ? { ...r, pinned: updated.pinned } : r);
      onRecordUpdate?.(updated);
    }
  };

  const promote = async () => {
    if (!record) return;
    setPromoteResult(null);
    const res = await fetch(`${apiBase}/prompts/${record.id}/promote`, { method: "POST" });
    if (res.ok) {
      const data = await res.json() as { path: string };
      setPromoteResult(`Saved to ${data.path}`);
    } else {
      const err = await res.json() as { error: string };
      setPromoteResult(`Error: ${err.error}`);
    }
  };

  if (!promptId) return null;

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(0,0,0,0.5)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 1000,
        padding: 24,
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: 8,
          maxWidth: 700,
          width: "100%",
          maxHeight: "90vh",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          style={{
            padding: 16,
            borderBottom: "1px solid #e5e7eb",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <h3 style={{ margin: 0 }}>Prompt Details</h3>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            {record && (
              <>
                {/* Feedback buttons */}
                <button
                  onClick={() => void setFeedback("up")}
                  title="Helpful"
                  style={{
                    padding: "4px 10px",
                    background: record.feedback === "up" ? "#d1fae5" : "#f3f4f6",
                    border: `1px solid ${record.feedback === "up" ? "#6ee7b7" : "#d1d5db"}`,
                    borderRadius: 4,
                    cursor: "pointer",
                    fontSize: 14,
                  }}
                >
                  👍
                </button>
                <button
                  onClick={() => void setFeedback("down")}
                  title="Not helpful"
                  style={{
                    padding: "4px 10px",
                    background: record.feedback === "down" ? "#fee2e2" : "#f3f4f6",
                    border: `1px solid ${record.feedback === "down" ? "#fca5a5" : "#d1d5db"}`,
                    borderRadius: 4,
                    cursor: "pointer",
                    fontSize: 14,
                  }}
                >
                  👎
                </button>
                {/* Pin button */}
                <button
                  onClick={() => void togglePin()}
                  title={record.pinned ? "Unpin" : "Pin"}
                  style={{
                    padding: "4px 10px",
                    background: record.pinned ? "#fef3c7" : "#f3f4f6",
                    border: `1px solid ${record.pinned ? "#fcd34d" : "#d1d5db"}`,
                    borderRadius: 4,
                    cursor: "pointer",
                    fontSize: 14,
                  }}
                >
                  📌
                </button>
              </>
            )}
            <button
              onClick={onClose}
              style={{
                padding: "4px 12px",
                background: "#f3f4f6",
                border: "1px solid #d1d5db",
                borderRadius: 4,
                cursor: "pointer",
              }}
            >
              Close
            </button>
          </div>
        </div>

        {/* Body */}
        <div style={{ padding: 16, overflowY: "auto", flex: 1 }}>
          {loading ? (
            <p>Loading...</p>
          ) : record ? (
            <>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>
                  Score: {record.score} · {record.createdAt}
                  {record.rewriteSucceeded ? " · Rewrite succeeded" : " · No rewrite"}
                </div>
                {record.warnings.length > 0 && (
                  <div style={{ fontSize: 12, color: "#b45309", marginBottom: 8 }}>
                    Warnings: {record.warnings.join(", ")}
                  </div>
                )}
              </div>

              {/* Promote to template (only when pinned) */}
              {record.pinned && (
                <div style={{ marginBottom: 16 }}>
                  <button
                    onClick={() => void promote()}
                    style={{
                      padding: "6px 14px",
                      background: "#ede9fe",
                      border: "1px solid #c4b5fd",
                      borderRadius: 4,
                      cursor: "pointer",
                      fontSize: 13,
                    }}
                  >
                    Promote to template
                  </button>
                  {promoteResult && (
                    <span style={{ marginLeft: 12, fontSize: 12, color: "#6b7280" }}>
                      {promoteResult}
                    </span>
                  )}
                </div>
              )}

              {/* Diff view */}
              {record.rewriteSucceeded && record.diff && record.diff.length > 0 ? (
                <div style={{ marginBottom: 16 }}>
                  <strong>Changes</strong>
                  <pre
                    style={{
                      margin: "8px 0 0 0",
                      padding: 12,
                      background: "#f9fafb",
                      border: "1px solid #e5e7eb",
                      borderRadius: 4,
                      fontSize: 12,
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                      maxHeight: 300,
                      overflowY: "auto",
                    }}
                  >
                    {record.diff.map((change, i) => (
                      <span
                        key={i}
                        style={{
                          display: "block",
                          background: change.added
                            ? "#d1fae5"
                            : change.removed
                            ? "#fee2e2"
                            : "transparent",
                          color: change.added ? "#065f46" : change.removed ? "#991b1b" : "inherit",
                        }}
                      >
                        {change.added ? "+ " : change.removed ? "- " : "  "}
                        {change.value}
                      </span>
                    ))}
                  </pre>
                </div>
              ) : !record.rewriteSucceeded ? (
                <div style={{ marginBottom: 16, fontSize: 12, color: "#6b7280" }}>
                  No rewrite — original prompt was returned unchanged.
                </div>
              ) : null}

              {/* Original */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <strong>Original</strong>
                  <button
                    onClick={() => void copyToClipboard(record.original, "original")}
                    style={{ padding: "4px 12px", background: "#fff", border: "1px solid #d1d5db", borderRadius: 4, cursor: "pointer", fontSize: 12 }}
                  >
                    {copyFeedback === "original" ? "Copied!" : "Copy"}
                  </button>
                </div>
                <pre style={{ margin: 0, padding: 12, background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 4, fontSize: 12, whiteSpace: "pre-wrap", wordBreak: "break-word", maxHeight: 200, overflowY: "auto" }}>
                  {record.original}
                </pre>
              </div>

              {/* Improved */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <strong>Improved</strong>
                  <button
                    onClick={() => void copyToClipboard(record.improved, "improved")}
                    style={{ padding: "4px 12px", background: "#fff", border: "1px solid #d1d5db", borderRadius: 4, cursor: "pointer", fontSize: 12 }}
                  >
                    {copyFeedback === "improved" ? "Copied!" : "Copy"}
                  </button>
                </div>
                <pre style={{ margin: 0, padding: 12, background: "#f9fafb", border: "1px solid #e5e7eb", borderRadius: 4, fontSize: 12, whiteSpace: "pre-wrap", wordBreak: "break-word", maxHeight: 200, overflowY: "auto" }}>
                  {record.improved}
                </pre>
              </div>
            </>
          ) : (
            <p>Failed to load prompt.</p>
          )}
        </div>
      </div>
    </div>
  );
}
