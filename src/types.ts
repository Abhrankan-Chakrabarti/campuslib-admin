// =============================================================
// Domain types — mirror the Supabase / PostgreSQL schema exactly.
// Import these everywhere instead of redefining inline.
// =============================================================

export interface Book {
  book_no: number;
  book_name: string;
  author_name: string;
  price: number | null;
  qty_stock: number;
}

export interface Member {
  mem_id: number;
  mem_name: string;
  mem_address: string;
  doj: string;           // ISO date string: "YYYY-MM-DD"
  fine_amt: number;
}

export interface Issue {
  issue_no: number;
  issue_date: string;    // ISO date string: "YYYY-MM-DD"
  mem_id: number;
  book_no: number;
  return_date: string;   // ISO date string: "YYYY-MM-DD"
  returned: string | null;
}

// ── View / UI types ───────────────────────────────────────────

export type StatusCls = "ontime" | "grace" | "fine" | "returned";

export interface IssueStatus {
  label: string;
  cls: StatusCls;
}

export type ToastType = "success" | "error";

export interface ToastItem {
  id: number;
  msg: string;
  type: ToastType;
}

export type NavId = "dashboard" | "books" | "members" | "history";
