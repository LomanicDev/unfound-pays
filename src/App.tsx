import { useEffect, useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import {
  AnimatePresence,
  animate,
  MotionConfig,
  motion,
  useMotionValue,
  useReducedMotion,
  useTransform,
} from "framer-motion";
import {
  ArrowDownCircle,
  ArrowDownLeft,
  ArrowRight,
  ArrowUpCircle,
  ArrowUpRight,
  CalendarDays,
  CircleAlert,
  ChartNoAxesColumnIncreasing,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Check,
  CreditCard,
  Download,
  LayoutDashboard,
  MoreHorizontal,
  Pencil,
  Plus,
  Search,
  Settings2,
  Volume2,
  VolumeX,
  Trash2,
  TrendingUp,
  UserRound,
  Wallet,
  X,
} from "lucide-react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StackedBars } from "@/components/StackedBars";
import { SwipeTransaction } from "@/components/SwipeTransaction";
import { playUiSound } from "@/lib/ui-sounds";

type Kind = "INCOME" | "EXPENSE";
type Transaction = {
  id: string;
  description: string;
  category: string;
  amountCents: number;
  type: Kind;
  date: string;
};
const key = "unfound-pays-transactions-v2";
const cats = [
  "Vivienda",
  "Alimentación",
  "Transporte",
  "Salud",
  "Ocio",
  "Sueldo",
  "Otros",
];
const colors: Record<string, string> = {
  Vivienda: "#fb7185",
  Alimentación: "#f97316",
  Transporte: "#fbbf24",
  Salud: "#c084fc",
  Ocio: "#f472b6",
  Sueldo: "#4ade80",
  Otros: "#a3a3a3",
};
const day = (n: number) => {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};
function load(): Transaction[] {
  try {
    const x = localStorage.getItem(key);
    return x ? (JSON.parse(x) as Transaction[]) : [];
  } catch {
    return [];
  }
}
const currentMonth = (d = new Date()) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
const money = (n: number) =>
  new Intl.NumberFormat("es-PY", {
    style: "currency",
    currency: "PYG",
    maximumFractionDigits: 0,
  }).format(n / 100);
const formatAmountInput = (value: string) => {
  const digits = value.replace(/\D/g, "").replace(/^0+(?=\d)/, "");
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
};
const amountFromInput = (value: string) =>
  Number(value.replace(/\./g, "").replace(",", "."));
const updateAmountInput = (
  event: ChangeEvent<HTMLInputElement>,
  setter: (value: string) => void,
) => {
  const input = event.currentTarget;
  const digitsBeforeCaret = input.value
    .slice(0, input.selectionStart ?? input.value.length)
    .replace(/\D/g, "").length;
  const formatted = formatAmountInput(input.value);
  setter(formatted);
  requestAnimationFrame(() => {
    let digitCount = 0;
    let nextCaret = 0;
    while (nextCaret < formatted.length && digitCount < digitsBeforeCaret) {
      if (/\d/.test(formatted[nextCaret])) digitCount++;
      nextCaret++;
    }
    input.setSelectionRange(nextCaret, nextCaret);
  });
};
const monthName = (m: string) => {
  const [y, mo] = m.split("-").map(Number);
  return new Intl.DateTimeFormat("es-PY", {
    month: "long",
    year: "numeric",
  }).format(new Date(y, mo - 1, 1));
};
const shortDate = (v: string) =>
  new Intl.DateTimeFormat("es-PY", { day: "2-digit", month: "short" }).format(
    new Date(`${v}T12:00:00`),
  );

function AnimatedMoney({
  value,
  className,
}: {
  value: number;
  className?: string;
}) {
  const amount = useMotionValue(value);
  const reduceMotion = useReducedMotion();
  const formatted = useTransform(amount, (current) => money(current));

  useEffect(() => {
    if (reduceMotion) {
      amount.set(value);
      return;
    }
    const controls = animate(amount, value, {
      duration: 0.72,
      ease: [0.22, 1, 0.36, 1],
    });
    return () => controls.stop();
  }, [amount, reduceMotion, value]);

  return (
    <motion.div className={className} aria-label={money(value)}>
      {formatted}
    </motion.div>
  );
}

export default function App() {
  const [items, setItems] = useState<Transaction[]>(load);
  const [month, setMonth] = useState(currentMonth());
  const [monthPickerOpen, setMonthPickerOpen] = useState(false);
  const [kind, setKind] = useState("ALL");
  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<string | null>(null);
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<Kind>("EXPENSE");
  const [category, setCategory] = useState("Alimentación");
  const [date, setDate] = useState(day(0));
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [mobileTransactionOpen, setMobileTransactionOpen] = useState(false);
  const [confirmResetOpen, setConfirmResetOpen] = useState(false);
  const [initialFundsOpen, setInitialFundsOpen] = useState(false);
  const [initialFundsDraft, setInitialFundsDraft] = useState(() => {
    const stored = Number(localStorage.getItem("unfound-pays-initial-funds"));
    return Number.isFinite(stored) && stored > 0
      ? formatAmountInput(String(Math.round(stored / 100)))
      : "";
  });
  const [initialBalanceCents, setInitialBalanceCents] = useState(() => {
    const stored = Number(localStorage.getItem("unfound-pays-initial-funds"));
    return Number.isFinite(stored) && stored > 0 ? stored : 0;
  });
  const [username, setUsername] = useState(
    () => localStorage.getItem("unfound-pays-username") ?? "",
  );
  const [nameDraft, setNameDraft] = useState(
    () => localStorage.getItem("unfound-pays-username") ?? "",
  );
  const [profileOpen, setProfileOpen] = useState(
    () => !localStorage.getItem("unfound-pays-username"),
  );
  const [nameError, setNameError] = useState("");
  const [error, setError] = useState("");
  const [toast, setToast] = useState("");
  const [nav, setNav] = useState("Resumen");
  const [soundOn, setSoundOn] = useState(
    () => localStorage.getItem("unfound-pays-sounds") !== "off",
  );
  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(items));
  }, [items]);
  useEffect(() => {
    localStorage.setItem("unfound-pays-initial-funds", String(initialBalanceCents));
  }, [initialBalanceCents]);
  useEffect(() => {
    localStorage.setItem("unfound-pays-sounds", soundOn ? "on" : "off");
  }, [soundOn]);

  const monthItems = useMemo(
    () => items.filter((x) => x.date.startsWith(month)),
    [items, month],
  );
  const totalIncome = monthItems
    .filter((x) => x.type === "INCOME")
    .reduce((s, x) => s + x.amountCents, 0);
  const totalExpense = monthItems
    .filter((x) => x.type === "EXPENSE")
    .reduce((s, x) => s + x.amountCents, 0);
  const [selectedYear, selectedMonth] = month.split("-").map(Number);
  const monthEnd = `${month}-${String(
    new Date(selectedYear, selectedMonth, 0).getDate(),
  ).padStart(2, "0")}`;
  const balanceItems = items.filter((x) => x.date <= monthEnd);
  const netBalance = balanceItems.reduce(
    (balance, item) =>
      balance +
      (item.type === "INCOME" ? item.amountCents : -item.amountCents),
    initialBalanceCents,
  );
  const visible = monthItems
    .filter((x) => kind === "ALL" || x.type === kind)
    .filter((x) => categoryFilter === "ALL" || x.category === categoryFilter)
    .filter((x) => !dateFrom || x.date >= dateFrom)
    .filter((x) => !dateTo || x.date <= dateTo)
    .filter((x) =>
      `${x.description} ${x.category}`
        .toLowerCase()
        .includes(query.toLowerCase()),
    )
    .sort((a, b) => b.date.localeCompare(a.date));
  const pie = cats
    .map((name) => ({
      name,
      value: monthItems
        .filter((x) => x.type === "EXPENSE" && x.category === name)
        .reduce((s, x) => s + x.amountCents, 0),
    }))
    .filter((x) => x.value > 0);
  const daysInMonth = new Date(
    Number(month.slice(0, 4)),
    Number(month.slice(5, 7)),
    0,
  ).getDate();
  const daysToAverage =
    month === currentMonth() ? new Date().getDate() : daysInMonth;
  const flash = (s: string) => {
    setToast(s);
    if (soundOn) {
      playUiSound(
        s.includes("eliminado")
          ? "delete"
          : s.includes("CSV")
            ? "export"
            : "save",
      );
    }
    window.setTimeout(() => setToast(""), 2500);
  };
  const registerMobileTransaction = (transaction: Omit<Transaction, "id">) => {
    const row: Transaction = {
      id: crypto.randomUUID(),
      ...transaction,
    };
    setItems((current) => [row, ...current]);
    flash(transaction.type === "INCOME" ? "Ingreso registrado" : "Gasto registrado");
  };
  const saveProfile = (event: FormEvent) => {
    event.preventDefault();
    const cleaned = nameDraft.trim().replace(/\s+/g, " ");
    if (cleaned.length < 2) {
      setNameError("Escribe al menos 2 caracteres.");
      return;
    }
    if (cleaned.length > 24) {
      setNameError("Usa un máximo de 24 caracteres.");
      return;
    }
    localStorage.setItem("unfound-pays-username", cleaned);
    setUsername(cleaned);
    setNameDraft(cleaned);
    setNameError("");
    setProfileOpen(false);
  };
  const changeMonth = (next: string) => {
    setMonth(next);
    setDateFrom("");
    setDateTo("");
    if (soundOn) playUiSound("selection");
  };
  const shiftMonth = (amount: number) => {
    const [year, monthNumber] = month.split("-").map(Number);
    const next = new Date(year, monthNumber - 1 + amount, 1);
    changeMonth(
      `${next.getFullYear()}-${String(next.getMonth() + 1).padStart(2, "0")}`,
    );
  };
  const monthLabels = Array.from({ length: 12 }, (_, index) =>
    new Intl.DateTimeFormat("es-PY", { month: "long" }).format(
      new Date(2026, index, 1),
    ),
  );
  const chooseMonth = (year: number, monthIndex: number) => {
    changeMonth(`${year}-${String(monthIndex + 1).padStart(2, "0")}`);
    setMonthPickerOpen(false);
  };
  const showTransactions = () => {
    setNav("Movimientos");
    document
      .getElementById("transactions")
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };
  const create = (initialType: Kind = "EXPENSE") => {
    if (window.matchMedia("(max-width: 800px)").matches) {
      setMobileTransactionOpen(true);
      return;
    }
    setEditing(null);
    setDescription("");
    setAmount("");
    setType(initialType);
    setCategory(initialType === "INCOME" ? "Sueldo" : "Alimentación");
    setDate(day(0));
    setError("");
    setOpen(true);
  };
  const edit = (x: Transaction) => {
    setEditing(x.id);
    setDescription(x.description);
    setAmount(formatAmountInput(String(Math.round(x.amountCents / 100))));
    setType(x.type);
    setCategory(x.category);
    setDate(x.date);
    setError("");
    setOpen(true);
  };
  const save = (e: FormEvent) => {
    e.preventDefault();
    const value = amountFromInput(amount);
    if (!description.trim()) return setError("Escribe una descripción.");
    if (!Number.isFinite(value) || value <= 0)
      return setError("El importe debe ser mayor que cero.");
    const row = {
      id: editing ?? crypto.randomUUID(),
      description: description.trim(),
      category,
      amountCents: Math.round(value * 100),
      type,
      date,
    };
    setItems((xs) =>
      editing ? xs.map((x) => (x.id === editing ? row : x)) : [row, ...xs],
    );
    setOpen(false);
    flash(
      editing
        ? "Movimiento actualizado"
        : "Movimiento guardado en este navegador",
    );
  };
  const remove = (id: string) => {
    setItems((xs) => xs.filter((x) => x.id !== id));
    flash("Movimiento eliminado");
  };
  const reset = () => {
    setConfirmResetOpen(true);
  };
  const confirmReset = () => {
    setItems([]);
    setConfirmResetOpen(false);
    flash("Movimientos eliminados");
  };
  const exportCsv = () => {
    const rows = [
      ["Fecha", "Descripción", "Categoría", "Tipo", "Importe"],
      ...visible.map((x) => [
        x.date,
        x.description,
        x.category,
        x.type === "INCOME" ? "Ingreso" : "Gasto",
        `${x.type === "EXPENSE" ? "-" : ""}${(x.amountCents / 100).toFixed(0)}`,
      ]),
    ];
    const csv = rows
      .map((r) => r.map((v) => `"${v.replaceAll('"', '""')}"`).join(","))
      .join("\n");
    const url = URL.createObjectURL(
      new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = `unfound-pays-${month}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    flash("Archivo CSV descargado");
  };

  return (
    <MotionConfig reducedMotion="user">
      <div
        className="app-shell"
        onClickCapture={(event) => {
          if (
            monthPickerOpen &&
            !(event.target as HTMLElement).closest(".month-picker")
          )
            setMonthPickerOpen(false);
          const button = (event.target as HTMLElement).closest("button");
          if (!soundOn || !button) return;

          const label =
            `${button.textContent} ${button.getAttribute("aria-label")} ${button.className}`.toLowerCase();
          if (label.includes("guardar") || label.includes("eliminar")) return;
          if (label.includes("sound-toggle") || label.includes("sonidos")) {
            playUiSound("toggle");
          } else if (label.includes("nav-item") || label.includes("inicio")) {
            playUiSound("navigation");
          } else if (
            label.includes("nuevo movimiento") ||
            label.includes("añadir")
          ) {
            playUiSound("open");
          } else if (label.includes("deslizar")) {
            playUiSound("swipe");
          } else if (label.includes("escribir ")) {
            playUiSound("key");
          } else if (label.includes("borrar último dígito")) {
            playUiSound("delete");
          } else if (label.includes("editar")) {
            playUiSound("edit");
          } else if (
            label.includes("stb-tab") ||
            label.includes("type-switch") ||
            label.includes("category-row")
          ) {
            playUiSound("selection");
          } else if (label.includes("cerrar") || label.includes("cancelar")) {
            playUiSound("close");
          } else if (label.includes("exportar")) {
            playUiSound("export");
          } else {
            playUiSound("tap");
          }
        }}
      >
        <aside className="sidebar">
          <div className="brand-lockup">
            <div className="brand-mark">
              <Wallet size={18} />
            </div>
            <div>
              <strong>UNFOUND</strong>
            </div>
          </div>
          <div className="workspace-label">ESPACIO PERSONAL</div>
          <nav className="main-nav" aria-label="Navegación">
            <button
              className={`nav-item ${nav === "Resumen" ? "active" : ""}`}
              onClick={() => {
                setNav("Resumen");
                document
                  .getElementById("overview")
                  ?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              <LayoutDashboard size={17} />
              Resumen
            </button>
            <button
              className={`nav-item ${nav === "Movimientos" ? "active" : ""}`}
              onClick={() => {
                setNav("Movimientos");
                document
                  .getElementById("transactions")
                  ?.scrollIntoView({ behavior: "smooth" });
              }}
            >
              <CreditCard size={17} />
              Movimientos<span className="nav-count">{items.length}</span>
            </button>
          </nav>
          <div className="sidebar-bottom">
            <button className="nav-item muted" onClick={reset}>
              <Settings2 size={16} />
              Borrar movimientos
            </button>
            <div className="profile-row">
              <div className="avatar">
                {(username.trim().charAt(0) || "U").toUpperCase()}
              </div>
              <div className="profile-info">
                <strong>{username || "Usuario"}</strong>
                <span>Cuenta local</span>
              </div>
              <details className="profile-menu">
                <summary aria-label="Opciones del usuario" title="Opciones">
                  <MoreHorizontal size={17} />
                </summary>
                <div className="profile-menu-panel" role="menu">
                  <button
                    role="menuitem"
                    onClick={(event) => {
                      event.currentTarget
                        .closest("details")
                        ?.removeAttribute("open");
                      setNameDraft(username);
                      setNameError("");
                      setProfileOpen(true);
                    }}
                  >
                    <UserRound size={15} /> Cambiar nombre
                  </button>
                  <button
                    role="menuitem"
                    onClick={(event) => {
                      event.currentTarget
                        .closest("details")
                        ?.removeAttribute("open");
                      exportCsv();
                    }}
                  >
                    <Download size={15} /> Exportar este mes
                  </button>
                  <button
                    role="menuitem"
                    onClick={(event) => {
                      event.currentTarget
                        .closest("details")
                        ?.removeAttribute("open");
                      setSoundOn((enabled) => !enabled);
                    }}
                  >
                    {soundOn ? <VolumeX size={15} /> : <Volume2 size={15} />}
                    {soundOn ? "Desactivar sonidos" : "Activar sonidos"}
                  </button>
                  <button
                    role="menuitem"
                    className="danger"
                    onClick={(event) => {
                      event.currentTarget
                        .closest("details")
                        ?.removeAttribute("open");
                      reset();
                    }}
                  >
                    <Trash2 size={15} /> Borrar movimientos
                  </button>
                </div>
              </details>
            </div>
          </div>
        </aside>
        <main className="main-content">
          <header className="topbar">
            <div className="breadcrumb">
              <strong>Panel de gastos</strong>
            </div>
            <div className="topbar-actions">
              <span className="currency-label">
                PYG <span>₲</span>
              </span>
              <Button
                variant="ghost"
                size="icon"
                className="top-icon profile-toggle"
                aria-label="Cambiar nombre de usuario"
                title="Cambiar nombre de usuario"
                onClick={() => {
                  setNameDraft(username);
                  setNameError("");
                  setProfileOpen(true);
                }}
              >
                <UserRound size={17} />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="top-icon sound-toggle"
                aria-label={soundOn ? "Desactivar sonidos" : "Activar sonidos"}
                title={soundOn ? "Desactivar sonidos" : "Activar sonidos"}
                onClick={() => setSoundOn((enabled) => !enabled)}
              >
                {soundOn ? <Volume2 size={17} /> : <VolumeX size={17} />}
              </Button>
              <details className="profile-menu mobile-options-menu">
                <summary aria-label="Más opciones" title="Más opciones">
                  <MoreHorizontal size={17} />
                </summary>
                <div className="profile-menu-panel" role="menu">
                  <button
                    role="menuitem"
                    className="danger"
                    onClick={(event) => {
                      event.currentTarget.closest("details")?.removeAttribute("open");
                      reset();
                    }}
                  >
                    <Trash2 size={15} /> Borrar movimientos
                  </button>
                </div>
              </details>
              <Dialog
                open={profileOpen}
                onOpenChange={(next) => {
                  if (username || next) setProfileOpen(next);
                }}
              >
                <DialogContent className="profile-dialog">
                  <DialogHeader>
                    <div className="dialog-symbol profile-dialog-symbol">
                      <UserRound size={18} />
                    </div>
                    <DialogTitle>
                      {username ? "Tu perfil" : "Personaliza tu espacio"}
                    </DialogTitle>
                    <DialogDescription>
                      {username
                        ? "Cambia el nombre que aparece en tu panel."
                        : "¿Cómo quieres que te llamemos? Este nombre se guarda solo en este navegador."}
                    </DialogDescription>
                  </DialogHeader>
                  <form onSubmit={saveProfile} className="profile-form">
                    <label className="field-label" htmlFor="username">
                      Nombre de usuario
                    </label>
                    <Input
                      id="username"
                      value={nameDraft}
                      onChange={(event) => {
                        setNameDraft(event.target.value);
                        setNameError("");
                      }}
                      placeholder="Ej. Diego"
                      maxLength={24}
                      autoFocus
                      aria-invalid={Boolean(nameError)}
                    />
                    {nameError && <p className="form-error">{nameError}</p>}
                    <DialogFooter className="profile-dialog-footer">
                      {username && (
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setProfileOpen(false)}
                        >
                          Cancelar
                        </Button>
                      )}
                      <Button type="submit" className="add-button">
                        {username ? "Guardar nombre" : "Continuar"}
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
              <Dialog
                open={confirmResetOpen}
                onOpenChange={setConfirmResetOpen}
              >
                <DialogContent className="confirm-dialog">
                  <DialogHeader>
                    <div className="dialog-symbol confirm-dialog-symbol">
                      <CircleAlert size={18} />
                    </div>
                    <DialogTitle>¿Borrar todos los movimientos?</DialogTitle>
                    <DialogDescription>
                      Esta acción eliminará los movimientos guardados en este
                      navegador.
                    </DialogDescription>
                  </DialogHeader>
                  <DialogFooter className="confirm-dialog-footer">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setConfirmResetOpen(false)}
                    >
                      Cancelar
                    </Button>
                    <Button
                      type="button"
                      className="confirm-delete-button"
                      onClick={confirmReset}
                    >
                      <Trash2 size={15} /> Borrar movimientos
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
              <Dialog open={initialFundsOpen} onOpenChange={setInitialFundsOpen}>
                <DialogContent className="initial-funds-dialog">
                  <DialogHeader>
                    <div className="dialog-symbol balance-symbol">
                      <Wallet size={18} />
                    </div>
                    <DialogTitle>Fondo inicial</DialogTitle>
                    <DialogDescription>
                      Define el dinero con el que empieza tu balance. Se guarda en este navegador.
                    </DialogDescription>
                  </DialogHeader>
                  <form
                    onSubmit={(event) => {
                      event.preventDefault();
                      const value = amountFromInput(initialFundsDraft);
                      if (!Number.isFinite(value) || value < 0) return;
                      setInitialBalanceCents(Math.round(value * 100));
                      setInitialFundsOpen(false);
                      setToast("Fondo inicial actualizado");
                    }}
                    className="initial-funds-form"
                  >
                    <label className="field-label" htmlFor="initial-funds-amount">
                      Importe (PYG)
                    </label>
                    <div className="initial-amount-field">
                      <span aria-hidden="true">₲</span>
                      <Input
                        id="initial-funds-amount"
                        type="text"
                        inputMode="numeric"
                        placeholder="500.000"
                        value={initialFundsDraft}
                        onChange={(event) => updateAmountInput(event, setInitialFundsDraft)}
                        autoFocus
                      />
                    </div>
                    <small className="initial-funds-hint">
                      Puedes actualizar este importe cuando quieras.
                    </small>
                    <DialogFooter className="initial-funds-footer">
                      <Button type="button" variant="outline" onClick={() => setInitialFundsOpen(false)}>
                        Cancelar
                      </Button>
                      <Button type="submit" className="add-button">
                        Guardar fondo
                      </Button>
                    </DialogFooter>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </header>
          <div className="page-wrap" id="overview">
            <section className="page-heading">
              <div>
                <h1>Resumen de gastos</h1>
                <p>Ingresos, gastos y balance del mes.</p>
              </div>
              <div className="heading-actions">
                <div className="month-picker">
                  <button
                    type="button"
                    className="month-step"
                    aria-label="Mes anterior"
                    onClick={() => shiftMonth(-1)}
                  >
                    <ChevronLeft size={15} />
                  </button>
                  <button
                    type="button"
                    className="month-current"
                    aria-expanded={monthPickerOpen}
                    aria-label={`Elegir mes, actual ${monthName(month)}`}
                    onClick={() => setMonthPickerOpen((current) => !current)}
                  >
                    <CalendarDays size={15} />
                    <span>{monthName(month).replace(" de ", " ")}</span>
                    <ChevronDown
                      size={13}
                      className={monthPickerOpen ? "month-chevron-open" : ""}
                    />
                  </button>
                  <AnimatePresence>
                    {monthPickerOpen && (
                      <motion.div
                        className="month-popover"
                        initial={{ opacity: 0, y: -5, scale: 0.98 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: -4, scale: 0.98 }}
                        transition={{ duration: 0.16, ease: "easeOut" }}
                        onClick={(event) => event.stopPropagation()}
                      >
                        <div className="month-popover-year">
                          <button
                            type="button"
                            aria-label="Año anterior"
                            onClick={() => {
                              const [year, monthIndex] = month
                                .split("-")
                                .map(Number);
                              changeMonth(
                                `${year - 1}-${String(monthIndex).padStart(2, "0")}`,
                              );
                            }}
                          >
                            <ChevronLeft size={15} />
                          </button>
                          <strong>{month.slice(0, 4)}</strong>
                          <button
                            type="button"
                            aria-label="Año siguiente"
                            onClick={() => {
                              const [year, monthIndex] = month
                                .split("-")
                                .map(Number);
                              changeMonth(
                                `${year + 1}-${String(monthIndex).padStart(2, "0")}`,
                              );
                            }}
                          >
                            <ChevronRight size={15} />
                          </button>
                        </div>
                        <div className="month-popover-grid">
                          {monthLabels.map((label, index) => (
                            <button
                              type="button"
                              key={label}
                              aria-pressed={
                                Number(month.slice(5, 7)) === index + 1
                              }
                              onClick={() =>
                                chooseMonth(Number(month.slice(0, 4)), index)
                              }
                            >
                              {label}
                            </button>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                  <button
                    type="button"
                    className="month-step"
                    aria-label="Mes siguiente"
                    onClick={() => shiftMonth(1)}
                  >
                    <ChevronRight size={15} />
                  </button>
                </div>
                <Button
                  className="add-button"
                  onClick={() => create()}
                  aria-label="Nuevo movimiento"
                >
                  <Plus size={16} />
                  <span>Nuevo movimiento</span>
                </Button>
                <Dialog open={open} onOpenChange={setOpen}>
                  <DialogContent className="transaction-dialog">
                    <DialogHeader>
                      <div className="dialog-symbol">
                        <Wallet size={18} />
                      </div>
                      <DialogTitle>
                        {editing ? "Editar movimiento" : "Nuevo movimiento"}
                      </DialogTitle>
                      <DialogDescription>
                        Se guardará en este navegador, sin cuenta ni servidor.
                      </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={save} className="transaction-form">
                      <div className="type-switch" role="radiogroup" aria-label="Tipo de movimiento">
                        <button
                          type="button"
                          role="radio"
                          aria-checked={type === "EXPENSE"}
                          className={`expense ${type === "EXPENSE" ? "selected" : ""}`}
                          onClick={() => {
                            setType("EXPENSE");
                            setCategory("Alimentación");
                          }}
                        >
                          <ArrowUpRight size={15} /> Gasto
                        </button>
                        <button
                          type="button"
                          role="radio"
                          aria-checked={type === "INCOME"}
                          className={`income ${type === "INCOME" ? "selected" : ""}`}
                          onClick={() => {
                            setType("INCOME");
                            setCategory("Sueldo");
                          }}
                        >
                          <ArrowDownLeft size={15} /> Ingreso
                        </button>
                      </div>
                      <label className="field-label" htmlFor="description">
                        Descripción
                      </label>
                      <Input
                        id="description"
                        placeholder="Ej. Compra del supermercado"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                      />
                      <div className="form-grid">
                        <div>
                          <label className="field-label" htmlFor="amount">
                            Importe (PYG)
                          </label>
                          <Input
                            id="amount"
                            inputMode="numeric"
                            placeholder="0"
                            value={amount}
                            onChange={(e) => updateAmountInput(e, setAmount)}
                          />
                        </div>
                        <div>
                          <label className="field-label" htmlFor="date">
                            Fecha
                          </label>
                          <Input
                            id="date"
                            type="date"
                            value={date}
                            onChange={(e) => setDate(e.target.value)}
                          />
                        </div>
                      </div>
                      <label className="field-label" htmlFor="category">
                        Categoría
                      </label>
                      <Select
                        value={category}
                        onValueChange={(next) => {
                          setCategory(next);
                          if (soundOn) playUiSound("selection");
                        }}
                      >
                        <SelectTrigger id="category" className="form-select">
                          <SelectValue placeholder="Selecciona categoría" />
                        </SelectTrigger>
                        <SelectContent
                          position="popper"
                          align="start"
                          sideOffset={6}
                          className="category-select-content"
                        >
                          {cats
                            .filter((c) =>
                              type === "INCOME"
                                ? c === "Sueldo" || c === "Otros"
                                : c !== "Sueldo",
                            )
                            .map((c) => (
                              <SelectItem
                                key={c}
                                value={c}
                                className="category-select-item"
                              >
                                {c}
                              </SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                      {error && <p className="form-error">{error}</p>}
                      <DialogFooter>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => setOpen(false)}
                        >
                          Cancelar
                        </Button>
                        <Button type="submit" className="add-button">
                          {editing ? "Guardar cambios" : "Guardar movimiento"}
                        </Button>
                      </DialogFooter>
                    </form>
                  </DialogContent>
                </Dialog>
              </div>
            </section>
            <section className="metric-grid" aria-label="Resumen financiero">
              <Card className="metric-card balance-card">
                <CardHeader>
                  <div className="metric-top">
                    <span>Balance neto</span>
                    <span className="metric-icon balance-symbol">
                      <CircleDollarSign size={19} strokeWidth={1.7} />
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <AnimatedMoney value={netBalance} className="metric-value" />
                  <div className="metric-foot">
                    <span className="trend-chip">
                      <TrendingUp size={13} />
                      {totalIncome
                        ? `${Math.round(((totalIncome - totalExpense) / totalIncome) * 100)}%`
                        : "—"}
                    </span>
                    <span>
                      {totalIncome
                        ? "del ingreso de este mes"
                        : "Acumulado al mes seleccionado"}
                    </span>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    className="initial-funds-trigger"
                    onClick={() => {
                      setInitialFundsDraft(
                        initialBalanceCents
                          ? formatAmountInput(String(Math.round(initialBalanceCents / 100)))
                          : "",
                      );
                      setInitialFundsOpen(true);
                    }}
                  >
                    <Plus size={13} />
                    {initialBalanceCents
                      ? `Fondo inicial ${money(initialBalanceCents)}`
                      : "Agregar fondo inicial"}
                  </Button>
                  <div className="balance-glow" />
                </CardContent>
              </Card>
              <Card className="metric-card income-card">
                <CardHeader>
                  <div className="metric-top">
                    <span>Ingresos</span>
                    <span className="metric-icon green">
                      <ArrowDownCircle size={19} strokeWidth={1.7} />
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <AnimatedMoney value={totalIncome} className="metric-value" />
                  <div className="metric-foot">
                    <i className="metric-dot green-dot" />
                    Ingresos del mes
                  </div>
                </CardContent>
              </Card>
              <Card className="metric-card expense-card">
                <CardHeader>
                  <div className="metric-top">
                    <span>Gastos</span>
                    <span className="metric-icon blue">
                      <ArrowUpCircle size={19} strokeWidth={1.7} />
                    </span>
                  </div>
                </CardHeader>
                <CardContent>
                  <AnimatedMoney
                    value={-totalExpense}
                    className="metric-value"
                  />
                  <div className="metric-foot">
                    <i className="metric-dot blue-dot" />
                    Gastos del mes
                  </div>
                </CardContent>
              </Card>
            </section>
            <section className="analytics-grid">
              <Card className="chart-card">
                <CardContent className="stacked-chart-content">
                  <StackedBars transactions={items} month={month} />
                </CardContent>
              </Card>
              <aside className="analytics-aside">
                <Card className="category-card">
                  <CardHeader className="section-card-header">
                    <div>
                      <CardTitle>Gastos por categoría</CardTitle>
                      <p className="card-subtitle">Distribución de este mes</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label="Ver movimientos"
                      title="Ver movimientos"
                      onClick={showTransactions}
                    >
                      <ArrowRight size={16} />
                    </Button>
                  </CardHeader>
                  <CardContent>
                    <div className="donut-wrap">
                      {pie.length ? (
                        <>
                          <ResponsiveContainer width="100%" height="100%">
                            <PieChart>
                              <Pie
                                data={pie}
                                dataKey="value"
                                nameKey="name"
                                innerRadius={67}
                                outerRadius={87}
                                paddingAngle={4}
                                stroke="none"
                              >
                                {pie.map((x) => (
                                  <Cell key={x.name} fill={colors[x.name]} />
                                ))}
                              </Pie>
                              <Tooltip
                                formatter={(v) => money(-Number(v))}
                                contentStyle={{
                                  background: "#111113",
                                  border: "1px solid rgb(255 255 255 / 12%)",
                                  borderRadius: 10,
                                  color: "#f5f5f7",
                                  fontSize: 12,
                                }}
                              />
                            </PieChart>
                          </ResponsiveContainer>
                          <div className="donut-center">
                            <span>TOTAL</span>
                            <strong>{money(-totalExpense)}</strong>
                          </div>
                        </>
                      ) : (
                        <div className="empty-donut">
                          <span>Sin gastos</span>
                          <small>para este periodo</small>
                        </div>
                      )}
                    </div>
                    <div className="category-list">
                      {pie.slice(0, 4).map((x) => (
                        <button
                          className="category-row"
                          key={x.name}
                          type="button"
                          aria-label={`Ver gastos de ${x.name}`}
                          aria-pressed={
                            kind === "EXPENSE" && categoryFilter === x.name
                          }
                          onClick={() => {
                            setKind("EXPENSE");
                            setCategoryFilter(x.name);
                            showTransactions();
                          }}
                        >
                          <span className="category-name">
                            <i style={{ background: colors[x.name] }} />
                            {x.name}
                          </span>
                          <span>
                            {Math.round((x.value / totalExpense) * 100)}%
                          </span>
                          <span className="category-meter" aria-hidden="true">
                            <i
                              style={{
                                width: `${Math.round((x.value / totalExpense) * 100)}%`,
                                background: colors[x.name],
                              }}
                            />
                          </span>
                        </button>
                      ))}
                    </div>
                  </CardContent>
                </Card>
                <Card className="period-card">
                  <CardHeader className="section-card-header">
                    <div>
                      <CardTitle>Actividad del periodo</CardTitle>
                      <p className="card-subtitle">{monthName(month)}</p>
                    </div>
                    <span className="period-card-icon">
                      <CalendarDays size={15} />
                    </span>
                  </CardHeader>
                  <CardContent className="period-stats">
                    <div>
                      <span>Promedio diario de gastos</span>
                      <strong>{money(-totalExpense / daysToAverage)}</strong>
                    </div>
                    <div>
                      <span>Movimientos registrados</span>
                      <strong>{monthItems.length}</strong>
                    </div>
                    <div>
                      <span>Categorías con gastos</span>
                      <strong>{pie.length}</strong>
                    </div>
                  </CardContent>
                </Card>
              </aside>
            </section>
            <section id="transactions" className="transactions-section">
              <div className="transactions-heading">
                <div>
                  <div className="table-title-row">
                    <h2>Movimientos recientes</h2>
                    <Badge variant="outline" className="count-badge">
                      {visible.length}
                    </Badge>
                  </div>
                  <p>Actividad registrada en {monthName(month)}</p>
                </div>
                <div className="table-actions">
                  <div className="search-box">
                    <Search size={15} />
                    <input
                      placeholder="Buscar movimiento"
                      value={query}
                      onChange={(e) => setQuery(e.target.value)}
                      aria-label="Buscar movimiento"
                    />
                  </div>
                  <select
                    className="filter-select"
                    value={kind}
                    onChange={(e) => {
                      setKind(e.target.value);
                      if (soundOn) playUiSound("selection");
                    }}
                    aria-label="Filtrar tipo"
                  >
                    <option value="ALL">Todos los tipos</option>
                    <option value="INCOME">Ingresos</option>
                    <option value="EXPENSE">Gastos</option>
                  </select>
                  <select
                    className="filter-select category-filter"
                    value={categoryFilter}
                    onChange={(e) => {
                      setCategoryFilter(e.target.value);
                      if (soundOn) playUiSound("selection");
                    }}
                    aria-label="Filtrar categoría"
                  >
                    <option value="ALL">Categorías</option>
                    {cats.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </select>
                  <div
                    className="date-range-group"
                    role="group"
                    aria-label="Rango de fechas"
                  >
                    <label className="date-range-field">
                      <span>Desde</span>
                      <Input
                        type="date"
                        value={dateFrom}
                        max={dateTo || undefined}
                        aria-label="Fecha desde"
                        onChange={(e) => {
                          const next = e.target.value;
                          setDateFrom(next);
                          if (dateTo && next > dateTo) setDateTo(next);
                        }}
                      />
                    </label>
                    <label className="date-range-field">
                      <span>Hasta</span>
                      <Input
                        type="date"
                        value={dateTo}
                        min={dateFrom || undefined}
                        aria-label="Fecha hasta"
                        onChange={(e) => {
                          const next = e.target.value;
                          setDateTo(next);
                          if (dateFrom && next < dateFrom) setDateFrom(next);
                        }}
                      />
                    </label>
                  </div>
                  <Button
                    variant="outline"
                    className="export-button"
                    onClick={exportCsv}
                  >
                    <Download size={15} />
                    Exportar
                  </Button>
                </div>
              </div>
              <Card className="transactions-card">
                <div className="table-scroll">
                  <table>
                    <thead>
                      <tr>
                        <th>DESCRIPCIÓN</th>
                        <th>CATEGORÍA</th>
                        <th>FECHA</th>
                        <th>TIPO</th>
                        <th className="amount-heading">IMPORTE</th>
                        <th aria-label="Acciones" />
                      </tr>
                    </thead>
                    <tbody>
                      <AnimatePresence initial={false}>
                        {visible.map((x, index) => (
                          <motion.tr
                            key={x.id}
                            className={`transaction-row ${x.type.toLowerCase()}`}
                            layout
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, x: 12 }}
                            transition={{
                              type: "spring",
                              stiffness: 420,
                              damping: 34,
                              delay: index < 8 ? index * 0.025 : 0,
                            }}
                          >
                            <td>
                              <div className="transaction-title">
                                <span
                                  className={`transaction-icon ${x.type === "INCOME" ? "income-icon" : "expense-icon"}`}
                                >
                                  {x.type === "INCOME" ? (
                                    <ArrowDownCircle
                                      size={17}
                                      strokeWidth={1.7}
                                    />
                                  ) : (
                                    <ArrowUpCircle
                                      size={17}
                                      strokeWidth={1.7}
                                    />
                                  )}
                                </span>
                                <strong>{x.description}</strong>
                              </div>
                            </td>
                            <td>
                              <span className="table-category">
                                <i
                                  style={{
                                    background:
                                      colors[x.category] ?? colors.Otros,
                                  }}
                                />
                                {x.category}
                              </span>
                            </td>
                            <td className="date-cell">{shortDate(x.date)}</td>
                            <td>
                              <Badge
                                variant="outline"
                                className={`type-badge ${x.type === "INCOME" ? "income-badge" : "expense-badge"}`}
                              >
                                {x.type === "INCOME" ? "Ingreso" : "Gasto"}
                              </Badge>
                            </td>
                            <td
                              className={`amount-cell ${x.type === "INCOME" ? "positive" : ""}`}
                            >
                              {x.type === "INCOME" ? "+" : "−"}
                              {money(x.amountCents)}
                            </td>
                            <td className="row-actions">
                              <Button
                                variant="ghost"
                                size="icon-xs"
                                className="row-edit"
                                aria-label={`Editar ${x.description}`}
                                onClick={() => edit(x)}
                              >
                                <Pencil size={13} />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon-xs"
                                className="row-delete"
                                aria-label={`Eliminar ${x.description}`}
                                onClick={() => remove(x.id)}
                              >
                                <Trash2 size={14} />
                              </Button>
                            </td>
                          </motion.tr>
                        ))}
                      </AnimatePresence>
                    </tbody>
                  </table>
                </div>
                <AnimatePresence initial={false}>
                  {!visible.length && (
                    <motion.div
                      key="empty-state"
                      className={`empty-state ${monthItems.length ? "filtered-empty" : "first-empty"}`}
                      initial={{ opacity: 0, y: 12, scale: 0.985 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -8, scale: 0.99 }}
                      transition={{
                        type: "spring",
                        stiffness: 340,
                        damping: 30,
                      }}
                    >
                      <div className="empty-state-orbit" aria-hidden="true">
                        {monthItems.length ? (
                          <Search size={25} strokeWidth={1.7} />
                        ) : (
                          <ChartNoAxesColumnIncreasing
                            size={25}
                            strokeWidth={1.7}
                          />
                        )}
                      </div>
                      <div className="empty-state-copy">
                        <strong>
                          {monthItems.length
                            ? "Sin coincidencias"
                            : "Tu actividad empieza aquí"}
                        </strong>
                        <span>
                          {monthItems.length
                            ? "Prueba otros filtros o una búsqueda distinta."
                            : "Registra un ingreso o gasto para completar el panel."}
                        </span>
                      </div>
                      {monthItems.length ? (
                        <Button
                          variant="outline"
                          className="empty-state-action"
                          onClick={() => {
                            setQuery("");
                            setKind("ALL");
                            setCategoryFilter("ALL");
                            setDateFrom("");
                            setDateTo("");
                          }}
                        >
                          Limpiar filtros
                        </Button>
                      ) : (
                        <Button
                          className="empty-state-action"
                          onClick={() => create()}
                        >
                          <Plus size={16} /> Registrar movimiento
                        </Button>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>
                <div className="table-footer">
                  <span>
                    <strong>{visible.length}</strong>{" "}
                    {visible.length === 1 ? "movimiento" : "movimientos"}
                  </span>
                  <span className="local-storage-note">
                    <i className="live-dot" />
                    Guardado localmente <Check size={13} />
                  </span>
                </div>
              </Card>
            </section>
          </div>
        </main>
        <nav className="mobile-bottom-nav" aria-label="Navegación móvil">
          <button
            className={nav === "Resumen" ? "active" : ""}
            aria-current={nav === "Resumen" ? "page" : undefined}
            onClick={() => {
              setNav("Resumen");
              document
                .getElementById("overview")
                ?.scrollIntoView({ behavior: "smooth" });
            }}
          >
            <LayoutDashboard size={17} />
            <span>Inicio</span>
          </button>
          <button
            className={nav === "Movimientos" ? "active" : ""}
            aria-current={nav === "Movimientos" ? "page" : undefined}
            onClick={() => {
              setNav("Movimientos");
              document
                .getElementById("transactions")
                ?.scrollIntoView({ behavior: "smooth" });
            }}
          >
            <CreditCard size={17} />
            <span>Movimientos</span>
          </button>
          <button
            className="mobile-create-trigger"
            onClick={() => setMobileTransactionOpen(true)}
            aria-label="Añadir movimiento"
          >
            <Plus size={17} />
            <span>Añadir</span>
          </button>
        </nav>
        <SwipeTransaction
          open={mobileTransactionOpen}
          onOpenChange={setMobileTransactionOpen}
          onSave={registerMobileTransaction}
        />
        {toast && (
          <div className="toast">
            <span>
              <Check size={14} />
            </span>
            {toast}
            <button onClick={() => setToast("")} aria-label="Cerrar aviso">
              <X size={14} />
            </button>
          </div>
        )}
      </div>
    </MotionConfig>
  );
}
