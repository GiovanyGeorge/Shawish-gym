import { useEffect, useState } from "react";
import {
  CalendarCheck,
  Play,
  RefreshCw,
  ShoppingCart,
  UserPlus,
  Users,
  Wallet,
} from "lucide-react";
import { Link } from "react-router-dom";
import gymBanner from "@/assets/dashboard/gym-dashboard.jpg";
import { EmptyState } from "@/components/common/EmptyState";
import { StatCard } from "@/components/common/StatCard";
import { StatusBadge } from "@/components/common/StatusBadge";
import { fetchDashboardStats } from "@/services/dashboardApi";
import { fetchMembers } from "@/services/membersApi";
import { fetchNotifications, type NotificationRow } from "@/services/notificationsApi";
import { fetchTodayTraining } from "@/services/trainingApi";
import { MemberAvatar } from "@/components/members/MemberAvatar";
import { useAppSettingsStore } from "@/stores/appSettingsStore";
import type { DashboardStats, MemberListItem } from "@/types/domain";
import type { TodayTrainingRow } from "@/types/training";
import { formatMoney } from "@/utils/money";

export function HomePage() {
  const gymName = useAppSettingsStore((s) => s.settings?.gym_name ?? "SHAWISH");
  const currency = useAppSettingsStore((s) => s.settings?.currency ?? "EGP");
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [expiring, setExpiring] = useState<MemberListItem[]>([]);
  const [notes, setNotes] = useState<NotificationRow[]>([]);
  const [training, setTraining] = useState<TodayTrainingRow[]>([]);

  useEffect(() => {
    void fetchDashboardStats()
      .then(setStats)
      .catch(() => setStats(null));
    void fetchMembers("expiring")
      .then(setExpiring)
      .catch(() => setExpiring([]));
    void fetchNotifications("all")
      .then((rows) => setNotes(rows.slice(0, 6)))
      .catch(() => setNotes([]));
    void fetchTodayTraining()
      .then((rows) => setTraining(rows.slice(0, 8)))
      .catch(() => setTraining([]));
  }, []);

  const attendancePct =
    stats && stats.today_attendance_total
      ? Math.round((stats.today_attendance_present / stats.today_attendance_total) * 100)
      : 0;
  const yesterday = stats?.store_yesterday_sales ?? 0;
  const todayRev = stats?.store_today_sales ?? 0;
  const vsYesterday =
    yesterday > 0 ? `${todayRev >= yesterday ? "+" : ""}${Math.round(((todayRev - yesterday) / yesterday) * 100)}% vs yesterday` : "vs yesterday";

  return (
    <div>
      <section className="relative mb-5 overflow-hidden rounded-shawish-lg border border-shawish-border">
        <img src={gymBanner} alt="" className="h-28 w-full object-cover sm:h-32" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-black/15" />
        <div className="absolute inset-0 flex flex-col justify-end p-5">
          <p className="text-[10px] font-semibold uppercase tracking-[0.28em] text-shawish-orange">
            Gym · Strength · Workout
          </p>
          <h2 className="mt-1 text-xl font-semibold tracking-tight sm:text-2xl">
            STRONGER TODAY. BETTER TOMORROW.
          </h2>
        </div>
      </section>

      <section className="mb-5 flex flex-wrap gap-2">
        <QuickLink to="/members/new" icon={UserPlus} label="Add Member" />
        <QuickLink to="/members" icon={RefreshCw} label="Renew Subscription" />
        <QuickLink to="/private-training" icon={Play} label="Start Training" />
        <QuickLink to="/store/sales/new" icon={ShoppingCart} label="New Sale" />
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Members"
          value={stats?.total_members ?? "—"}
          icon={Users}
          hint={stats ? `+${stats.members_this_month} this month` : undefined}
          accent="orange"
        />
        <StatCard
          label="Active Subscriptions"
          value={stats?.active_subscriptions ?? "—"}
          icon={Users}
          hint={stats ? `${stats.expiring_soon} expiring soon` : undefined}
          accent="yellow"
        />
        <StatCard
          label="Today's Attendance"
          value={stats ? `${attendancePct}%` : "—"}
          icon={CalendarCheck}
          hint={
            stats
              ? `${stats.today_attendance_present} / ${stats.today_attendance_total} members`
              : undefined
          }
          accent="green"
        />
        <StatCard
          label="Today's Revenue"
          value={stats ? formatMoney(todayRev, currency) : "—"}
          icon={Wallet}
          hint={vsYesterday}
          accent="neutral"
        />
      </section>

      <section className="mt-5 grid gap-4 xl:grid-cols-2">
        <article className="rounded-shawish-lg border border-shawish-border bg-shawish-surface p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold">Today's Training</h3>
            <Link to="/private-training" className="text-xs text-shawish-orange hover:underline">
              Open
            </Link>
          </div>
          {training.length === 0 ? (
            <EmptyState title="No sessions scheduled today." />
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="text-left text-[11px] uppercase tracking-wide text-shawish-muted">
                  <tr>
                    <th className="pb-2 pr-3">Member</th>
                    <th className="pb-2 pr-3">Trainer</th>
                    <th className="pb-2 pr-3">Workout</th>
                    <th className="pb-2">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {training.map((row) => (
                    <tr key={`${row.member_id}-${row.program_day_id}`} className="border-t border-shawish-border/70">
                      <td className="py-2 pr-3">
                        <div className="flex items-center gap-2">
                          <MemberAvatar name={row.member_name} photoPath={row.photo_path} size="sm" />
                          <span>{row.member_name}</span>
                        </div>
                      </td>
                      <td className="py-2 pr-3 text-shawish-muted">{row.trainer_name ?? "—"}</td>
                      <td className="py-2 pr-3">{row.program_day_name}</td>
                      <td className="py-2 capitalize">{row.display_status.replace(/_/g, " ")}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </article>

        <article className="rounded-shawish-lg border border-shawish-border bg-shawish-surface p-4">
          <h3 className="mb-3 text-sm font-semibold">Alerts</h3>
          <div className="space-y-3">
            {expiring.slice(0, 4).map((member) => (
              <div key={member.id} className="flex items-center justify-between gap-2 text-sm">
                <div className="flex min-w-0 items-center gap-2">
                  <MemberAvatar name={member.name} photoPath={member.photo_path} size="sm" />
                  <span className="truncate">{member.name}</span>
                </div>
                <StatusBadge variant="warning">Expiring</StatusBadge>
              </div>
            ))}
            {stats?.store_low_stock_products.slice(0, 3).map((product) => (
              <div key={product.id} className="flex items-center justify-between text-sm">
                <span>{product.name}</span>
                <span className="text-red-400">{product.quantity} left</span>
              </div>
            ))}
            {notes.slice(0, 3).map((n) => (
              <p key={n.id} className="text-sm text-shawish-muted">
                {n.title}
              </p>
            ))}
            {!expiring.length && !stats?.store_low_stock_products.length && !notes.length ? (
              <EmptyState title={`No alerts for ${gymName}.`} />
            ) : null}
          </div>
        </article>
      </section>
    </div>
  );
}

function QuickLink({
  to,
  icon: Icon,
  label,
}: {
  to: string;
  icon: typeof UserPlus;
  label: string;
}) {
  return (
    <Link
      to={to}
      className="inline-flex items-center gap-2 rounded-shawish border border-shawish-border bg-shawish-surface px-3 py-1.5 text-sm hover:border-shawish-orange/40"
    >
      <Icon className="size-4 text-shawish-orange" />
      {label}
    </Link>
  );
}
