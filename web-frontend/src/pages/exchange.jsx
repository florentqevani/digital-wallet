import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../hooks/use-auth";
import { getExchangeRates } from "../lib/api";

const CURRENCIES = ["USD", "EUR", "GBP"];

const CURRENCY_SYMBOLS = { USD: "$", EUR: "€", GBP: "£" };

const CURRENCY_PALETTE = {
  USD: { bg: "#e0f2fe", color: "#0369a1" },
  EUR: { bg: "#ede9fe", color: "#6d28d9" },
  GBP: { bg: "#fef9c3", color: "#92400e" },
};

function formatResult(n) {
  return Number(n).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function formatRate(rate) {
  return Number(rate).toLocaleString(undefined, {
    minimumFractionDigits: 4,
    maximumFractionDigits: 6,
  });
}

function formatFetchedAt(ms) {
  if (!ms) return "—";
  const d = new Date(Number(ms));
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString();
}

function CurrencySelect({ value, onChange, exclude }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      style={{ marginBottom: 0, fontWeight: 600, fontSize: "1rem" }}
    >
      {CURRENCIES.filter((c) => c !== exclude).map((cur) => (
        <option key={cur} value={cur}>
          {CURRENCY_SYMBOLS[cur]} {cur}
        </option>
      ))}
    </select>
  );
}

export default function ExchangePage() {
  const { token } = useAuth();
  const [from, setFrom] = useState("USD");
  const [to, setTo] = useState("EUR");
  const [amount, setAmount] = useState("100");

  // rates keyed by base currency — cache across swaps
  const [ratesCache, setRatesCache] = useState({});
  const [fetchedAt, setFetchedAt] = useState(null);
  const [stale, setStale] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const load = async (base) => {
    if (ratesCache[base]) return; // already have it
    setError("");
    setLoading(true);
    try {
      const res = await getExchangeRates(token, base);
      if (!res.success) throw new Error(res.message || "Failed to load rates");
      setRatesCache((prev) => ({
        ...prev,
        [base]: res.rates || [],
      }));
      setFetchedAt(res.fetched_at || null);
      setStale(res.message === "stale");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(from);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [from]);

  const handleSwap = () => {
    setFrom(to);
    setTo(from);
  };

  // find the rate for `to` inside the `from` rates list
  const rate = useMemo(() => {
    const list = ratesCache[from] || [];
    const entry = list.find((r) => r.currency === to);
    return entry ? entry.rate : null;
  }, [ratesCache, from, to]);

  const parsedAmount = parseFloat(amount);
  const amountValid = !Number.isNaN(parsedAmount) && parsedAmount > 0;
  const converted = amountValid && rate !== null ? parsedAmount * rate : null;

  // reference rates table — all targets for current base
  const allRates = ratesCache[from] || [];

  return (
    <>
      <section className="page-intro dashboard-intro">
        <h2>Exchange Rates</h2>
        <p>Live currency rates sourced from the European Central Bank.</p>
      </section>

      <section className="content-grid single-column">
        {/* ── Converter ────────────────────────────────────────────── */}
        <section className="panel compact-panel">
          <span className="section-eyebrow">Currency Converter</span>
          <h3>How much is it worth?</h3>

          <div style={{ display: "flex", alignItems: "flex-end", gap: "0.75rem", flexWrap: "wrap", marginBottom: "1.5rem" }}>
            <label style={{ flex: "1 1 120px", minWidth: "100px" }}>
              Amount
              <input
                type="number"
                min="0.01"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                style={{ fontSize: "1.1rem", fontWeight: 600, marginBottom: 0 }}
                placeholder="0.00"
              />
            </label>

            <label style={{ flex: "1 1 100px", minWidth: "90px" }}>
              From
              <CurrencySelect value={from} onChange={setFrom} exclude={to} />
            </label>

            <button
              type="button"
              onClick={handleSwap}
              title="Swap currencies"
              style={{
                padding: "0.5rem 0.7rem",
                borderRadius: "8px",
                border: "2px solid var(--line)",
                background: "var(--bg-subtle)",
                cursor: "pointer",
                fontSize: "1.1rem",
                color: "var(--ink-soft)",
                alignSelf: "flex-end",
                marginBottom: "0.1rem",
              }}
            >
              ⇄
            </button>

            <label style={{ flex: "1 1 100px", minWidth: "90px" }}>
              To
              <CurrencySelect value={to} onChange={setTo} exclude={from} />
            </label>
          </div>

          {error && (
            <p style={{ color: "var(--danger)", marginBottom: "1rem" }}>{error}</p>
          )}

          {loading ? (
            <p style={{ color: "var(--ink-soft)" }}>Loading rates…</p>
          ) : converted !== null ? (
            <div
              style={{
                background: "var(--accent-soft)",
                borderRadius: "10px",
                padding: "1rem 1.25rem",
                marginBottom: "1.25rem",
              }}
            >
              <p style={{ margin: "0 0 0.25rem", fontSize: "0.8rem", color: "var(--accent)", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                Result
              </p>
              <p style={{ margin: 0, fontSize: "1.6rem", fontWeight: 700, color: "var(--accent)", fontFamily: "var(--font-mono, monospace)" }}>
                {CURRENCY_SYMBOLS[to]}{formatResult(converted)}{" "}
                <span style={{ fontSize: "1rem", fontWeight: 600 }}>{to}</span>
              </p>
              <p style={{ margin: "0.4rem 0 0", fontSize: "0.8rem", color: "var(--ink-soft)" }}>
                {CURRENCY_SYMBOLS[from]}{formatResult(parsedAmount)} {from} × {formatRate(rate)} = {CURRENCY_SYMBOLS[to]}{formatResult(converted)} {to}
              </p>
            </div>
          ) : null}

          {/* ── Reference rate table ───────────────────────────────── */}
          {!loading && allRates.length > 0 && (
            <>
              <p style={{ fontSize: "0.78rem", color: "var(--ink-soft)", marginBottom: "0.5rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                All rates for 1 {from}
              </p>
              <table style={{ width: "100%", borderCollapse: "collapse", marginBottom: "0.75rem" }}>
                <tbody>
                  {allRates.map((entry) => (
                    <tr
                      key={entry.currency}
                      style={{
                        borderBottom: "1px solid var(--line)",
                        background: entry.currency === to ? "var(--accent-soft)" : "transparent",
                      }}
                    >
                      <td style={{ padding: "0.55rem 0.75rem" }}>
                        <span
                          style={{
                            display: "inline-block",
                            padding: "0.18rem 0.52rem",
                            borderRadius: "6px",
                            fontSize: "0.78rem",
                            fontWeight: 700,
                            background: CURRENCY_PALETTE[entry.currency]?.bg || "#f1f5f9",
                            color: CURRENCY_PALETTE[entry.currency]?.color || "#475569",
                          }}
                        >
                          {entry.currency}
                        </span>
                      </td>
                      <td style={{ textAlign: "right", padding: "0.55rem 0.75rem", fontFamily: "var(--font-mono, monospace)", fontWeight: entry.currency === to ? 700 : 500, color: entry.currency === to ? "var(--accent)" : "var(--ink)" }}>
                        {formatRate(entry.rate)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <p style={{ fontSize: "0.72rem", color: stale ? "var(--warning)" : "var(--ink-soft)", margin: 0 }}>
                {stale ? "⚠ Showing cached rates — " : "Rates updated at "}
                {formatFetchedAt(fetchedAt)}
                {" · ECB data, refreshes hourly"}
              </p>
            </>
          )}
        </section>
      </section>
    </>
  );
}

