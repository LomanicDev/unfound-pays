import { useEffect, useRef, useState } from "react";
import { AnimatePresence, animate, motion, useMotionValue, useTransform } from "framer-motion";
import { ArrowDownLeft, ArrowRight, ArrowUpRight, Check, Delete, LockKeyhole, X } from "lucide-react";

type Kind = "INCOME" | "EXPENSE";
type SwipeTransactionData = {
  description: string;
  amountCents: number;
  type: Kind;
  category: string;
  date: string;
};
type SwipeTransactionProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (transaction: SwipeTransactionData) => void;
};
type Stage = "details" | "processing" | "success";

const expenseCategories = ["Vivienda", "Alimentación", "Transporte", "Salud", "Ocio", "Otros"];
const incomeCategories = ["Sueldo", "Otros"];
const today = () => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(now.getDate()).padStart(2, "0")}`;
};
const formatAmount = (value: string) =>
  new Intl.NumberFormat("es-PY", {
    style: "currency",
    currency: "PYG",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));

export function SwipeTransaction({ open, onOpenChange, onSave }: SwipeTransactionProps) {
  const [type, setType] = useState<Kind>("EXPENSE");
  const [amount, setAmount] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("Alimentación");
  const [date, setDate] = useState(today);
  const [stage, setStage] = useState<Stage>("details");
  const [error, setError] = useState("");
  const track = useRef<HTMLDivElement>(null);
  const wasOpen = useRef(false);
  const x = useMotionValue(0);
  const swipeBlur = useTransform(x, [0, 90, 230], ["blur(0px)", "blur(1.5px)", "blur(8px)"]);
  const swipeOpacity = useTransform(x, [0, 230], [1, 0.58]);
  const swipeTint = useTransform(x, [0, 90, 230], [0, 0.08, 0.24]);

  useEffect(() => {
    if (open && !wasOpen.current) {
      setType("EXPENSE");
      setAmount("");
      setDescription("");
      setCategory("Alimentación");
      setDate(today());
      setStage("details");
      setError("");
      x.set(0);
    }
    wasOpen.current = open;
  }, [open, x]);

  const close = () => {
    if (stage === "processing") return;
    onOpenChange(false);
    window.setTimeout(() => {
      setStage("details");
      setError("");
      x.set(0);
    }, 240);
  };

  const changeType = (next: Kind) => {
    setType(next);
    setCategory(next === "INCOME" ? "Sueldo" : "Alimentación");
    setError("");
  };

  const append = (digits: string) => {
    setError("");
    setAmount((current) => {
      const next = `${current}${digits}`.replace(/^0+(?=\d)/, "");
      return next.slice(0, 12);
    });
  };

  const confirmSwipe = (
    _event: MouseEvent | TouchEvent | PointerEvent,
    info: { offset: { x: number } },
  ) => {
    const width = track.current?.clientWidth ?? 280;
    if (info.offset.x < width * 0.55) {
      animate(x, 0, { type: "spring", stiffness: 420, damping: 32 });
      return;
    }
    if (!description.trim()) {
      setError("Escribe una descripción para guardar el movimiento.");
      animate(x, 0, { type: "spring", stiffness: 420, damping: 32 });
      return;
    }
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) {
      setError("Ingresa un importe antes de deslizar.");
      animate(x, 0, { type: "spring", stiffness: 420, damping: 32 });
      return;
    }
    setError("");
    setStage("processing");
    window.setTimeout(() => {
      onSave({
        description: description.trim(),
        amountCents: Math.round(value * 100),
        type,
        category,
        date,
      });
      setStage("success");
    }, 420);
  };

  const categories = type === "INCOME" ? incomeCategories : expenseCategories;

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="deposit-overlay transaction-swipe-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(event) => {
            if (event.target === event.currentTarget) close();
          }}
        >
          <motion.section
            className={`deposit-sheet transaction-swipe-sheet ${stage} ${type.toLowerCase()}`}
            initial={{ y: 38, opacity: 0.5, scale: 0.985 }}
            animate={{ y: 0, opacity: 1, scale: 1 }}
            exit={{ y: 28, opacity: 0, scale: 0.985 }}
            transition={{ type: "spring", stiffness: 360, damping: 32 }}
            aria-label="Registrar movimiento"
            aria-modal="true"
            role="dialog"
          >
            <div className="deposit-glow green" />
            <div className="deposit-glow red" />
            <motion.div
              className="swipe-drag-veil"
              style={{
                opacity: swipeTint,
                backgroundColor: type === "INCOME" ? "#4ade80" : "#fb7185",
              }}
            />
            <header className="deposit-head transaction-swipe-head">
              <div className="swipe-head-symbol"><LockKeyhole size={16} /></div>
              <div>
                <span>UNFOUND PAY · LOCAL</span>
                <strong>{stage === "success" ? "Movimiento guardado" : "Nuevo movimiento"}</strong>
              </div>
              <button type="button" onClick={close} aria-label="Cerrar" disabled={stage === "processing"}>
                <X size={18} />
              </button>
            </header>

            {stage === "details" && (
              <motion.div className="swipe-form-content" style={{ filter: swipeBlur, opacity: swipeOpacity }}>
                <div className={`swipe-kind-switch ${type === "INCOME" ? "income" : "expense"}`} role="group" aria-label="Tipo de movimiento">
                  <span className="swipe-kind-thumb" />
                  <button type="button" aria-pressed={type === "EXPENSE"} onClick={() => changeType("EXPENSE")}>
                    <ArrowUpRight size={16} /> Gasto
                  </button>
                  <button type="button" aria-pressed={type === "INCOME"} onClick={() => changeType("INCOME")}>
                    <ArrowDownLeft size={16} /> Ingreso
                  </button>
                </div>

                <label className="swipe-field">
                  <span>Descripción</span>
                  <input
                    type="text"
                    value={description}
                    maxLength={64}
                    placeholder={type === "EXPENSE" ? "¿En qué gastaste?" : "¿De dónde viene?"}
                    onChange={(event) => setDescription(event.target.value)}
                    autoComplete="off"
                  />
                </label>

                <div className="swipe-field-grid">
                  <label className="swipe-field">
                    <span>Fecha</span>
                    <input type="date" value={date} onChange={(event) => setDate(event.target.value)} />
                  </label>
                  <label className="swipe-field">
                    <span>Categoría</span>
                    <select value={category} onChange={(event) => setCategory(event.target.value)}>
                      {categories.map((item) => <option key={item} value={item}>{item}</option>)}
                    </select>
                  </label>
                </div>

                <div className="swipe-amount">
                  <span>IMPORTE · PYG</span>
                  <strong className={type === "INCOME" ? "income" : "expense"}>{formatAmount(amount)}</strong>
                </div>

                <div className="deposit-keypad swipe-keypad" aria-label="Teclado numérico">
                  {["1", "2", "3", "4", "5", "6", "7", "8", "9", "00", "0", "delete"].map((digit) => (
                    <button
                      key={digit}
                      type="button"
                      aria-label={digit === "delete" ? "Borrar último dígito" : `Escribir ${digit}`}
                      onClick={() => digit === "delete" ? setAmount((value) => value.slice(0, -1)) : append(digit)}
                    >
                      {digit === "delete" ? <Delete size={17} /> : digit}
                    </button>
                  ))}
                </div>

                <div ref={track} className={`deposit-track swipe-confirm-track ${type === "INCOME" ? "income" : "expense"} ${Number(amount) > 0 && description.trim() ? "ready" : ""}`}>
                  <span className="deposit-track-copy">Desliza para guardar</span>
                  <motion.button
                    type="button"
                    className="deposit-thumb"
                    style={{ x }}
                    drag="x"
                    dragConstraints={track}
                    dragElastic={0}
                    dragMomentum={false}
                    onDragEnd={confirmSwipe}
                    aria-label="Deslizar para guardar movimiento"
                  >
                    <ArrowRight size={18} />
                  </motion.button>
                </div>
                {error && <p className="deposit-error">{error}</p>}
              </motion.div>
            )}

            {stage === "processing" && (
              <div className="deposit-processing">
                <span className="deposit-spinner" />
                <strong>Guardando movimiento</strong>
                <small>Se guarda en este dispositivo…</small>
              </div>
            )}
            {stage === "success" && (
              <>
                <motion.div className={`deposit-success-card ${type === "EXPENSE" ? "expense" : ""}`} initial={{ y: 18, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
                  <span className="success-card-mark"><Check size={19} /></span>
                  <div>
                    <small>{type === "INCOME" ? "INGRESO REGISTRADO" : "GASTO REGISTRADO"}</small>
                    <strong>{description}</strong>
                  </div>
                  <b>{type === "INCOME" ? "+" : "−"}{formatAmount(amount)}</b>
                </motion.div>
                <button type="button" className="deposit-done" onClick={close}><Check size={16} /> Listo</button>
              </>
            )}
            <div className="deposit-home-indicator" />
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
