/**
 * CampusLib — Library Management System
 * Supabase-connected version: all state is fetched from and
 * persisted to the PostgreSQL database via the Supabase JS client.
 */

import { useState, useEffect, useRef, CSSProperties, FC, ReactElement } from "react";
import {
  Library, LayoutDashboard, BookMarked, Users, History,
  Bell, Search, TrendingUp, Clock, AlertCircle,
  X, CheckCircle, BookOpen, RotateCcw, Loader2,
  LucideProps,
} from "lucide-react";
import { supabase } from "./lib/supabase";
import type { Book, Member, Issue, StatusCls, IssueStatus, ToastItem, ToastType, NavId } from "./types";

// ─── Nav config ───────────────────────────────────────────────────────────────

interface NavEntry {
  id: NavId;
  label: string;
  icon: FC<LucideProps>;
}

const NAV: NavEntry[] = [
  { id: "dashboard", label: "Dashboard",      icon: LayoutDashboard },
  { id: "books",     label: "Book Inventory", icon: BookMarked       },
  { id: "members",   label: "Member Records", icon: Users            },
  { id: "history",   label: "Issue History",  icon: History          },
];

// ─── Business logic ───────────────────────────────────────────────────────────

function daysDiff(dateStr: string): number {
  const due = new Date(dateStr);
  return Math.floor((Date.now() - due.getTime()) / 864e5);
}

function getIssueStatus(issue: Issue): IssueStatus {
  if (issue.returned !== null) return { label: "RETURNED", cls: "returned" };
  const days = daysDiff(issue.return_date);
  if (days > 10) return { label: `₹${days * 2}.00 FINE`, cls: "fine" };
  if (days > 0)  return { label: "GRACE PER.",            cls: "grace"   };
  return { label: "ON TIME", cls: "ontime" };
}

const formatTime = (): string =>
  new Date().toLocaleString("en-IN", {
    day: "2-digit", month: "short", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });

// ─── Toast ────────────────────────────────────────────────────────────────────

interface ToastProps { toasts: ToastItem[]; dismiss: (id: number) => void; }

const Toast: FC<ToastProps> = ({ toasts, dismiss }) => (
  <div style={{ position: "fixed", top: 20, right: 20, zIndex: 9999, display: "flex", flexDirection: "column", gap: 10, pointerEvents: "none" }}>
    {toasts.map((t) => (
      <div key={t.id} style={{ pointerEvents: "auto", display: "flex", alignItems: "center", gap: 12, background: t.type === "error" ? "#fff1f2" : "#f0fdf4", border: `1px solid ${t.type === "error" ? "#fecdd3" : "#bbf7d0"}`, color: t.type === "error" ? "#be123c" : "#15803d", padding: "12px 16px", borderRadius: 10, fontSize: 13, fontWeight: 600, boxShadow: "0 4px 24px rgba(0,0,0,0.10)", animation: "toastIn 0.22s ease", maxWidth: 360 }}>
        {t.type === "error" ? <AlertCircle size={15} /> : <CheckCircle size={15} />}
        <span style={{ flex: 1 }}>{t.msg}</span>
        <X size={13} style={{ cursor: "pointer", opacity: 0.5 }} onClick={() => dismiss(t.id)} />
      </div>
    ))}
  </div>
);

// ─── Loading / Error screens ──────────────────────────────────────────────────

const LoadingScreen: FC = () => (
  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", flexDirection: "column", gap: 16, background: "#f8fafc" }}>
    <Loader2 size={32} color="#6366f1" style={{ animation: "spin 1s linear infinite" }} />
    <p style={{ fontSize: 14, color: "#64748b", fontWeight: 500 }}>Connecting to database…</p>
  </div>
);

const ErrorScreen: FC<{ message: string }> = ({ message }) => (
  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", flexDirection: "column", gap: 12, background: "#f8fafc" }}>
    <AlertCircle size={32} color="#f43f5e" />
    <p style={{ fontSize: 14, color: "#be123c", fontWeight: 600 }}>Failed to load data</p>
    <p style={{ fontSize: 12, color: "#94a3b8", maxWidth: 400, textAlign: "center" }}>{message}</p>
  </div>
);

// ─── Nav Item ─────────────────────────────────────────────────────────────────

