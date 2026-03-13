import { useState, useEffect } from "react";

interface PromptRecord {
  id: number;
  original: string;
  improved: string;
  score: number;
  warnings: string[];
  rewriteSucceeded: boolean;
  createdAt: string;
}

interface PromptDetailModalProps {
  promptId: number | null;
  onClose: () => void;
  apiBase?: string;
}

export default function PromptDetailModal({
  promptId,
  onClose,
  apiBase = "/api",
}: PromptDetailModalProps) {
  const [record, setRecord] = useState<PromptRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState<"original" | "improved" | null>(null);

  useEffect(() => {
    if (!promptId) {
      setRecord(null);
      return;
    }
    setLoading(true);
    fetch(`${apiBase}/prompts/${promptId}`)
      .then((res) => res.json())
      .then((data) => {
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
      // Fallback for older browsers
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
          maxWidth: 640,
          width: "100%",
          maxHeight: "90vh",
          overflow: "hidden",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 4px 6px -1px rgba(0,0,0,0.1)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
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
        <div
          style={{
            padding: 16,
            overflowY: "auto",
            flex: 1,
          }}
        >
          {loading ? (
            <p>Loading...</p>
          ) : record ? (
            <>
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 12, color: "#6b7280", marginBottom: 4 }}>
                  Score: {record.score} · {record.createdAt}
                  {record.rewriteSucceeded ? " · Rewrite succeeded" : " · Rewrite failed"}
                </div>
                {record.warnings.length > 0 && (
                  <div style={{ fontSize: 12, color: "#b45309", marginBottom: 8 }}>
                    Warnings: {record.warnings.join(", ")}
                  </div>
                )}
              </div>
              <div style={{ marginBottom: 16 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <strong>Original</strong>
                  <button
                    onClick={() => copyToClipboard(record.original, "original")}
                    style={{
                      padding: "4px 12px",
                      background: "#fff",
                      border: "1px solid #d1d5db",
                      borderRadius: 4,
                      cursor: "pointer",
                      fontSize: 12,
                    }}
                  >
                    {copyFeedback === "original" ? "Copied!" : "Copy"}
                  </button>
                </div>
                <pre
                  style={{
                    margin: 0,
                    padding: 12,
                    background: "#f9fafb",
                    border: "1px solid #e5e7eb",
                    borderRadius: 4,
                    fontSize: 12,
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    maxHeight: 200,
                    overflowY: "auto",
                  }}
                >
                  {record.original}
                </pre>
              </div>
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <strong>Improved</strong>
                  <button
                    onClick={() => copyToClipboard(record.improved, "improved")}
                    style={{
                      padding: "4px 12px",
                      background: "#fff",
                      border: "1px solid #d1d5db",
                      borderRadius: 4,
                      cursor: "pointer",
                      fontSize: 12,
                    }}
                  >
                    {copyFeedback === "improved" ? "Copied!" : "Copy"}
                  </button>
                </div>
                <pre
                  style={{
                    margin: 0,
                    padding: 12,
                    background: "#f9fafb",
                    border: "1px solid #e5e7eb",
                    borderRadius: 4,
                    fontSize: 12,
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                    maxHeight: 200,
                    overflowY: "auto",
                  }}
                >
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
