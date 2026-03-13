import { useState, useEffect } from "react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Bar, Line } from "react-chartjs-2";
import PromptDetailModal from "./PromptDetailModal";

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend
);

interface PromptRecord {
  id: number;
  original: string;
  improved: string;
  score: number;
  warnings: string[];
  rewriteSucceeded: boolean;
  createdAt: string;
}

interface Metrics {
  avgScore: number;
  totalCount: number;
  topPrompts: PromptRecord[];
  worstPrompts: PromptRecord[];
  scoreDistribution: Array<{ score: number; count: number }>;
  volumeByDay: Array<{ date: string; count: number }>;
}

const API_BASE = "/api";

export default function App() {
  const [prompts, setPrompts] = useState<PromptRecord[]>([]);
  const [total, setTotal] = useState(0);
  const [metrics, setMetrics] = useState<Metrics | null>(null);
  const [filters, setFilters] = useState({
    q: "",
    minScore: "",
    maxScore: "",
    rewriteSucceeded: "",
    from: "",
    to: "",
    limit: 50,
    offset: 0,
  });
  const [appliedFilters, setAppliedFilters] = useState(filters);
  const [loading, setLoading] = useState(true);
  const [selectedPromptId, setSelectedPromptId] = useState<number | null>(null);

  const fetchPrompts = async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (appliedFilters.q) params.set("q", appliedFilters.q);
    if (appliedFilters.minScore) params.set("minScore", appliedFilters.minScore);
    if (appliedFilters.maxScore) params.set("maxScore", appliedFilters.maxScore);
    if (appliedFilters.rewriteSucceeded) params.set("rewriteSucceeded", appliedFilters.rewriteSucceeded);
    if (appliedFilters.from) params.set("from", appliedFilters.from);
    if (appliedFilters.to) params.set("to", appliedFilters.to);
    params.set("limit", String(appliedFilters.limit));
    params.set("offset", String(appliedFilters.offset));
    const res = await fetch(`${API_BASE}/prompts?${params}`);
    const data = await res.json();
    setPrompts(data.items);
    setTotal(data.total);
    setLoading(false);
  };

  const fetchMetrics = async () => {
    const res = await fetch(`${API_BASE}/metrics`);
    const data = await res.json();
    setMetrics(data);
  };

  useEffect(() => {
    fetchPrompts();
  }, [appliedFilters]);

  useEffect(() => {
    fetchMetrics();
  }, []);

  const scoreChartData = metrics
    ? {
        labels: metrics.scoreDistribution.map((d) => String(d.score)),
        datasets: [
          {
            label: "Count",
            data: metrics.scoreDistribution.map((d) => d.count),
            backgroundColor: "rgba(59, 130, 246, 0.5)",
          },
        ],
      }
    : null;

  const handleExport = async (format: "csv" | "json") => {
    const res = await fetch(`${API_BASE}/prompts/export?format=${format}`);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `prompt-history.${format}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const volumeChartData = metrics
    ? {
        labels: metrics.volumeByDay.map((d) => d.date),
        datasets: [
          {
            label: "Prompts",
            data: metrics.volumeByDay.map((d) => d.count),
            borderColor: "rgb(34, 197, 94)",
            backgroundColor: "rgba(34, 197, 94, 0.1)",
          },
        ],
      }
    : null;

  const metricsGridStyle: React.CSSProperties = {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
    gap: 16,
    marginBottom: 24,
  };

  return (
    <div style={{ fontFamily: "system-ui", maxWidth: 1200, margin: "0 auto", padding: 24 }}>
      <h1>PromptLab Dashboard</h1>

      {metrics && (
        <div style={metricsGridStyle}>
          <div style={{ padding: 16, background: "#f3f4f6", borderRadius: 8 }}>
            <div style={{ fontSize: 14, color: "#6b7280" }}>Total Prompts</div>
            <div style={{ fontSize: 24, fontWeight: 600 }}>{metrics.totalCount}</div>
          </div>
          <div style={{ padding: 16, background: "#f3f4f6", borderRadius: 8 }}>
            <div style={{ fontSize: 14, color: "#6b7280" }}>Avg Score</div>
            <div style={{ fontSize: 24, fontWeight: 600 }}>{metrics.avgScore}</div>
          </div>
          <div
            style={{
              padding: 16,
              background: "#f3f4f6",
              borderRadius: 8,
              cursor: metrics.topPrompts[0] ? "pointer" : "default",
            }}
            onClick={() => metrics.topPrompts[0] && setSelectedPromptId(metrics.topPrompts[0].id)}
          >
            <div style={{ fontSize: 14, color: "#6b7280" }}>Best</div>
            <div style={{ fontSize: 24, fontWeight: 600 }}>
              {metrics.topPrompts[0]?.score ?? "-"}
            </div>
          </div>
          <div
            style={{
              padding: 16,
              background: "#f3f4f6",
              borderRadius: 8,
              cursor: metrics.worstPrompts[0] ? "pointer" : "default",
            }}
            onClick={() => metrics.worstPrompts[0] && setSelectedPromptId(metrics.worstPrompts[0].id)}
          >
            <div style={{ fontSize: 14, color: "#6b7280" }}>Worst</div>
            <div style={{ fontSize: 24, fontWeight: 600 }}>
              {metrics.worstPrompts[0]?.score ?? "-"}
            </div>
          </div>
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: 24,
          marginBottom: 24,
        }}
      >
        {scoreChartData && (
          <div style={{ padding: 16, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8 }}>
            <h3 style={{ margin: "0 0 16px 0" }}>Score Distribution</h3>
            <Bar data={scoreChartData} options={{ responsive: true }} />
          </div>
        )}
        {volumeChartData && (
          <div style={{ padding: 16, background: "#fff", border: "1px solid #e5e7eb", borderRadius: 8 }}>
            <h3 style={{ margin: "0 0 16px 0" }}>Volume by Day</h3>
            <Line data={volumeChartData} options={{ responsive: true }} />
          </div>
        )}
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>
          <h3 style={{ margin: 0 }}>Prompt History</h3>
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={() => handleExport("csv")}
              style={{ padding: "8px 16px", background: "#fff", border: "1px solid #d1d5db", borderRadius: 4, cursor: "pointer" }}
            >
              Export CSV
            </button>
            <button
              onClick={() => handleExport("json")}
              style={{ padding: "8px 16px", background: "#fff", border: "1px solid #d1d5db", borderRadius: 4, cursor: "pointer" }}
            >
              Export JSON
            </button>
          </div>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
          <input
            type="text"
            placeholder="Search..."
            value={filters.q}
            onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
            style={{ padding: 8, borderRadius: 4, border: "1px solid #d1d5db" }}
          />
          <input
            type="number"
            placeholder="Min score"
            value={filters.minScore}
            onChange={(e) => setFilters((f) => ({ ...f, minScore: e.target.value }))}
            style={{ padding: 8, borderRadius: 4, border: "1px solid #d1d5db", width: 100 }}
          />
          <input
            type="number"
            placeholder="Max score"
            value={filters.maxScore}
            onChange={(e) => setFilters((f) => ({ ...f, maxScore: e.target.value }))}
            style={{ padding: 8, borderRadius: 4, border: "1px solid #d1d5db", width: 100 }}
          />
          <input
            type="date"
            placeholder="From"
            value={filters.from}
            onChange={(e) => setFilters((f) => ({ ...f, from: e.target.value }))}
            style={{ padding: 8, borderRadius: 4, border: "1px solid #d1d5db" }}
          />
          <input
            type="date"
            placeholder="To"
            value={filters.to}
            onChange={(e) => setFilters((f) => ({ ...f, to: e.target.value }))}
            style={{ padding: 8, borderRadius: 4, border: "1px solid #d1d5db" }}
          />
          <select
            value={filters.rewriteSucceeded}
            onChange={(e) => setFilters((f) => ({ ...f, rewriteSucceeded: e.target.value }))}
            style={{ padding: 8, borderRadius: 4, border: "1px solid #d1d5db" }}
          >
            <option value="">All</option>
            <option value="true">Rewrite succeeded</option>
            <option value="false">Rewrite failed</option>
          </select>
          <button
            onClick={() => setAppliedFilters({ ...filters, offset: 0 })}
            style={{ padding: "8px 16px", background: "#3b82f6", color: "white", border: "none", borderRadius: 4, cursor: "pointer" }}
          >
            Apply
          </button>
        </div>
        {loading ? (
          <p>Loading...</p>
        ) : (
          <>
            <p style={{ color: "#6b7280", marginBottom: 8 }}>{total} records</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {prompts.map((p) => (
                <div
                  key={p.id}
                  style={{
                    padding: 16,
                    background: "#f9fafb",
                    border: "1px solid #e5e7eb",
                    borderRadius: 8,
                    cursor: "pointer",
                  }}
                  onClick={() => setSelectedPromptId(p.id)}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <span style={{ fontWeight: 600 }}>Score: {p.score}</span>
                    <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                      <span style={{ fontSize: 12, color: "#6b7280" }}>{p.createdAt}</span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedPromptId(p.id);
                        }}
                        style={{
                          padding: "4px 12px",
                          background: "#3b82f6",
                          color: "white",
                          border: "none",
                          borderRadius: 4,
                          cursor: "pointer",
                          fontSize: 12,
                        }}
                      >
                        View
                      </button>
                    </div>
                  </div>
                  <div style={{ marginBottom: 4 }}>
                    <strong>Original:</strong>{" "}
                    <span style={{ fontSize: 14 }}>{p.original.slice(0, 150)}{p.original.length > 150 ? "..." : ""}</span>
                  </div>
                  <div>
                    <strong>Improved:</strong>{" "}
                    <span style={{ fontSize: 14 }}>{p.improved.slice(0, 150)}{p.improved.length > 150 ? "..." : ""}</span>
                  </div>
                  {p.warnings.length > 0 && (
                    <div style={{ marginTop: 8, fontSize: 12, color: "#6b7280" }}>
                      Warnings: {p.warnings.join(", ")}
                    </div>
                  )}
                </div>
              ))}
            </div>
            <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
              <button
                disabled={appliedFilters.offset === 0}
                onClick={() => setAppliedFilters((f) => ({ ...f, offset: Math.max(0, f.offset - f.limit) }))}
                style={{ padding: "8px 16px", borderRadius: 4, border: "1px solid #d1d5db" }}
              >
                Previous
              </button>
              <button
                disabled={appliedFilters.offset + prompts.length >= total}
                onClick={() => setAppliedFilters((f) => ({ ...f, offset: f.offset + f.limit }))}
                style={{ padding: "8px 16px", borderRadius: 4, border: "1px solid #d1d5db" }}
              >
                Next
              </button>
            </div>
          </>
        )}
      </div>

      <PromptDetailModal
        promptId={selectedPromptId}
        onClose={() => setSelectedPromptId(null)}
      />
    </div>
  );
}