interface NavItemProps { id: NavId; icon: FC<LucideProps>; label: string; active: boolean; onClick: () => void; }

const NavItem: FC<NavItemProps> = ({ icon: Icon, label, active, onClick }) => (
  <button onClick={onClick} style={{ width: "100%", display: "flex", alignItems: "center", gap: 14, padding: "11px 16px", borderRadius: 8, border: "none", cursor: "pointer", background: active ? "rgba(99,102,241,0.15)" : "transparent", color: active ? "#a5b4fc" : "rgba(148,163,184,0.7)", fontSize: 13, fontWeight: active ? 600 : 400, transition: "all 0.15s", textAlign: "left" }}
    onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = "rgba(255,255,255,0.04)"; }}
    onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = "transparent"; }}
  >
    {active ? <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#818cf8", flexShrink: 0 }} /> : <Icon size={15} style={{ opacity: 0.5, flexShrink: 0 }} />}
    <span>{label}</span>
    {active && <LayoutDashboard size={14} style={{ marginLeft: "auto", opacity: 0.3 }} />}
  </button>
);

// ─── Stat Card ────────────────────────────────────────────────────────────────

interface StatCardProps { label: string; value: number; sub?: string; icon: FC<LucideProps>; iconBg: string; iconColor: string; accent?: string; barPct?: number; alert?: string; }

