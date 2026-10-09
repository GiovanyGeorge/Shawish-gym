import { ipcInvoke } from "@/services/ipc";

export type ReportKind =
  | "members"
  | "subscriptions"
  | "pauses"
  | "attendance"
  | "trainers"
  | "training"
  | "store"
  | "financial";

export type ReportResult = {
  kind: ReportKind;
  date_from: string;
  date_to: string;
  summary: Record<string, number | string>;
  rows: Record<string, unknown>[];
  series: { label: string; value: number }[];
};

export function fetchReport(input: {
  kind: ReportKind;
  date_from: string;
  date_to: string;
  gender?: string;
  trainer_id?: number;
  status?: string;
}) {
  return ipcInvoke<ReportResult>("reports:get", input);
}

export type AnalyticsDashboard = {
  date_from: string;
  date_to: string;
  kpis: {
    total_revenue: number;
    new_members: number;
    active_members: number;
    renewals: number;
    attendance_rate: number;
    profit: number;
    previous_new_members: number;
  };
  revenue_series: { label: string; subscriptions: number; store: number; total: number }[];
  members_overview: { new_members: number; active: number; expired: number; paused: number };
  subscriptions: { new_subscriptions: number; renewals: number; pauses: number; expirations: number };
  attendance_series: { label: string; present: number; absent: number; paused: number }[];
  store: {
    sales: number;
    profit: number;
    top_products: { name: string; qty: number; revenue: number }[];
    low_stock: { id: number; name: string; quantity: number; minimum_stock: number }[];
  };
  trainers: { name: string; members: number; sessions: number; completion_rate: number }[];
};

export function fetchAnalytics(date_from: string, date_to: string) {
  return ipcInvoke<AnalyticsDashboard>("reports:analytics", { date_from, date_to });
}
