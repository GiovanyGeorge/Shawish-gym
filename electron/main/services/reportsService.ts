import { queryAll, queryOne } from "../database/query";
import { withPersist } from "./store";

export type ReportKind =
  | "members"
  | "subscriptions"
  | "pauses"
  | "attendance"
  | "trainers"
  | "training"
  | "store"
  | "financial";

export type ReportFilter = {
  kind: ReportKind;
  date_from: string;
  date_to: string;
  gender?: string;
  trainer_id?: number;
  status?: string;
};

export function getReport(filter: ReportFilter) {
  const from = filter.date_from;
  const to = filter.date_to;
  return withPersist((db) => {
    const summary: Record<string, number | string> = {};
    const rows: Record<string, unknown>[] = [];
    const series: { label: string; value: number }[] = [];

    if (filter.kind === "members") {
      summary.total = Number(queryOne(db, `SELECT COUNT(*) AS c FROM members`)?.c ?? 0);
      summary.new_members = Number(
        queryOne(db, `SELECT COUNT(*) AS c FROM members WHERE date(created_at) BETWEEN date(?) AND date(?)`, [
          from,
          to,
        ])?.c ?? 0,
      );
      summary.active = Number(
        queryOne(
          db,
          `SELECT COUNT(*) AS c FROM members m
           JOIN member_subscriptions ms ON ms.id = (SELECT id FROM member_subscriptions WHERE member_id = m.id ORDER BY id DESC LIMIT 1)
           WHERE m.status = 'active' AND date(ms.end_date) >= date('now')`,
        )?.c ?? 0,
      );
      summary.paused = Number(queryOne(db, `SELECT COUNT(*) AS c FROM members WHERE status = 'paused'`)?.c ?? 0);
      summary.expired = Number(
        queryOne(
          db,
          `SELECT COUNT(*) AS c FROM members m
           JOIN member_subscriptions ms ON ms.id = (SELECT id FROM member_subscriptions WHERE member_id = m.id ORDER BY id DESC LIMIT 1)
           WHERE m.status != 'paused' AND date(ms.end_date) < date('now')`,
        )?.c ?? 0,
      );
      const clauses = [`date(m.created_at) BETWEEN date(?) AND date(?)`];
      const params: (string | number)[] = [from, to];
      if (filter.gender) {
        clauses.push(`m.gender = ?`);
        params.push(filter.gender);
      }
      if (filter.trainer_id) {
        clauses.push(`m.trainer_id = ?`);
        params.push(filter.trainer_id);
      }
      rows.push(
        ...queryAll(
          db,
          `SELECT m.member_code, m.name, m.gender, m.status, m.created_at, t.name AS trainer_name
           FROM members m LEFT JOIN trainers t ON t.id = m.trainer_id
           WHERE ${clauses.join(" AND ")}
           ORDER BY m.created_at DESC`,
          params,
        ),
      );
      series.push(
        ...queryAll(
          db,
          `SELECT date(created_at) AS label, COUNT(*) AS value FROM members
           WHERE date(created_at) BETWEEN date(?) AND date(?)
           GROUP BY date(created_at) ORDER BY label`,
          [from, to],
        ).map((r) => ({ label: String(r.label), value: Number(r.value) })),
      );
    }

    if (filter.kind === "subscriptions") {
      summary.new_subscriptions = Number(
        queryOne(
          db,
          `SELECT COUNT(*) AS c FROM member_subscriptions WHERE date(created_at) BETWEEN date(?) AND date(?)`,
          [from, to],
        )?.c ?? 0,
      );
      summary.revenue = Number(
        queryOne(
          db,
          `SELECT COALESCE(SUM(price),0) AS v FROM member_subscriptions WHERE date(created_at) BETWEEN date(?) AND date(?)`,
          [from, to],
        )?.v ?? 0,
      );
      summary.active = Number(
        queryOne(
          db,
          `SELECT COUNT(*) AS c FROM member_subscriptions WHERE status = 'active' AND date(end_date) >= date('now')`,
        )?.c ?? 0,
      );
      summary.paused = Number(
        queryOne(db, `SELECT COUNT(*) AS c FROM member_subscriptions WHERE status = 'paused'`)?.c ?? 0,
      );
      summary.expired = Number(
        queryOne(db, `SELECT COUNT(*) AS c FROM member_subscriptions WHERE status = 'expired' OR date(end_date) < date('now')`)?.c ?? 0,
      );
      rows.push(
        ...queryAll(
          db,
          `SELECT ms.id, m.name, ms.duration_months, ms.start_date, ms.end_date, ms.price, ms.status, ms.created_at
           FROM member_subscriptions ms JOIN members m ON m.id = ms.member_id
           WHERE date(ms.created_at) BETWEEN date(?) AND date(?)
           ORDER BY ms.created_at DESC`,
          [from, to],
        ),
      );
      series.push(
        ...queryAll(
          db,
          `SELECT duration_months AS label, COALESCE(SUM(price),0) AS value
           FROM member_subscriptions WHERE date(created_at) BETWEEN date(?) AND date(?)
           GROUP BY duration_months ORDER BY duration_months`,
          [from, to],
        ).map((r) => ({ label: `${r.label} mo`, value: Number(r.value) })),
      );
    }

    if (filter.kind === "pauses") {
      summary.count = Number(
        queryOne(
          db,
          `SELECT COUNT(*) AS c FROM subscription_pauses WHERE date(created_at) BETWEEN date(?) AND date(?)`,
          [from, to],
        )?.c ?? 0,
      );
      summary.total_days = Number(
        queryOne(
          db,
          `SELECT COALESCE(SUM(COALESCE(actual_pause_days, pause_days)),0) AS v
           FROM subscription_pauses WHERE date(created_at) BETWEEN date(?) AND date(?)`,
          [from, to],
        )?.v ?? 0,
      );
      rows.push(
        ...queryAll(
          db,
          `SELECT p.id, m.name, p.start_date, p.end_date, p.pause_days, p.actual_pause_days, p.reason, p.created_at
           FROM subscription_pauses p
           JOIN member_subscriptions ms ON ms.id = p.member_subscription_id
           JOIN members m ON m.id = ms.member_id
           WHERE date(p.created_at) BETWEEN date(?) AND date(?)
           ORDER BY p.created_at DESC`,
          [from, to],
        ),
      );
      series.push(
        ...queryAll(
          db,
          `SELECT COALESCE(NULLIF(reason,''), 'Unspecified') AS label, COUNT(*) AS value
           FROM subscription_pauses WHERE date(created_at) BETWEEN date(?) AND date(?)
           GROUP BY label ORDER BY value DESC`,
          [from, to],
        ).map((r) => ({ label: String(r.label), value: Number(r.value) })),
      );
    }

    if (filter.kind === "attendance") {
      summary.present = Number(
        queryOne(
          db,
          `SELECT COUNT(*) AS c FROM attendance WHERE status = 'present' AND date(attendance_date) BETWEEN date(?) AND date(?)`,
          [from, to],
        )?.c ?? 0,
      );
      summary.absent = Number(
        queryOne(
          db,
          `SELECT COUNT(*) AS c FROM attendance WHERE status = 'absent' AND date(attendance_date) BETWEEN date(?) AND date(?)`,
          [from, to],
        )?.c ?? 0,
      );
      const total = Number(summary.present) + Number(summary.absent);
      summary.rate = total ? Math.round((Number(summary.present) / total) * 100) : 0;
      series.push(
        ...queryAll(
          db,
          `SELECT attendance_date AS label,
            SUM(CASE WHEN status='present' THEN 1 ELSE 0 END) AS value
           FROM attendance WHERE date(attendance_date) BETWEEN date(?) AND date(?)
           GROUP BY attendance_date ORDER BY attendance_date`,
          [from, to],
        ).map((r) => ({ label: String(r.label), value: Number(r.value) })),
      );
      rows.push(
        ...queryAll(
          db,
          `SELECT a.attendance_date, m.name, a.status, a.check_in_time
           FROM attendance a JOIN members m ON m.id = a.member_id
           WHERE date(a.attendance_date) BETWEEN date(?) AND date(?)
           ORDER BY a.attendance_date DESC`,
          [from, to],
        ),
      );
    }

    if (filter.kind === "trainers") {
      rows.push(
        ...queryAll(
          db,
          `SELECT t.name, t.status,
            (SELECT COUNT(*) FROM members WHERE trainer_id = t.id) AS assigned_members,
            (SELECT COUNT(*) FROM members WHERE trainer_id = t.id AND status = 'active') AS active_members,
            (SELECT COUNT(*) FROM workout_sessions ws
              JOIN members m ON m.id = ws.member_id
              WHERE m.trainer_id = t.id AND ws.status = 'completed'
                AND date(ws.session_date) BETWEEN date(?) AND date(?)) AS completed_workouts
           FROM trainers t
           ORDER BY t.name COLLATE NOCASE`,
          [from, to],
        ),
      );
    }

    if (filter.kind === "training") {
      summary.completed = Number(
        queryOne(
          db,
          `SELECT COUNT(*) AS c FROM workout_sessions WHERE status = 'completed' AND date(session_date) BETWEEN date(?) AND date(?)`,
          [from, to],
        )?.c ?? 0,
      );
      summary.cancelled = Number(
        queryOne(
          db,
          `SELECT COUNT(*) AS c FROM workout_sessions WHERE status = 'cancelled' AND date(session_date) BETWEEN date(?) AND date(?)`,
          [from, to],
        )?.c ?? 0,
      );
      summary.scheduled = Number(
        queryOne(
          db,
          `SELECT COUNT(*) AS c FROM workout_sessions WHERE status IN ('scheduled','in_progress') AND date(session_date) BETWEEN date(?) AND date(?)`,
          [from, to],
        )?.c ?? 0,
      );
      const done = Number(summary.completed) + Number(summary.cancelled);
      summary.completion_rate = done ? Math.round((Number(summary.completed) / done) * 100) : 0;
      rows.push(
        ...queryAll(
          db,
          `SELECT ws.session_date, m.name AS member_name, t.name AS trainer_name, ws.status
           FROM workout_sessions ws
           JOIN members m ON m.id = ws.member_id
           LEFT JOIN trainers t ON t.id = ws.trainer_id
           WHERE date(ws.session_date) BETWEEN date(?) AND date(?)
           ORDER BY ws.session_date DESC`,
          [from, to],
        ),
      );
    }

    if (filter.kind === "store") {
      summary.sales = Number(
        queryOne(
          db,
          `SELECT COALESCE(SUM(total),0) AS v FROM sales WHERE status = 'completed' AND date(sold_at) BETWEEN date(?) AND date(?)`,
          [from, to],
        )?.v ?? 0,
      );
      summary.cost = Number(
        queryOne(
          db,
          `SELECT COALESCE(SUM(si.unit_cost * si.quantity),0) AS v
           FROM sale_items si JOIN sales s ON s.id = si.sale_id
           WHERE s.status = 'completed' AND date(s.sold_at) BETWEEN date(?) AND date(?)`,
          [from, to],
        )?.v ?? 0,
      );
      summary.profit = Number(summary.sales) - Number(summary.cost);
      summary.inventory_value = Number(
        queryOne(
          db,
          `SELECT COALESCE(SUM(quantity * COALESCE(purchase_price,0)),0) AS v FROM products WHERE is_archived = 0`,
        )?.v ?? 0,
      );
      rows.push(
        ...queryAll(
          db,
          `SELECT COALESCE(si.product_name, p.name) AS product, SUM(si.quantity) AS qty, SUM(si.line_total) AS revenue
           FROM sale_items si
           JOIN sales s ON s.id = si.sale_id
           LEFT JOIN products p ON p.id = si.product_id
           WHERE s.status = 'completed' AND date(s.sold_at) BETWEEN date(?) AND date(?)
           GROUP BY COALESCE(si.product_name, p.name)
           ORDER BY revenue DESC
           LIMIT 20`,
          [from, to],
        ),
      );
      series.push(
        ...queryAll(
          db,
          `SELECT date(sold_at) AS label, COALESCE(SUM(total),0) AS value
           FROM sales WHERE status = 'completed' AND date(sold_at) BETWEEN date(?) AND date(?)
           GROUP BY date(sold_at) ORDER BY label`,
          [from, to],
        ).map((r) => ({ label: String(r.label), value: Number(r.value) })),
      );
    }

    if (filter.kind === "financial") {
      const subRevenue = Number(
        queryOne(
          db,
          `SELECT COALESCE(SUM(price),0) AS v FROM member_subscriptions WHERE date(created_at) BETWEEN date(?) AND date(?)`,
          [from, to],
        )?.v ?? 0,
      );
      const storeRevenue = Number(
        queryOne(
          db,
          `SELECT COALESCE(SUM(total),0) AS v FROM sales WHERE status = 'completed' AND date(sold_at) BETWEEN date(?) AND date(?)`,
          [from, to],
        )?.v ?? 0,
      );
      const storeCost = Number(
        queryOne(
          db,
          `SELECT COALESCE(SUM(si.unit_cost * si.quantity),0) AS v
           FROM sale_items si JOIN sales s ON s.id = si.sale_id
           WHERE s.status = 'completed' AND date(s.sold_at) BETWEEN date(?) AND date(?)`,
          [from, to],
        )?.v ?? 0,
      );
      summary.subscription_revenue = subRevenue;
      summary.store_revenue = storeRevenue;
      summary.revenue = subRevenue + storeRevenue;
      summary.cost = storeCost;
      summary.profit = subRevenue + storeRevenue - storeCost;
      series.push(
        { label: "Subscriptions", value: subRevenue },
        { label: "Store", value: storeRevenue },
        { label: "Product cost", value: storeCost },
      );
    }

    return { kind: filter.kind, date_from: from, date_to: to, summary, rows, series };
  });
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

export function getAnalyticsDashboard(dateFrom: string, dateTo: string): AnalyticsDashboard {
  const from = dateFrom;
  const to = dateTo;
  return withPersist((db) => {
    const spanDays = Math.max(
      1,
      Number(
        queryOne(db, `SELECT CAST(julianday(?) - julianday(?) AS INTEGER) AS d`, [to, from])?.d ?? 0,
      ) + 1,
    );
    const prevTo = String(
      queryOne(db, `SELECT date(?, '-' || ? || ' days') AS d`, [from, 1])?.d ?? from,
    );
    const prevFrom = String(
      queryOne(db, `SELECT date(?, '-' || ? || ' days') AS d`, [prevTo, spanDays - 1])?.d ?? from,
    );

    const subRevenue = Number(
      queryOne(
        db,
        `SELECT COALESCE(SUM(price),0) AS v FROM member_subscriptions WHERE date(created_at) BETWEEN date(?) AND date(?)`,
        [from, to],
      )?.v ?? 0,
    );
    const storeRevenue = Number(
      queryOne(
        db,
        `SELECT COALESCE(SUM(total),0) AS v FROM sales WHERE status = 'completed' AND date(sold_at) BETWEEN date(?) AND date(?)`,
        [from, to],
      )?.v ?? 0,
    );
    const storeCost = Number(
      queryOne(
        db,
        `SELECT COALESCE(SUM(si.unit_cost * si.quantity),0) AS v
         FROM sale_items si JOIN sales s ON s.id = si.sale_id
         WHERE s.status = 'completed' AND date(s.sold_at) BETWEEN date(?) AND date(?)`,
        [from, to],
      )?.v ?? 0,
    );
    const newMembers = Number(
      queryOne(db, `SELECT COUNT(*) AS c FROM members WHERE date(created_at) BETWEEN date(?) AND date(?)`, [
        from,
        to,
      ])?.c ?? 0,
    );
    const prevNewMembers = Number(
      queryOne(db, `SELECT COUNT(*) AS c FROM members WHERE date(created_at) BETWEEN date(?) AND date(?)`, [
        prevFrom,
        prevTo,
      ])?.c ?? 0,
    );
    const present = Number(
      queryOne(
        db,
        `SELECT COUNT(*) AS c FROM attendance WHERE status = 'present' AND date(attendance_date) BETWEEN date(?) AND date(?)`,
        [from, to],
      )?.c ?? 0,
    );
    const absent = Number(
      queryOne(
        db,
        `SELECT COUNT(*) AS c FROM attendance WHERE status = 'absent' AND date(attendance_date) BETWEEN date(?) AND date(?)`,
        [from, to],
      )?.c ?? 0,
    );
    const attTotal = present + absent;

    const subByDay = new Map(
      queryAll(
        db,
        `SELECT date(created_at) AS label, COALESCE(SUM(price),0) AS value
         FROM member_subscriptions WHERE date(created_at) BETWEEN date(?) AND date(?)
         GROUP BY date(created_at)`,
        [from, to],
      ).map((r) => [String(r.label), Number(r.value)]),
    );
    const storeByDay = new Map(
      queryAll(
        db,
        `SELECT date(sold_at) AS label, COALESCE(SUM(total),0) AS value
         FROM sales WHERE status = 'completed' AND date(sold_at) BETWEEN date(?) AND date(?)
         GROUP BY date(sold_at)`,
        [from, to],
      ).map((r) => [String(r.label), Number(r.value)]),
    );

    const dayLabels = [
      ...new Set([...subByDay.keys(), ...storeByDay.keys()]),
    ].sort();
    const revenue_series = dayLabels.map((label) => {
      const subscriptions = subByDay.get(label) ?? 0;
      const store = storeByDay.get(label) ?? 0;
      return { label, subscriptions, store, total: subscriptions + store };
    });

    const attendance_series = queryAll(
      db,
      `SELECT attendance_date AS label,
        SUM(CASE WHEN status='present' THEN 1 ELSE 0 END) AS present,
        SUM(CASE WHEN status='absent' THEN 1 ELSE 0 END) AS absent,
        SUM(CASE WHEN status='paused' THEN 1 ELSE 0 END) AS paused
       FROM attendance WHERE date(attendance_date) BETWEEN date(?) AND date(?)
       GROUP BY attendance_date ORDER BY attendance_date`,
      [from, to],
    ).map((r) => ({
      label: String(r.label),
      present: Number(r.present),
      absent: Number(r.absent),
      paused: Number(r.paused),
    }));

    return {
      date_from: from,
      date_to: to,
      kpis: {
        total_revenue: subRevenue + storeRevenue,
        new_members: newMembers,
        active_members: Number(
          queryOne(
            db,
            `SELECT COUNT(*) AS c FROM members m
             JOIN member_subscriptions ms ON ms.id = (SELECT id FROM member_subscriptions WHERE member_id = m.id ORDER BY id DESC LIMIT 1)
             WHERE m.status = 'active' AND date(ms.end_date) >= date('now')`,
          )?.c ?? 0,
        ),
        renewals: Number(
          queryOne(
            db,
            `SELECT COUNT(*) AS c FROM member_subscriptions ms
             WHERE date(ms.created_at) BETWEEN date(?) AND date(?)
               AND EXISTS (SELECT 1 FROM member_subscriptions prev WHERE prev.member_id = ms.member_id AND prev.id < ms.id)`,
            [from, to],
          )?.c ?? 0,
        ),
        attendance_rate: attTotal ? Math.round((present / attTotal) * 100) : 0,
        profit: subRevenue + storeRevenue - storeCost,
        previous_new_members: prevNewMembers,
      },
      revenue_series,
      members_overview: {
        new_members: newMembers,
        active: Number(
          queryOne(
            db,
            `SELECT COUNT(*) AS c FROM members m
             JOIN member_subscriptions ms ON ms.id = (SELECT id FROM member_subscriptions WHERE member_id = m.id ORDER BY id DESC LIMIT 1)
             WHERE m.status = 'active' AND date(ms.end_date) >= date('now')`,
          )?.c ?? 0,
        ),
        expired: Number(
          queryOne(
            db,
            `SELECT COUNT(*) AS c FROM members m
             JOIN member_subscriptions ms ON ms.id = (SELECT id FROM member_subscriptions WHERE member_id = m.id ORDER BY id DESC LIMIT 1)
             WHERE m.status != 'paused' AND date(ms.end_date) < date('now')`,
          )?.c ?? 0,
        ),
        paused: Number(queryOne(db, `SELECT COUNT(*) AS c FROM members WHERE status = 'paused'`)?.c ?? 0),
      },
      subscriptions: {
        new_subscriptions: Number(
          queryOne(
            db,
            `SELECT COUNT(*) AS c FROM member_subscriptions WHERE date(created_at) BETWEEN date(?) AND date(?)`,
            [from, to],
          )?.c ?? 0,
        ),
        renewals: Number(
          queryOne(
            db,
            `SELECT COUNT(*) AS c FROM member_subscriptions ms
             WHERE date(ms.created_at) BETWEEN date(?) AND date(?)
               AND EXISTS (SELECT 1 FROM member_subscriptions prev WHERE prev.member_id = ms.member_id AND prev.id < ms.id)`,
            [from, to],
          )?.c ?? 0,
        ),
        pauses: Number(
          queryOne(
            db,
            `SELECT COUNT(*) AS c FROM subscription_pauses WHERE date(created_at) BETWEEN date(?) AND date(?)`,
            [from, to],
          )?.c ?? 0,
        ),
        expirations: Number(
          queryOne(
            db,
            `SELECT COUNT(*) AS c FROM member_subscriptions
             WHERE date(end_date) BETWEEN date(?) AND date(?)`,
            [from, to],
          )?.c ?? 0,
        ),
      },
      attendance_series,
      store: {
        sales: storeRevenue,
        profit: storeRevenue - storeCost,
        top_products: queryAll(
          db,
          `SELECT COALESCE(si.product_name, p.name) AS name, SUM(si.quantity) AS qty, SUM(si.line_total) AS revenue
           FROM sale_items si
           JOIN sales s ON s.id = si.sale_id
           LEFT JOIN products p ON p.id = si.product_id
           WHERE s.status = 'completed' AND date(s.sold_at) BETWEEN date(?) AND date(?)
           GROUP BY COALESCE(si.product_name, p.name)
           ORDER BY revenue DESC
           LIMIT 8`,
          [from, to],
        ).map((r) => ({
          name: String(r.name),
          qty: Number(r.qty),
          revenue: Number(r.revenue),
        })),
        low_stock: queryAll(
          db,
          `SELECT id, name, quantity, minimum_stock FROM products
           WHERE is_archived = 0 AND quantity <= minimum_stock
           ORDER BY quantity ASC, name LIMIT 8`,
        ).map((r) => ({
          id: Number(r.id),
          name: String(r.name),
          quantity: Number(r.quantity),
          minimum_stock: Number(r.minimum_stock),
        })),
      },
      trainers: queryAll(
        db,
        `SELECT t.name,
          (SELECT COUNT(*) FROM members WHERE trainer_id = t.id AND status = 'active') AS members,
          (SELECT COUNT(*) FROM workout_sessions ws
            WHERE ws.trainer_id = t.id AND date(ws.session_date) BETWEEN date(?) AND date(?)) AS sessions,
          (SELECT COUNT(*) FROM workout_sessions ws
            WHERE ws.trainer_id = t.id AND ws.status = 'completed' AND date(ws.session_date) BETWEEN date(?) AND date(?)) AS completed
         FROM trainers t
         WHERE t.status = 'active'
         ORDER BY t.name COLLATE NOCASE`,
        [from, to, from, to],
      ).map((r) => {
        const sessions = Number(r.sessions);
        const completed = Number(r.completed);
        return {
          name: String(r.name),
          members: Number(r.members),
          sessions,
          completion_rate: sessions ? Math.round((completed / sessions) * 100) : 0,
        };
      }),
    };
  });
}
