// src/handlers/exchange-rates.js - Fetch live exchange rates from exchangerate-api.com v6

const SUPPORTED_CURRENCIES = ["USD", "EUR", "GBP", "ALL"];
const ExchangeUrl = process.env.EXCHANGE_RATE_API_URL; // https://v6.exchangerate-api.com/v6/KEY/latest
const TTL_MS = 60 * 60 * 1000; // 1 hour

// Per-base-currency cache: { [base]: { rates: ExchangeRateEntry[], fetchedAt: number, expiresAt: number } }
const cache = {};

async function fetchRates(base) {
  const response = await fetch(`${ExchangeUrl}/${base}`);
  if (!response.ok) {
    throw new Error(`Exchange API responded with ${response.status}`);
  }
  const data = await response.json();
  if (data.result !== "success") {
    throw new Error(data["error-type"] || "Exchange API returned failure");
  }
  // Filter to only the currencies we support (excluding the base)
  return Object.entries(data.conversion_rates)
    .filter(([currency]) => SUPPORTED_CURRENCIES.includes(currency) && currency !== base)
    .map(([currency, rate]) => ({ currency, rate }));
}

async function GetExchangeRates(call, callback) {
  const rawBase = String(call.request.base_currency || "USD")
    .trim()
    .toUpperCase();
  const base = SUPPORTED_CURRENCIES.includes(rawBase) ? rawBase : "USD";

  const now = Date.now();
  const cached = cache[base];

  if (cached && now < cached.expiresAt) {
    return callback(null, {
      success: true,
      base_currency: base,
      rates: cached.rates,
      fetched_at: cached.fetchedAt,
      message: "OK",
    });
  }

  try {
    const rates = await fetchRates(base);
    const fetchedAt = Date.now();

    cache[base] = { rates, fetchedAt, expiresAt: fetchedAt + TTL_MS };

    return callback(null, {
      success: true,
      base_currency: base,
      rates,
      fetched_at: fetchedAt,
      message: "OK",
    });
  } catch (err) {
    console.error("❌ GetExchangeRates error:", err.message);

    // Serve stale cache on upstream failure rather than erroring hard
    if (cached) {
      return callback(null, {
        success: true,
        base_currency: base,
        rates: cached.rates,
        fetched_at: cached.fetchedAt,
        message: "stale",
      });
    }

    return callback(null, {
      success: false,
      base_currency: base,
      rates: [],
      fetched_at: 0,
      message: err.message,
    });
  }
}

module.exports = { GetExchangeRates };