const StatCard: FC<StatCardProps> = ({ label, value, sub, icon: Icon, iconBg, iconColor, accent, barPct, alert }) => (
  <div style={{ background: "#fff", padding: 24, borderRadius: 12, border: alert ? "1px solid transparent" : "1px solid #e2e8f0", borderLeft: alert ? "4px solid #f43f5e" : undefined, boxShadow: "0 1px 3px rgba(0,0,0,0.06)", transition: "box-shadow 0.2s" }}
    onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "0 4px 16px rgba(0,0,0,0.10)")}
    onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "0 1px 3px rgba(0,0,0,0.06)")}
  >
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
      <p style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.1em" }}>{label}</p>
      <div style={{ padding: 8, background: iconBg, borderRadius: 8, display: "flex" }}><Icon size={15} color={iconColor} /></div>
    </div>
    <p style={{ fontSize: 28, fontWeight: 800, color: accent ?? "#0f172a", lineHeight: 1 }}>
      {value}{sub !== undefined && <span style={{ fontSize: 11, fontWeight: 400, color: "#94a3b8" }}> {sub}</span>}
    </p>
    {barPct !== undefined && (
      <div style={{ marginTop: 16, height: 3, background: "#f1f5f9", borderRadius: 2, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${barPct}%`, background: "#6366f1", borderRadius: 2 }} />
      </div>
    )}
    {barPct === undefined && sub === undefined && (
      <div style={{ marginTop: 14, fontSize: 11, fontWeight: 700, color: alert ? "#f43f5e" : "#10b981", display: "flex", alignItems: "center", gap: 4 }}>
        {alert ? <><AlertCircle size={11} /> {alert}</> : <><TrendingUp size={11} /> Live data</>}
      </div>
    )}
  </div>
);

// ─── Status Badge ─────────────────────────────────────────────────────────────

const STATUS_STYLES: Record<StatusCls, { bg: string; color: string; ring: string }> = {
  ontime:   { bg: "#f0fdf4", color: "#15803d", ring: "#bbf7d0" },
  fine:     { bg: "#fff1f2", color: "#be123c", ring: "#fecdd3" },
  grace:    { bg: "#fffbeb", color: "#92400e", ring: "#fde68a" },
  returned: { bg: "#f8fafc", color: "#64748b", ring: "#e2e8f0" },
};

const StatusBadge: FC<{ status: IssueStatus }> = ({ status }) => {
  const s = STATUS_STYLES[status.cls];
  return <span style={{ padding: "3px 8px", borderRadius: 5, fontSize: 10, fontWeight: 700, background: s.bg, color: s.color, border: `1px solid ${s.ring}`, whiteSpace: "nowrap" }}>{status.label}</span>;
};

// ─── Dashboard View ───────────────────────────────────────────────────────────

interface DashboardViewProps {
  books: Book[]; members: Member[]; issues: Issue[];
  toast: (msg: string, type?: ToastType) => void;
  reload: () => Promise<void>;
}

const DashboardView: FC<DashboardViewProps> = ({ books, members, issues, toast, reload }) => {
  const [memId,      setMemId]      = useState<string>("");
  const [bookNo,     setBookNo]     = useState<string>("");
  const [returnNo,   setReturnNo]   = useState<string>("");
  const [showReturn, setShowReturn] = useState<boolean>(false);
  const [issuing,    setIssuing]    = useState<boolean>(false);
  const [returning,  setReturning]  = useState<boolean>(false);

  const totalStock   = books.reduce((s, b) => s + b.qty_stock, 0);
  const activeIssues = issues.filter((i) => i.returned === null).length;
  const overdueCount = issues.filter((i) => i.returned === null && daysDiff(i.return_date) > 0).length;
  const recentIssues = [...issues].reverse().slice(0, 6);

  const handleIssue = async (): Promise<void> => {
    const mId = parseInt(memId, 10);
    const bNo = parseInt(bookNo, 10);
    if (!mId || !bNo) return toast("Enter both Member ID and Book Number.", "error");

    setIssuing(true);
    const { error } = await supabase.from("issue").insert({ mem_id: mId, book_no: bNo });
    setIssuing(false);

    if (error) { toast(error.message, "error"); return; }
    setMemId(""); setBookNo("");
    toast("Book issued successfully.");
    await reload();
  };

  const handleReturn = async (): Promise<void> => {
    const no = parseInt(returnNo, 10);
    if (!no) return toast("Enter an issue number.", "error");
    const iss = issues.find((i) => i.issue_no === no);
    if (!iss)                  return toast(`Issue #${no} not found.`, "error");
    if (iss.returned !== null) return toast(`Issue #${no} already returned.`, "error");

    setReturning(true);
    const today = new Date().toISOString().split("T")[0];
    const { error } = await supabase.from("issue").update({ returned: today }).eq("issue_no", no);
    setReturning(false);

    if (error) { toast(error.message, "error"); return; }
    setReturnNo("");
    toast(`Issue #${no} returned. Fine (if any) updated on member record.`);
    await reload();
  };

  const inputStyle: CSSProperties = { width: "100%", padding: "10px 14px", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 13, outline: "none", background: "#f8fafc", color: "#0f172a", fontFamily: "inherit", transition: "border-color 0.2s" };

  return (
    <div style={{ padding: 32, display: "flex", flexDirection: "column", gap: 28, maxWidth: 1200, margin: "0 auto", width: "100%" }}>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 20 }}>
        <StatCard label="Stock Availability" value={totalStock}      sub="vols" icon={Library}    iconBg="#eef2ff" iconColor="#6366f1" />
        <StatCard label="Total Members"      value={members.length}  sub=""     icon={Users}       iconBg="#f1f5f9" iconColor="#475569" />
        <StatCard label="Currently Issued"   value={activeIssues}              icon={Clock}       iconBg="#f0fdf4" iconColor="#16a34a" accent="#6366f1" barPct={Math.round((activeIssues / Math.max(activeIssues + 50, 1)) * 100)} />
        <StatCard label="Overdue Alerts"     value={overdueCount}              icon={AlertCircle} iconBg="#fff1f2" iconColor="#f43f5e" accent="#f43f5e" alert={overdueCount > 0 ? "Requires follow-up" : undefined} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: 24 }}>

        {/* Transactions */}
        <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.05)", overflow: "hidden" }}>
          <div style={{ padding: "18px 24px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <h3 style={{ fontWeight: 700, fontSize: 14, color: "#0f172a", display: "flex", alignItems: "center", gap: 8 }}>
              <History size={15} color="#6366f1" /> Recent Transactions
            </h3>
            <button style={{ fontSize: 11, fontWeight: 700, color: "#6366f1", background: "none", border: "none", cursor: "pointer", letterSpacing: "0.05em" }} onClick={() => setShowReturn((v) => !v)}>
              {showReturn ? "HIDE RETURN" : "RETURN A BOOK"}
            </button>
          </div>

          {showReturn && (
            <div style={{ padding: "16px 24px", borderBottom: "1px solid #f1f5f9", background: "#f8fafc", display: "flex", gap: 10, alignItems: "center" }}>
              <input style={{ ...inputStyle, flex: 1, padding: "8px 12px" }} type="number" placeholder="Enter Issue Number to return…" value={returnNo} onChange={(e) => setReturnNo(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleReturn()} />
              <button onClick={handleReturn} disabled={returning} style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", background: "#10b981", color: "#fff", border: "none", borderRadius: 8, fontSize: 12, fontWeight: 700, cursor: returning ? "not-allowed" : "pointer", opacity: returning ? 0.7 : 1 }}>
                {returning ? <Loader2 size={13} style={{ animation: "spin 1s linear infinite" }} /> : <RotateCcw size={13} />} Return
              </button>
            </div>
          )}

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse" }}>
              <thead>
                <tr style={{ background: "#f8fafc", fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.1em" }}>
                  {["Issue ID", "Member", "Book Title", "Due Date", "Status"].map((h) => (
                    <th key={h} style={{ padding: "12px 20px", textAlign: "left", whiteSpace: "nowrap" }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody style={{ fontSize: 13 }}>
                {recentIssues.map((iss) => {
                  const mem = members.find((m) => m.mem_id  === iss.mem_id);
                  const bk  = books.find((b)   => b.book_no === iss.book_no);
                  const status = getIssueStatus(iss);
                  return (
                    <tr key={iss.issue_no} style={{ borderTop: "1px solid #f1f5f9", transition: "background 0.12s" }} onMouseEnter={(e) => (e.currentTarget.style.background = "#fafafa")} onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                      <td style={{ padding: "14px 20px", fontFamily: "monospace", fontSize: 12, color: "#64748b" }}>#{iss.issue_no}</td>
                      <td style={{ padding: "14px 20px" }}>
                        <div style={{ fontWeight: 600, color: "#0f172a" }}>{mem?.mem_name ?? `ID ${iss.mem_id}`}</div>
                        <div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", marginTop: 2 }}>{mem?.mem_address}</div>
                      </td>
                      <td style={{ padding: "14px 20px", color: "#475569" }}>{bk?.book_name ?? `Book #${iss.book_no}`}</td>
                      <td style={{ padding: "14px 20px", fontFamily: "monospace", fontSize: 12, color: "#64748b" }}>{iss.return_date}</td>
                      <td style={{ padding: "14px 20px" }}><StatusBadge status={status} /></td>
                    </tr>
                  );
                })}
                {recentIssues.length === 0 && (
                  <tr><td colSpan={5} style={{ padding: "32px 20px", textAlign: "center", color: "#94a3b8", fontSize: 13 }}>No transactions yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Issue Panel */}
        <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", boxShadow: "0 1px 3px rgba(0,0,0,0.05)", padding: 24, display: "flex", flexDirection: "column", gap: 20 }}>
          <h3 style={{ fontWeight: 700, fontSize: 14, color: "#0f172a", display: "flex", alignItems: "center", gap: 8, margin: 0 }}>
            <BookMarked size={15} color="#6366f1" /> Issue New Book
          </h3>

          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            {([{ field: "Member ID", val: memId, set: setMemId, ph: "e.g. 1" }, { field: "Book Number", val: bookNo, set: setBookNo, ph: "e.g. 1" }] as const).map(({ field, val, set, ph }) => (
              <div key={field}>
                <label style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.1em", display: "block", marginBottom: 6 }}>{field}</label>
                <input style={inputStyle} type="number" placeholder={ph} value={val} onChange={(e) => set(e.target.value)} onFocus={(e) => (e.target.style.borderColor = "#6366f1")} onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")} />
              </div>
            ))}
          </div>

          <div style={{ padding: "14px 16px", background: "#eef2ff", borderRadius: 10, border: "1px solid #c7d2fe" }}>
            <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, fontWeight: 700, color: "#4338ca", marginBottom: 10 }}>
              <span>DB Trigger Active:</span>
              <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <div style={{ width: 5, height: 5, borderRadius: "50%", background: "#818cf8", animation: "pulse 1.5s infinite" }} />
                trg_issue_book
              </span>
            </div>
            {["Issue period: 10 days", "Grace period: +10 days (free)", "Post-grace fine: ₹2.00 / day"].map((r) => (
              <div key={r} style={{ fontSize: 11, color: "#4f46e5", fontWeight: 500, marginBottom: 4 }}>• {r}</div>
            ))}
          </div>

          <button onClick={handleIssue} disabled={issuing} style={{ width: "100%", background: "#4f46e5", color: "#fff", border: "none", borderRadius: 10, padding: "13px 0", fontWeight: 700, fontSize: 12, letterSpacing: "0.07em", cursor: issuing ? "not-allowed" : "pointer", opacity: issuing ? 0.7 : 1, boxShadow: "0 4px 14px rgba(99,102,241,0.3)", transition: "background 0.15s", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}
            onMouseEnter={(e) => { if (!issuing) e.currentTarget.style.background = "#4338ca"; }}
            onMouseLeave={(e) => { if (!issuing) e.currentTarget.style.background = "#4f46e5"; }}
          >
            {issuing && <Loader2 size={14} style={{ animation: "spin 1s linear infinite" }} />}
            COMMIT TRANSACTION
          </button>

          <p style={{ fontSize: 10, color: "#94a3b8", textAlign: "center", fontStyle: "italic", margin: 0 }}>* Dates, stock check &amp; decrement handled by DB trigger</p>

          <div style={{ borderTop: "1px solid #f1f5f9", paddingTop: 16 }}>
            <div style={{ fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.1em", marginBottom: 8 }}>Member Directory</div>
            {members.map((m) => (
              <div key={m.mem_id} onClick={() => setMemId(String(m.mem_id))} style={{ display: "flex", justifyContent: "space-between", padding: "6px 0", fontSize: 12, borderBottom: "1px solid #f8fafc", cursor: "pointer", color: "#475569" }} onMouseEnter={(e) => (e.currentTarget.style.color = "#6366f1")} onMouseLeave={(e) => (e.currentTarget.style.color = "#475569")}>
                <span style={{ fontWeight: 600 }}>{m.mem_name}</span>
                <span style={{ fontFamily: "monospace", color: "#94a3b8" }}>{m.mem_id}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Books View ───────────────────────────────────────────────────────────────

const BooksView: FC<{ books: Book[]; searchQuery: string }> = ({ books, searchQuery }) => {
  const filtered = books.filter((b) => b.book_name.toLowerCase().includes(searchQuery.toLowerCase()) || b.author_name.toLowerCase().includes(searchQuery.toLowerCase()));
  return (
    <div style={{ padding: 32, maxWidth: 1200, margin: "0 auto", width: "100%" }}>
      <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
        <div style={{ padding: "18px 24px", borderBottom: "1px solid #f1f5f9" }}>
          <h3 style={{ fontWeight: 700, fontSize: 14, color: "#0f172a", display: "flex", alignItems: "center", gap: 8, margin: 0 }}>
            <BookOpen size={15} color="#6366f1" /> Book Inventory
            <span style={{ marginLeft: "auto", fontSize: 11, color: "#94a3b8", fontWeight: 500 }}>{filtered.length} titles</span>
          </h3>
        </div>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "#f8fafc", fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.1em" }}>
              {["#", "Title", "Author", "Price", "In Stock", "Status"].map((h) => <th key={h} style={{ padding: "12px 20px", textAlign: "left" }}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {filtered.map((b) => (
              <tr key={b.book_no} style={{ borderTop: "1px solid #f1f5f9" }} onMouseEnter={(e) => (e.currentTarget.style.background = "#fafafa")} onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                <td style={{ padding: "14px 20px", fontFamily: "monospace", fontSize: 11, color: "#94a3b8" }}>{b.book_no}</td>
                <td style={{ padding: "14px 20px", fontWeight: 600, color: "#0f172a" }}>{b.book_name}</td>
                <td style={{ padding: "14px 20px", color: "#64748b", fontStyle: "italic" }}>{b.author_name}</td>
                <td style={{ padding: "14px 20px", color: "#475569" }}>{b.price !== null ? `₹${b.price.toFixed(2)}` : "—"}</td>
                <td style={{ padding: "14px 20px" }}>
                  <span style={{ padding: "3px 10px", borderRadius: 6, fontSize: 11, fontWeight: 700, background: b.qty_stock > 0 ? "#f0fdf4" : "#fff1f2", color: b.qty_stock > 0 ? "#15803d" : "#be123c", border: `1px solid ${b.qty_stock > 0 ? "#bbf7d0" : "#fecdd3"}` }}>{b.qty_stock}</span>
                </td>
                <td style={{ padding: "14px 20px" }}>
                  <span style={{ padding: "3px 8px", borderRadius: 5, fontSize: 10, fontWeight: 700, background: b.qty_stock > 0 ? "#eef2ff" : "#f1f5f9", color: b.qty_stock > 0 ? "#4338ca" : "#94a3b8" }}>{b.qty_stock > 0 ? "AVAILABLE" : "OUT OF STOCK"}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <div style={{ padding: "40px 20px", textAlign: "center", color: "#94a3b8", fontSize: 13 }}>No books found matching your search.</div>}
      </div>
    </div>
  );
};

// ─── Members View ─────────────────────────────────────────────────────────────

const MembersView: FC<{ members: Member[] }> = ({ members }) => (
  <div style={{ padding: 32, maxWidth: 1200, margin: "0 auto", width: "100%" }}>
    <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
      <div style={{ padding: "18px 24px", borderBottom: "1px solid #f1f5f9" }}>
        <h3 style={{ fontWeight: 700, fontSize: 14, color: "#0f172a", display: "flex", alignItems: "center", gap: 8, margin: 0 }}><Users size={15} color="#6366f1" /> Member Records</h3>
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
        <thead>
          <tr style={{ background: "#f8fafc", fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.1em" }}>
            {["Member ID", "Name", "Address", "Joined", "Outstanding Fine"].map((h) => <th key={h} style={{ padding: "12px 20px", textAlign: "left" }}>{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {members.map((m) => (
            <tr key={m.mem_id} style={{ borderTop: "1px solid #f1f5f9" }} onMouseEnter={(e) => (e.currentTarget.style.background = "#fafafa")} onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
              <td style={{ padding: "14px 20px", fontFamily: "monospace", fontSize: 12, color: "#64748b" }}>{m.mem_id}</td>
              <td style={{ padding: "14px 20px", fontWeight: 600, color: "#0f172a" }}>{m.mem_name}</td>
              <td style={{ padding: "14px 20px", color: "#64748b" }}>{m.mem_address}</td>
              <td style={{ padding: "14px 20px", fontFamily: "monospace", fontSize: 12, color: "#94a3b8" }}>{m.doj}</td>
              <td style={{ padding: "14px 20px", fontWeight: 700, color: m.fine_amt > 0 ? "#be123c" : "#94a3b8", fontSize: m.fine_amt > 0 ? 14 : 13 }}>₹{m.fine_amt.toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

// ─── History View ─────────────────────────────────────────────────────────────

const HistoryView: FC<{ issues: Issue[]; books: Book[]; members: Member[] }> = ({ issues, books, members }) => (
  <div style={{ padding: 32, maxWidth: 1200, margin: "0 auto", width: "100%" }}>
    <div style={{ background: "#fff", borderRadius: 12, border: "1px solid #e2e8f0", overflow: "hidden", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
      <div style={{ padding: "18px 24px", borderBottom: "1px solid #f1f5f9", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h3 style={{ fontWeight: 700, fontSize: 14, color: "#0f172a", display: "flex", alignItems: "center", gap: 8, margin: 0 }}><History size={15} color="#6366f1" /> Full Issue History</h3>
        <span style={{ fontFamily: "monospace", fontSize: 10, color: "#94a3b8", background: "#f8fafc", padding: "3px 10px", borderRadius: 5, border: "1px solid #e2e8f0" }}>SELECT * FROM issue;</span>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "#f8fafc", fontSize: 10, fontWeight: 700, color: "#94a3b8", textTransform: "uppercase", letterSpacing: "0.1em" }}>
              {["Issue #", "Issue Date", "Member", "Book", "Due Date", "Returned On", "Status"].map((h) => <th key={h} style={{ padding: "12px 20px", textAlign: "left", whiteSpace: "nowrap" }}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {[...issues].reverse().map((iss) => {
              const mem = members.find((m) => m.mem_id  === iss.mem_id);
              const bk  = books.find((b)   => b.book_no === iss.book_no);
              const status = getIssueStatus(iss);
              return (
                <tr key={iss.issue_no} style={{ borderTop: "1px solid #f1f5f9" }} onMouseEnter={(e) => (e.currentTarget.style.background = "#fafafa")} onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}>
                  <td style={{ padding: "14px 20px", fontFamily: "monospace", fontSize: 13, fontWeight: 700, color: "#6366f1" }}>#{iss.issue_no}</td>
                  <td style={{ padding: "14px 20px", fontFamily: "monospace", fontSize: 12, color: "#94a3b8" }}>{iss.issue_date}</td>
                  <td style={{ padding: "14px 20px" }}>
                    <div style={{ fontWeight: 600, color: "#0f172a" }}>{mem?.mem_name ?? `#${iss.mem_id}`}</div>
                    <div style={{ fontSize: 10, color: "#94a3b8", fontWeight: 700, textTransform: "uppercase" }}>{mem?.mem_address}</div>
                  </td>
                  <td style={{ padding: "14px 20px", color: "#475569" }}>{bk?.book_name ?? `#${iss.book_no}`}</td>
                  <td style={{ padding: "14px 20px", fontFamily: "monospace", fontSize: 12, color: "#64748b" }}>{iss.return_date}</td>
                  <td style={{ padding: "14px 20px", fontFamily: "monospace", fontSize: 12, color: iss.returned ? "#15803d" : "#94a3b8" }}>{iss.returned ?? "—"}</td>
                  <td style={{ padding: "14px 20px" }}><StatusBadge status={status} /></td>
                </tr>
              );
            })}
            {issues.length === 0 && <tr><td colSpan={7} style={{ padding: "32px 20px", textAlign: "center", color: "#94a3b8", fontSize: 13 }}>No issue records yet.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  </div>
);

// ─── Root App ─────────────────────────────────────────────────────────────────

export default function App(): ReactElement {
  const [books,   setBooks]   = useState<Book[]>([]);
  const [members, setMembers] = useState<Member[]>([]);
  const [issues,  setIssues]  = useState<Issue[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [dbError, setDbError] = useState<string | null>(null);
  const [nav,         setNav]         = useState<NavId>("dashboard");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [toasts,      setToasts]      = useState<ToastItem[]>([]);
  const [time,        setTime]        = useState<string>(formatTime());
  const toastId = useRef<number>(0);

  const fetchAll = async (): Promise<void> => {
    const [booksRes, membersRes, issuesRes] = await Promise.all([
      supabase.from("book").select("*").order("book_no"),
      supabase.from("member").select("*").order("mem_id"),
      supabase.from("issue").select("*").order("issue_no"),
    ]);
    if (booksRes.error || membersRes.error || issuesRes.error) {
      setDbError(booksRes.error?.message ?? membersRes.error?.message ?? issuesRes.error?.message ?? "Unknown error");
      return;
    }
    setBooks(booksRes.data);
    setMembers(membersRes.data);
    setIssues(issuesRes.data);
    setDbError(null);
  };

  useEffect(() => { setLoading(true); fetchAll().finally(() => setLoading(false)); }, []);

  // Real-time: Supabase pushes row changes to all connected clients instantly
  useEffect(() => {
    const channel = supabase
      .channel("campuslib-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "book" },
        () => supabase.from("book").select("*").order("book_no").then(({ data }) => { if (data) setBooks(data); }))
      .on("postgres_changes", { event: "*", schema: "public", table: "member" },
        () => supabase.from("member").select("*").order("mem_id").then(({ data }) => { if (data) setMembers(data); }))
      .on("postgres_changes", { event: "*", schema: "public", table: "issue" },
        () => supabase.from("issue").select("*").order("issue_no").then(({ data }) => { if (data) setIssues(data); }))
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => { const t = setInterval(() => setTime(formatTime()), 10_000); return () => clearInterval(t); }, []);

  const addToast = (msg: string, type: ToastType = "success"): void => {
    const id = ++toastId.current;
    setToasts((prev) => [...prev, { id, msg, type }]);
    setTimeout(() => setToasts((prev) => prev.filter((t) => t.id !== id)), 4000);
  };
  const dismissToast = (id: number): void => setToasts((prev) => prev.filter((t) => t.id !== id));

  const overdueCount   = issues.filter((i) => i.returned === null && daysDiff(i.return_date) > 0).length;
  const activeNavLabel = NAV.find((n) => n.id === nav)?.label ?? "Dashboard";

  if (loading) return <LoadingScreen />;
  if (dbError)  return <ErrorScreen message={dbError} />;

  return (
    <>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap');`}</style>
      <Toast toasts={toasts} dismiss={dismissToast} />

      <div style={{ display: "flex", minHeight: "100vh", background: "#f8fafc", fontFamily: "'Inter', system-ui, sans-serif", color: "#0f172a" }}>

        <aside style={{ width: 256, background: "#0f172a", display: "flex", flexDirection: "column", flexShrink: 0, borderRight: "1px solid #1e293b" }}>
          <div style={{ padding: "28px 24px 24px", display: "flex", alignItems: "center", gap: 12 }}>
            <div style={{ width: 38, height: 38, background: "#4f46e5", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 4px 14px rgba(99,102,241,0.4)" }}>
              <Library size={20} color="#fff" />
            </div>
            <div>
              <div style={{ color: "#f1f5f9", fontWeight: 800, fontSize: 15, letterSpacing: "-0.02em" }}>CAMPUSLIB</div>
              <div style={{ color: "#475569", fontSize: 9, textTransform: "uppercase", letterSpacing: "0.2em", fontWeight: 600 }}>Admin Console</div>
            </div>
          </div>

          <nav style={{ flex: 1, padding: "8px 12px", display: "flex", flexDirection: "column", gap: 2 }}>
            {NAV.map((n) => <NavItem key={n.id} {...n} active={nav === n.id} onClick={() => setNav(n.id)} />)}
          </nav>

          <div style={{ padding: "12px 16px", borderTop: "1px solid #1e293b" }}>
            <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 8, padding: "10px 14px", border: "1px solid rgba(255,255,255,0.05)", display: "flex", alignItems: "center", gap: 8 }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#10b981", boxShadow: "0 0 6px #10b981", flexShrink: 0 }} />
              <div>
                <div style={{ fontSize: 9, textTransform: "uppercase", letterSpacing: "0.16em", color: "#475569", fontWeight: 700 }}>Supabase</div>
                <div style={{ fontSize: 11, fontFamily: "monospace", color: "#818cf8" }}>Connected</div>
              </div>
            </div>
          </div>
        </aside>

        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0, height: "100vh", overflow: "hidden" }}>
          <header style={{ height: 64, background: "#fff", borderBottom: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 28px", flexShrink: 0, boxShadow: "0 1px 3px rgba(0,0,0,0.04)", zIndex: 10 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
              <span style={{ color: "#94a3b8" }}>System /</span>
              <span style={{ fontWeight: 600, color: "#0f172a" }}>{activeNavLabel}</span>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
              <div style={{ position: "relative" }}>
                <Search size={14} style={{ position: "absolute", left: 11, top: "50%", transform: "translateY(-50%)", color: "#94a3b8" }} />
                <input type="text" placeholder="Search resources…" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} style={{ paddingLeft: 34, paddingRight: 14, paddingTop: 8, paddingBottom: 8, background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: 8, fontSize: 12, outline: "none", width: 220, color: "#0f172a", fontFamily: "inherit" }} onFocus={(e) => (e.target.style.borderColor = "#6366f1")} onBlur={(e) => (e.target.style.borderColor = "#e2e8f0")} />
              </div>
              <div style={{ textAlign: "right" }}>
                <div style={{ fontSize: 9, color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.08em" }}>Server Time</div>
                <div style={{ fontSize: 12, fontWeight: 600, color: "#475569", fontFamily: "monospace" }}>{time}</div>
              </div>
              <div style={{ position: "relative", cursor: "pointer" }}>
                <div style={{ width: 36, height: 36, borderRadius: "50%", background: "#f1f5f9", border: "1px solid #e2e8f0", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Bell size={16} color="#64748b" />
                </div>
                {overdueCount > 0 && (
                  <span style={{ position: "absolute", top: 0, right: 0, width: 14, height: 14, background: "#f43f5e", borderRadius: "50%", border: "2px solid #fff", fontSize: 8, color: "#fff", fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>{overdueCount}</span>
                )}
              </div>
            </div>
          </header>

          <div style={{ flex: 1, overflowY: "auto" }}>
            {nav === "dashboard" && <DashboardView books={books} members={members} issues={issues} toast={addToast} reload={fetchAll} />}
            {nav === "books"     && <BooksView   books={books}     searchQuery={searchQuery} />}
            {nav === "members"   && <MembersView members={members} />}
            {nav === "history"   && <HistoryView issues={issues}   books={books} members={members} />}
          </div>
        </div>
      </div>
    </>
  );
}
