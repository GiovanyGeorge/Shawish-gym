import { queryAll, queryOne } from "../database/query";
import { countProductsByStockStatus, listLowStockProducts } from "./productsService";
import { getTodayStoreStats } from "./salesService";
import { getTodayTrainingSummary } from "./trainingService";
import { withPersist } from "./store";

export type DashboardStats = {
  total_members: number;
  active_subscriptions: number;
  active_trainers: number;
  workout_programs: number;
  exercises: number;
  today_attendance_present: number;
  today_attendance_total: number;
  today_training_total: number;
  today_training_pending: number;
  today_training_in_progress: number;
  today_training_completed: number;
  members_this_month: number;
  store_today_sales: number;
  store_yesterday_sales: number;
  store_today_profit: number;
  store_low_stock: number;
  store_out_of_stock: number;
  store_low_stock_products: {
    id: number;
    name: string;
    quantity: number;
    minimum_stock: number;
  }[];
  expiring_soon: number;
};

export function getDashboardStats(): DashboardStats {
  const training = getTodayTrainingSummary();
  const storeToday = getTodayStoreStats();
  const stockCounts = countProductsByStockStatus();
  const lowStockProducts = listLowStockProducts(6).map((p) => ({
    id: p.id,
    name: p.name,
    quantity: p.quantity,
    minimum_stock: p.minimum_stock,
  }));
  return withPersist((db) => {
    const totalMembers = Number(queryOne(db, `SELECT COUNT(*) AS c FROM members`)?.c ?? 0);
    const activeSubscriptions = Number(
      queryOne(
        db,
        `SELECT COUNT(*) AS c FROM member_subscriptions WHERE status = 'active' AND date(end_date) >= date('now')`,
      )?.c ?? 0,
    );
    const activeTrainers = Number(
      queryOne(db, `SELECT COUNT(*) AS c FROM trainers WHERE status = 'active'`)?.c ?? 0,
    );
    const programs = Number(
      queryOne(db, `SELECT COUNT(*) AS c FROM workout_programs WHERE is_archived = 0`)?.c ?? 0,
    );
    const exercises = Number(
      queryOne(db, `SELECT COUNT(*) AS c FROM exercises WHERE is_archived = 0`)?.c ?? 0,
    );

    const today = new Date();
    const todayIso = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    const membersThisMonth = Number(
      queryOne(
        db,
        `SELECT COUNT(*) AS c FROM members WHERE strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')`,
      )?.c ?? 0,
    );
    const yesterdaySales = Number(
      queryOne(
        db,
        `SELECT COALESCE(SUM(total), 0) AS v FROM sales
         WHERE status = 'completed' AND date(sold_at) = date('now', '-1 day')`,
      )?.v ?? 0,
    );
    const presentRow = queryOne(
      db,
      `SELECT COUNT(*) AS c FROM attendance WHERE attendance_date = ? AND status = 'present'`,
      [todayIso],
    );
    const totalActiveRow = queryOne(
      db,
      `SELECT COUNT(*) AS c FROM members WHERE status IN ('active', 'paused')`,
    );

    return {
      total_members: totalMembers,
      active_subscriptions: activeSubscriptions,
      active_trainers: activeTrainers,
      workout_programs: programs,
      exercises,
      today_attendance_present: Number(presentRow?.c ?? 0),
      today_attendance_total: Number(totalActiveRow?.c ?? 0),
      today_training_total: training.total,
      today_training_pending: training.pending,
      today_training_in_progress: training.in_progress,
      today_training_completed: training.completed,
      members_this_month: membersThisMonth,
      store_today_sales: storeToday.sales_total,
      store_yesterday_sales: yesterdaySales,
      store_today_profit: storeToday.profit_total,
      store_low_stock: stockCounts.low,
      store_out_of_stock: stockCounts.out,
      store_low_stock_products: lowStockProducts,
      expiring_soon: Number(
        queryOne(
          db,
          `SELECT COUNT(*) AS c FROM members m
           JOIN member_subscriptions ms ON ms.id = (
             SELECT id FROM member_subscriptions WHERE member_id = m.id ORDER BY start_date DESC, id DESC LIMIT 1
           )
           WHERE m.status = 'active'
             AND date(ms.end_date) >= date('now')
             AND date(ms.end_date) <= date('now', '+7 days')`,
        )?.c ?? 0,
      ),
    };
  });
}
