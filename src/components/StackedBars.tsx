import {
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { animate, motion, useMotionValue } from "framer-motion";
import { ChartNoAxesColumnIncreasing } from "lucide-react";
import "./stacked-bars.css";

/* ══ Stacked bars ═════════════════════════════════════════
   An alert-volume card: a stack of four sources for every day (or
   week), and under the baseline the few that were escalated.

   ── RUN ALONG IT ────────────────────────────────────────
   The column under the pointer gets a ring round its whole stack,
   the rest step back (their colour mixed toward the slab, never
   faded), and one tooltip glides beside it on a spring with the
   date, the total and what made it up.

   ── DAY / WEEK ──────────────────────────────────────────
   Swaps the dataset; every segment eases to its new height and
   offset a beat after its left neighbour. The same transition
   grows the bars out of the baseline the first time the card is
   seen. */

const W = 300;
const PAD = 16;
const CH = 88; // room above the baseline for expenses
const BH = 88; // equal room below the baseline for income
const SEG_GAP = 2;
const LIFT = 2; // air between the baseline and the bars either side of it
const TIP_W = 174;
const SPRING = { type: "spring" as const, stiffness: 380, damping: 34 };

const CATS = ["Vivienda", "Alimentación", "Transporte", "Salud", "Ocio", "Otros"] as const;
const CAT_COLORS = ["#fb7185", "#f97316", "#fbbf24", "#c084fc", "#f472b6", "#a3a3a3"];

type Mode = "Day" | "Week";
type Bar = { vals: number[]; esc: number; label: string; short: string };
export type BarTransaction = {
  date: string;
  category: string;
  amountCents: number;
  type: "INCOME" | "EXPENSE";
};
const fmtDate = (d: Date) =>
  new Intl.DateTimeFormat("es-PY", { day: "2-digit", month: "short" }).format(
    d,
  );

function makeBars(
  mode: Mode,
  n: number,
  transactions: BarTransaction[],
  month: string,
): Bar[] {
  const [year, monthIndex] = month.split("-").map(Number);
  const monthEnd = new Date(year, monthIndex, 0, 12);
  const today = new Date();
  const end =
    month ===
      `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}` &&
    today < monthEnd
      ? today
      : monthEnd;
  return Array.from({ length: n }, (_, i) => {
    const periodEnd = new Date(
      end.getFullYear(),
      end.getMonth(),
      end.getDate() - (n - 1 - i) * (mode === "Day" ? 1 : 7),
      12,
    );
    const periodStart = new Date(
      periodEnd.getFullYear(),
      periodEnd.getMonth(),
      periodEnd.getDate() - (mode === "Day" ? 0 : 6),
      12,
    );
    const selected = transactions.filter((item) => {
      const date = new Date(`${item.date}T12:00:00`);
      return date >= periodStart && date <= periodEnd;
    });
    const vals = CATS.map((cat, index) =>
      selected
        .filter(
          (item) =>
            item.type === "EXPENSE" &&
            (index === CATS.length - 1
              ? !CATS.slice(0, -1).includes(
                  item.category as (typeof CATS)[number],
                )
              : item.category === cat),
        )
        .reduce((sum, item) => sum + item.amountCents / 100, 0),
    );
    const esc = selected
      .filter((item) => item.type === "INCOME")
      .reduce((sum, item) => sum + item.amountCents / 100, 0);
    const label =
      mode === "Day"
        ? fmtDate(periodEnd)
        : `${fmtDate(periodStart)} – ${fmtDate(periodEnd)}`;
    return { vals, esc, label, short: fmtDate(periodEnd) };
  });
}

const fmt = (v: number) => Math.round(v).toLocaleString("es-PY");
const sum = (a: number[]) => a.reduce((s, v) => s + v, 0);

export function StackedBars({
  colour = "Colour",
  bars = 20,
  gap = 6,
  transactions,
  month,
}: {
  colour?: "Mono" | "Colour";
  bars?: number;
  gap?: number;
  transactions: BarTransaction[];
  month: string;
}) {
  /* Week first: the steadier, fuller view to open on */
  const [mode, setMode] = useState<Mode>("Week");
  // Keep the weekly overview focused on the latest five weeks. At twenty
  // weekly bars the left edge drifted months into the past (e.g. July in Nov).
  const n = Math.max(2, Math.round(mode === "Week" ? 5 : bars));
  const [at, setAt] = useState<number | null>(null);
  const [seen, setSeen] = useState(false);
  const [chartWidth, setChartWidth] = useState(W);
  const root = useRef<HTMLDivElement | null>(null);
  const plot = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const element = root.current;
    if (!element || typeof ResizeObserver === "undefined") return;

    const resizeObserver = new ResizeObserver(() => {
      setChartWidth(Math.max(W, element.clientWidth));
    });
    resizeObserver.observe(element);
    return () => resizeObserver.disconnect();
  }, []);

  /* grow in once, the first time the card is on screen */
  useEffect(() => {
    const el = root.current;
    if (!el || seen) return;
    if (typeof IntersectionObserver === "undefined") {
      setSeen(true);
      return;
    }
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setSeen(true);
          io.disconnect();
        }
      },
      { threshold: 0.3 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [seen]);

  const data = useMemo(
    () => makeBars(mode, n, transactions, month),
    [mode, n, transactions, month],
  );

  /* geometry: the gap gives way before a bar gets thinner than 3px,
     so 30 bars at the widest gap still draw */
  const plotWidth = chartWidth - PAD * 2;
  const g = Math.max(1, Math.min(gap, (plotWidth - 3 * n) / (n - 1)));
  const bw = (plotWidth - g * (n - 1)) / n;
  const r = Math.min(2.5, bw / 2);
  const totals = data.map((b) => sum(b.vals));
  // A shared maximum keeps expense and income heights comparable.
  const maxT = Math.max(1, ...totals, ...data.map((b) => b.esc));
  const scale = (CH - LIFT - 2 - SEG_GAP * (CATS.length - 1)) / maxT;
  const layout = data.map((b) => {
    let y = 0;
    const segs = b.vals.map((v) => {
      const h = v > 0 ? Math.max(2, v * scale) : 0;
      const s = { bottom: y, h };
      y += h + SEG_GAP;
      return s;
    });
    return {
      segs,
      top: y - SEG_GAP,
      esc: b.esc > 0 ? Math.max(3, b.esc * scale) : 0,
    };
  });

  /* the headline pops in on a change, Price flow's way: every
     character is keyed by a generation, so a new total is new
     elements and each plays one short entrance, left to right.
     The first paint does not play it; only a change does. */
  const total = sum(totals);
  const [gen, setGen] = useState(0);
  const last = useRef(total);
  useEffect(() => {
    if (last.current === total) return;
    last.current = total;
    setGen((g) => g + 1);
  }, [total]);

  /* ring and tooltip: placed at once when they appear, glide after */
  const ringX = useMotionValue(0);
  const ringY = useMotionValue(0);
  const ringH = useMotionValue(0);
  const tipX = useMotionValue(0);
  const was = useRef<number | null>(null);
  useEffect(() => {
    if (at === null || at >= n) {
      was.current = null;
      return;
    }
    const L = layout[at];
    const left = at * (bw + g);
    const x = left - 3;
    const up = seen ? L.top : 0;
    const down = seen ? L.esc : 0;
    const y = CH - LIFT - up - 3;
    const h = up + LIFT + 1 + LIFT + down + 6;
    /* beside the column: right while it fits there, else left */
    const right = left + bw + 12;
    const leftCandidate = left - TIP_W - 12;
    const tx =
      leftCandidate >= 0
        ? leftCandidate
        : Math.max(0, Math.min(plotWidth - TIP_W, right));
    const go = (mv: typeof ringX, v: number) => {
      if (was.current === null) mv.set(v);
      else animate(mv, v, SPRING);
    };
    go(ringX, x);
    go(ringY, y);
    go(ringH, h);
    go(tipX, tx);
    was.current = at;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [at, n, bw, g, mode, seen]);

  const pick = (e: ReactPointerEvent) => {
    const b = plot.current?.getBoundingClientRect();
    if (!b || b.width === 0) return;
    const i = Math.floor(((e.clientX - b.left) / b.width) * n);
    setAt(Math.max(0, Math.min(n - 1, i)));
  };

  const cur = at !== null && at < n ? data[at] : null;
  const top2 = cur
    ? cur.vals
        .map((v, k) => ({ v, k }))
        .filter((x) => x.v > 0)
        .sort((a, b) => b.v - a.v)
        .slice(0, 2)
    : [];

  const hasData =
    totals.some((value) => value > 0) || data.some((bar) => bar.esc > 0);
  const rootStyle = {
    width: "100%",
    ["--stb-r"]: `${r}px`,
    ["--stb-rr"]: `${r + 3}px`,
    /* Map Bencho's local tokens to the dashboard's existing palette. */
    ["--fill-on"]: "var(--foreground)",
    ["--fill-slab"]: "var(--card)",
    ["--font-ui"]: "var(--font-sans)",
    ["--pane-edge"]: "var(--border)",
    ["--signal"]: "var(--ring)",
  } as CSSProperties;

  if (!hasData) {
    return (
      <div
        ref={root}
        className="stb"
        data-colour={colour === "Colour" ? "on" : "off"}
        style={rootStyle}
      >
        <div className="stb-head">
          <div className="stb-titles">
            <div className="stb-title">Flujo de efectivo</div>
          </div>
          <div className="stb-seg-ctl" data-mode={mode} role="tablist">
            <span className="stb-thumb" aria-hidden />
            {(["Day", "Week"] as Mode[]).map((m) => (
              <button
                key={m}
                type="button"
                role="tab"
                aria-selected={mode === m}
                data-on={mode === m || undefined}
                className="stb-tab"
                onClick={() => setMode(m)}
              >
                {m === "Day" ? "Día" : "Semana"}
              </button>
            ))}
          </div>
        </div>
        <div className="stb-empty">
          <span className="stb-empty-icon" aria-hidden="true">
            <ChartNoAxesColumnIncreasing size={23} strokeWidth={1.7} />
          </span>
          <strong>Todavía no hay actividad</strong>
          <small>Registra movimientos para ver el flujo del periodo.</small>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={root}
      className="stb"
      data-colour={colour === "Colour" ? "on" : "off"}
      data-scrub={cur ? "" : undefined}
      style={rootStyle}
    >
      <div className="stb-head">
        <div className="stb-titles">
          {/* the "Last 20 days" line is gone (2026-11-19): the axis dates
              and Day / Week already say the span */}
          <div className="stb-title">Flujo de efectivo</div>
        </div>
        <div className="stb-seg-ctl" data-mode={mode} role="tablist">
          <span className="stb-thumb" aria-hidden />
          {(["Day", "Week"] as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              role="tab"
              aria-selected={mode === m}
              data-on={mode === m || undefined}
              className="stb-tab"
              onClick={() => {
                setMode(m);
              }}
            >
              {m === "Day" ? "Día" : "Semana"}
            </button>
          ))}
        </div>
      </div>

      <div className="stb-figure">
        <span className="stb-num" aria-label={fmt(-total)}>
          {fmt(-total)
            .split("")
            .map((ch, i) => (
              <span
                key={`${gen}-${i}`}
                className="stb-digit"
                data-pop={gen > 0 || undefined}
                style={{ ["--i" as string]: i } as CSSProperties}
                aria-hidden
              >
                {ch}
              </span>
            ))}
        </span>
        <span className="stb-unit">gastos</span>
      </div>

      <div
        ref={plot}
        className="stb-plot"
        style={{ height: CH + 1 + BH }}
        onPointerDown={(e) => {
          try {
            e.currentTarget.setPointerCapture(e.pointerId);
          } catch {
            /* scripted */
          }
          pick(e);
        }}
        onPointerMove={pick}
        onPointerUp={(e) => {
          try {
            e.currentTarget.releasePointerCapture(e.pointerId);
          } catch {
            /* scripted */
          }
          if (e.pointerType !== "mouse") setAt(null);
        }}
        onPointerCancel={() => setAt(null)}
        onPointerLeave={() => setAt(null)}
      >
        <span className="stb-base" style={{ top: CH }} />
        {data.map((_, i) => (
          <div
            key={i}
            className="stb-col"
            data-on={at === i || undefined}
            style={
              {
                left: i * (bw + g),
                width: bw,
                ["--i" as string]: i,
              } as CSSProperties
            }
          >
            {layout[i].segs.map((s, k) => (
              <span
                key={k}
                className="stb-bar"
                style={
                  {
                    ["--c" as string]: CAT_COLORS[k],
                    bottom: BH + 1 + LIFT + (seen ? s.bottom : 0),
                    height: seen ? s.h : 0,
                  } as CSSProperties
                }
              />
            ))}
            <span
              className="stb-esc"
              style={{ top: CH + 1 + LIFT, height: seen ? layout[i].esc : 0 }}
            />
          </div>
        ))}

        <motion.span
          className="stb-ring"
          aria-hidden
          style={{ x: ringX, y: ringY, height: ringH, width: bw + 6 }}
        />

        <motion.div
          className="stb-tip"
          style={{ x: tipX, width: TIP_W }}
          aria-hidden={!cur}
        >
          {cur && (
            <>
              <div className="stb-tip-head">
                <span>{cur.label}</span>
                <b>{fmt(-totals[at!])}</b>
              </div>
              {top2.map(({ v, k }) => (
                <div className="stb-tip-row" key={CATS[k]}>
                  <i
                    style={
                      {
                        ["--c" as string]: CAT_COLORS[k],
                      } as CSSProperties
                    }
                  />
                  <span>{CATS[k]}</span>
                  <b>{fmt(-v)}</b>
                </div>
              ))}
              <div className="stb-tip-row" data-esc="">
                <i />
                <span>Ingresos</span>
                <b>{fmt(cur.esc)}</b>
              </div>
            </>
          )}
        </motion.div>
      </div>

      <div className="stb-axis">
        <span>{data[0].short}</span>
        <span>{data[n - 1].short}</span>
      </div>
      <div className="stb-legend" aria-label="Colores por categoría">
        {CATS.map((cat, index) => (
          <span key={cat}>
            <i style={{ background: CAT_COLORS[index] }} />
            {cat}
          </span>
        ))}
        <span><i className="stb-legend-income" />Ingresos</span>
      </div>
    </div>
  );
}
