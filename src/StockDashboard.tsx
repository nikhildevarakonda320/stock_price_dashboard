import React, { useEffect, useMemo, useState } from "react";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import { Search, TrendingUp, TrendingDown, RefreshCcw, Loader2, Sun, Moon } from "lucide-react";
import Chart from "react-apexcharts";

// --- Helper Types ---
type Quote = {
  symbol: string;
  price: number; // current price (c)
  change: number; // absolute change (d)
  changePct: number; // percent change (dp)
  high?: number; // high of day (h)
  low?: number; // low of day (l)
  open?: number; // open price (o)
  prevClose?: number; // previous close (pc)
};

type Candle = { t: number; c: number };

const DEFAULT_SYMBOLS = ["AAPL", "MSFT", "GOOGL", "AMZN", "TSLA", "NVDA"];

// --- Utilities ---
const fmtPct = (n: number) => `${n?.toFixed(2)}%`;
const fmtUsd = (n: number) =>
  n !== undefined && !Number.isNaN(n) ? n.toLocaleString(undefined, { style: "currency", currency: "USD" }) : "–";

const classNames = (...arr: Array<string | false | null | undefined>) => arr.filter(Boolean).join(" ");

// --- Main Component ---
export default function StockDashboard() {
  const [theme, setTheme] = useState("light"); // Add theme state

  const toggleTheme = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"));
  };

  const [apiKey, setApiKey] = useState<string>("");
  const [symbolsText, setSymbolsText] = useState<string>(DEFAULT_SYMBOLS.join(","));
  const [quotes, setQuotes] = useState<Record<string, Quote>>({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState<string>("");
  const [sortBy, setSortBy] = useState<keyof Quote | "symbol">("symbol");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [selected, setSelected] = useState<string | null>(null);
  const [candles, setCandles] = useState<Candle[]>([]);
  const symbols = useMemo(
    () => symbolsText.split(",").map((s) => s.trim().toUpperCase()).filter(Boolean),
    [symbolsText]
  );

  // --- Fetch quotes ---
  async function fetchQuotes() {
    setLoading(true);
    setError(null);
    try {
      console.log("Fetching quotes for symbols:", symbols);
      const results = await Promise.all(
        symbols.map(async (sym) => {
          const url = `https://finnhub.io/api/v1/quote?symbol=AAPL&token=d2jc8hhr01qqoajajpn0d2jc8hhr01qqoajajpng`;
          console.log(`Hitting API for symbol: ${sym}, URL: ${url}`);
          const res = await fetch(url);
          if (!res.ok) throw new Error(`${sym}: ${res.status} ${res.statusText}`);
          const j = await res.json();
          if (!j || j.c === 0 || j.c === undefined) throw new Error(`${sym}: No data`);
          const q: Quote = {
            symbol: sym,
            price: j.c,
            change: j.d,
            changePct: j.dp,
            high: j.h,
            low: j.l,
            open: j.o,
            prevClose: j.pc,
          };
          return [sym, q] as const;
        })
      );
      setQuotes(Object.fromEntries(results));
    } catch (e: any) {
      console.error(e);
      setError(e?.message || "Failed to fetch stock quotes.");
    } finally {
      setLoading(false);
    }
  }

  // --- Fetch candles for selected symbol ---
  async function fetchCandles(symbol: string) {
    try {
        const apiKey = "d2jc8hhr01qqoajajpn0d2jc8hhr01qqoajajpng";
        const from = "2025-08-01"; // start date
        const to = "2025-08-21"; // end date
        const url = `https://finnhub.io/api/v1/company-news?symbol=${encodeURIComponent(
                      symbol)}&from=${from}&to=${to}&token=${apiKey}`;
        console.log(`Fetching company news for symbol: ${symbol}, URL: ${url}`);
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Company News: ${res.status} ${res.statusText}`);
        const newsData = await res.json();
        setCandles(newsData);
    } catch (e: any) {
        console.error(e);
    }
}

  // Auto-select first symbol when quotes loaded
  useEffect(() => {
    const first = symbols[0];
    if (first) setSelected(first);
  }, [symbolsText]);

  useEffect(() => {
    fetchQuotes();
  }, []);


  const filtered = useMemo(() => {
    const arr = Object.values(quotes).filter((q) => q.symbol.includes(search.toUpperCase()));
    const dir = sortDir === "asc" ? 1 : -1;
    return arr.sort((a, b) => {
      const va = (a as any)[sortBy];
      const vb = (b as any)[sortBy];
      if (va === vb) return a.symbol.localeCompare(b.symbol);
      if (va === undefined || vb === undefined) return 0;
      if (typeof va === "string" || typeof vb === "string") return dir * String(va).localeCompare(String(vb));
      return dir * (va - vb);
    });
  }, [quotes, search, sortBy, sortDir]);

  const isUp = (n?: number) => (n ?? 0) >= 0;

  const handleSort = (key: keyof Quote | "symbol") => {
    if (sortBy === key) setSortDir(sortDir === "asc" ? "desc" : "asc");
    else {
      setSortBy(key);
      setSortDir("asc");
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-gray-900 text-slate-500">
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur border-b border-slate-200 dark:bg-gray-800 dark:border-gray-700">
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-2xl bg-slate-900 text-white grid place-items-center font-bold dark:bg-gray-700">$</div>
            <div>
              <h1 className="text-xl sm:text-2xl font-semibold text white">Stock Price Dashboard</h1>
            </div>
          </div>
          
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 grid gap-6 md:grid-cols-5">
        {/* Left: Table */}
        <section className="md:col-span-3">
          <div className="mb-3 flex items-center gap-2">
            <div className="relative flex-1 max-w-sm">
              <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input
                className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-400"
                placeholder="Search symbol..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm mt-7">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  {[
                    { key: "symbol", label: "Symbol" },
                    { key: "price", label: "Price" },
                    { key: "changePct", label: "Change %" },
                    { key: "change", label: "Change ($)" },
                    { key: "high", label: "High" },
                    { key: "low", label: "Low" },
                  ].map((col) => (
                    <th
                      key={col.key}
                      onClick={() => handleSort(col.key as any)}
                      className="px-4 py-3 text-left font-medium select-none cursor-pointer"
                    >
                      <div className="flex items-center gap-1">
                        <span>{col.label}</span>
                        <span className={classNames("text-xs", sortBy === (col.key as any) ? "opacity-100" : "opacity-20")}>{
                          sortDir === "asc" ? "▲" : "▼"
                        }</span>
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {!loading && !error && filtered.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-6 text-center text-slate-500">No data. Enter API key and click Fetch.</td>
                  </tr>
                )}
                </tbody>
                <tbody>
                  {filtered.map((q) => (
                    <tr
                      key={q.symbol}
                      onClick={() => {
                        setSelected(q.symbol);
                        fetchCandles(q.symbol); // Call fetchCandles API on click
                      }}
                      className={classNames(
                        "border-t border-slate-100 hover:bg-slate-50 transition-colors",
                        selected === q.symbol && "bg-slate-50"
                      )}
                    >
                      <td className="px-4 py-3 font-medium">{q.symbol}</td>
                      <td className="px-4 py-3 tabular-nums">{fmtUsd(q.price)}</td>
                      <td className="px-4 py-3">
                        <span
                          className={classNames(
                            "inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold",
                            isUp(q.changePct) ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"
                          )}
                        >
                          {isUp(q.changePct) ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                          {fmtPct(q.changePct)}
                        </span>
                      </td>
                      <td className="px-4 py-3 tabular-nums">{fmtUsd(q.change)}</td>
                      <td className="px-4 py-3 tabular-nums">{fmtUsd(q.high ?? NaN)}</td>
                      <td className="px-4 py-3 tabular-nums">{fmtUsd(q.low ?? NaN)}</td>
                    </tr>
                  ))}
                </tbody>
            </table>
          </div>
        </section>
        <aside className="md:col-span-2">
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-4 h-[420px] flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold">Apex Price Chart</h2>
              <div className="text-sm text-slate-500">{selected ? selected : "Select a symbol"}</div>
            </div>
            <div className="flex-1 min-h-0">
              {selected && Object.keys(quotes).length > 0 ? (
                <Chart
                  options={{
                    chart: {
                      id: "apex-price-chart",
                    },
                    xaxis: {
                      categories: Object.keys(quotes), // Use symbols as categories
                    },
                  }}
                  series={[{
                    name: "Price",
                    data: Object.values(quotes).map((q) => q.price), // Map prices to data
                  }]}
                  type="line"
                  height="100%"
                />
              ) : (
                <div className="h-full grid place-items-center text-slate-500 text-sm">
                  {selected ? "No chart data yet. Click Reload." : "Pick a row to see its chart."}
                </div>
              )}
            </div>
          </div>
        </aside>
        <aside className="md:col-span-5">
          <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-4 h-[420px] flex flex-col">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold">Company News</h2>
              <div className="text-sm text-slate-500">{selected ? selected : "Select a symbol"}</div>
            </div>
            <div className="flex-1 min-h-0 overflow-y-auto">
              {selected && candles.length > 0 ? (
                <ul>
                  {candles.map((newsItem, index) => (
                    <li key={index} className="mb-4">
                      <h3 className="font-medium">{newsItem.headline}</h3>
                      <p className="text-sm text-slate-500">{newsItem.summary}</p>
                      <a href={newsItem.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 underline">
                        Read more
                      </a>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="h-full grid place-items-center text-slate-500 text-sm">
                  {selected ? "No news data yet. Click Reload." : "Pick a row to see its news."}
                </div>
              )}
            </div>
          </div>
        </aside>
      </main>

      <footer className="max-w-6xl mx-auto px-4 pb-10 text-xs text-slate-500">
        <p>
          Data source: <a className="underline" href="https://finnhub.io/" target="_blank" rel="noreferrer">Finnhub</a> (free API key required). This app demonstrates: table with sorting/search, responsive Tailwind UI, loading and error states, and an optional chart.
        </p>
      </footer>
    </div>
  );
}
