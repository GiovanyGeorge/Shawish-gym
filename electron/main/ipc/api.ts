import { BrowserWindow, ipcMain } from "electron";
import type { DataPaths } from "../database/paths";
import * as attendance from "../services/attendanceService";
import { replaceMemberPhoto } from "../services/memberPhotoService";
import { replaceProfilePhoto } from "../services/profilePhotoService";
import * as dashboard from "../services/dashboardService";
import * as exercises from "../services/exercisesService";
import * as memberGoals from "../services/memberGoalsService";
import * as memberProfile from "../services/memberProfileService";
import * as memberSubscription from "../services/memberSubscriptionService";
import * as members from "../services/membersService";
import * as programs from "../services/workoutProgramsService";
import * as prices from "../services/subscriptionPricesService";
import * as trainers from "../services/trainersService";
import * as training from "../services/trainingService";
import * as productCategories from "../services/productCategoriesService";
import * as products from "../services/productsService";
import * as inventory from "../services/inventoryService";
import * as sales from "../services/salesService";
import * as notifications from "../services/notificationsService";
import * as backup from "../services/backupService";
import * as reports from "../services/reportsService";
import * as appSettings from "../services/settingsService";

type Handler = (_event: Electron.IpcMainInvokeEvent, payload: unknown) => unknown;

function buildHandlers(getPaths: () => DataPaths): Record<string, Handler> {
  return {
  "dashboard:stats": () => {
    notifications.scanOperationalAlerts();
    return dashboard.getDashboardStats();
  },

  "trainers:list": (_e, p) => trainers.listTrainers(Boolean((p as { activeOnly?: boolean })?.activeOnly)),
  "trainers:listForMember": (_e, p) =>
    trainers.listTrainersForMember((p as { gender: "male" | "female" }).gender),
  "trainers:create": (_e, p) => trainers.createTrainer(p as trainers.CreateTrainerInput),
  "trainers:update": (_e, p) => {
    const input = p as trainers.UpdateTrainerInput;
    const before = trainers.listTrainers().find((t) => t.id === input.id);
    const updated = trainers.updateTrainer(input);
    if (before) {
      replaceProfilePhoto(getPaths(), before.photo_path, updated.photo_path);
    }
    return updated;
  },
  "trainers:setStatus": (_e, p) => {
    const { id, status } = p as { id: number; status: "active" | "inactive" };
    return trainers.updateTrainerStatus(id, status);
  },

  "exercises:list": (_e, p) => exercises.listExercises((p as exercises.ListExercisesFilter) ?? {}),
  "exercises:count": (_e, p) => exercises.countExercises((p as exercises.ListExercisesFilter) ?? {}),
  "exercises:filterOptions": () => exercises.listExerciseFilterOptions(),
  "exercises:picker": () => exercises.listActiveExercisesForPicker(),
  "exercises:create": (_e, p) => exercises.createExercise(p as exercises.CreateExerciseInput),
  "exercises:update": (_e, p) => exercises.updateExercise(p as exercises.UpdateExerciseInput),
  "exercises:archive": (_e, p) => exercises.archiveExercise((p as { id: number }).id),

  "programs:list": (_e, p) =>
    programs.listWorkoutPrograms(Boolean((p as { includeArchived?: boolean })?.includeArchived)),
  "programs:get": (_e, p) => programs.getWorkoutProgram((p as { id: number }).id),
  "programs:create": (_e, p) => programs.createWorkoutProgram(p as programs.SaveProgramInput),
  "programs:update": (_e, p) => {
    const { id, ...input } = p as { id: number } & programs.SaveProgramInput;
    return programs.updateWorkoutProgram(id, input);
  },
  "programs:archive": (_e, p) => programs.archiveWorkoutProgram((p as { id: number }).id),

  "prices:list": () => prices.listSubscriptionPrices(),
  "prices:listAll": () => prices.listAllSubscriptionPrices(),
  "prices:create": (_e, p) => {
    const { duration_months, price } = p as { duration_months: number; price: number };
    return prices.createSubscriptionPrice(duration_months, price);
  },
  "prices:update": (_e, p) => {
    const { duration_months, price } = p as { duration_months: number; price: number };
    return prices.updateSubscriptionPrice(duration_months, price);
  },
  "prices:setActive": (_e, p) => {
    const { duration_months, is_active } = p as { duration_months: number; is_active: boolean };
    return prices.setSubscriptionPriceActive(duration_months, is_active);
  },

  "members:list": (_e, p) =>
    members.listMembers(((p as { filter?: members.MemberListItem["display_status"] | "all" })?.filter) ?? "all"),
  "members:create": (_e, p) => members.createMember(p as members.CreateMemberInput),
  "members:getForEdit": (_e, p) => members.getMemberForEdit((p as { id: number }).id),
  "members:update": (_e, p) => {
    const input = p as members.UpdateMemberInput;
    const before = members.getMemberForEdit(input.id);
    const updated = members.updateMember(input);
    if (before) {
      replaceMemberPhoto(getPaths(), before.photo_path, updated.photo_path);
    }
    return updated;
  },
  "members:get": (_e, p) => memberProfile.getMemberProfile((p as { id: number }).id),
  "members:subscriptionHistory": (_e, p) =>
    memberProfile.listSubscriptionHistory((p as { member_id: number }).member_id),
  "members:pauseHistory": (_e, p) =>
    memberProfile.listPauseHistory((p as { member_id: number }).member_id),
  "members:goals": (_e, p) => memberProfile.listMemberGoals((p as { member_id: number }).member_id),
  "members:addGoal": (_e, p) => {
    const payload = p as memberGoals.AddMemberGoalInput & { title?: string };
    if (payload.goal) return memberGoals.addMemberGoal(payload);
    if (payload.title) return memberGoals.addMemberGoalLegacy({ member_id: payload.member_id, title: payload.title, notes: payload.notes });
    throw new Error("Goal text is required.");
  },
  "members:updateGoal": (_e, p) => memberGoals.updateMemberGoal(p as memberGoals.UpdateMemberGoalInput),
  "members:deleteGoal": (_e, p) => {
    memberGoals.deleteMemberGoal((p as { id: number }).id);
    return { ok: true };
  },
  "members:setGoalStatus": (_e, p) => {
    const { goal_id, status } = p as {
      goal_id: number;
      status: "active" | "completed" | "archived";
    };
    memberGoals.setMemberGoalStatus(goal_id, status);
    return { ok: true };
  },
  "members:renew": (_e, p) => {
    memberSubscription.renewSubscription(p as memberSubscription.RenewSubscriptionInput);
    return { ok: true };
  },
  "members:pause": (_e, p) => {
    memberSubscription.pauseSubscription(p as memberSubscription.PauseSubscriptionInput);
    return { ok: true };
  },
  "members:resume": (_e, p) => {
    memberSubscription.resumeMember(p as { member_id: number });
    return { ok: true };
  },
  "members:attendanceHistory": (_e, p) =>
    attendance.listMemberAttendance((p as { member_id: number }).member_id),

  "attendance:daily": (_e, p) => {
    const { date, search } = p as { date: string; search?: string };
    return attendance.listDailyAttendance(date, search);
  },
  "attendance:set": (_e, p) => {
    attendance.setAttendance(p as Parameters<typeof attendance.setAttendance>[0]);
    return { ok: true };
  },

  "training:today": (_e, p) =>
    training.listTodayTraining((p as Parameters<typeof training.listTodayTraining>[0]) ?? {}),
  "training:todaySummary": (_e, p) => {
    const { date } = (p ?? {}) as { date?: string };
    return training.getTodayTrainingSummary(date);
  },
  "training:startSession": (_e, p) =>
    training.startWorkoutSession(p as { member_id: number; scheduled_date?: string }),
  "training:getSession": (_e, p) =>
    training.getWorkoutSession((p as { id: number }).id),
  "training:updateSet": (_e, p) =>
    training.updateWorkoutSet(p as Parameters<typeof training.updateWorkoutSet>[0]),
  "training:addSet": (_e, p) =>
    training.addWorkoutSet((p as { session_exercise_id: number }).session_exercise_id),
  "training:removeSet": (_e, p) => {
    training.removeWorkoutSet((p as { set_id: number }).set_id);
    return { ok: true };
  },
  "training:updateExerciseNotes": (_e, p) => {
    const { session_exercise_id, notes } = p as { session_exercise_id: number; notes: string };
    training.updateSessionExerciseNotes(session_exercise_id, notes);
    return { ok: true };
  },
  "training:updateSessionNotes": (_e, p) => {
    const { session_id, notes } = p as { session_id: number; notes: string };
    training.updateSessionNotes(session_id, notes);
    return { ok: true };
  },
  "training:completeSession": (_e, p) => {
    const { session_id, force } = p as { session_id: number; force?: boolean };
    return training.completeWorkoutSession(session_id, Boolean(force));
  },
  "training:cancelSession": (_e, p) =>
    training.cancelWorkoutSession((p as { session_id: number }).session_id),
  "training:previousPerformance": (_e, p) => {
    const { member_id, exercise_id, before_session_id } = p as {
      member_id: number;
      exercise_id: number;
      before_session_id?: number;
    };
    return training.getPreviousPerformance(member_id, exercise_id, before_session_id);
  },
  "training:memberHistory": (_e, p) =>
    training.listMemberWorkoutHistory((p as { member_id: number }).member_id),
  "training:exerciseProgress": (_e, p) => {
    const { member_id, exercise_id } = p as { member_id: number; exercise_id: number };
    return training.getExerciseProgress(member_id, exercise_id);
  },
  "training:memberExercises": (_e, p) =>
    training.listMemberTrainedExercises((p as { member_id: number }).member_id),

  "store:categories:list": (_e, p) =>
    productCategories.listProductCategories(Boolean((p as { activeOnly?: boolean })?.activeOnly ?? true)),
  "store:categories:create": (_e, p) =>
    productCategories.createProductCategory((p as { name: string }).name),

  "store:products:list": (_e, p) =>
    products.listProducts((p as products.ListProductsFilter) ?? {}),
  "store:products:get": (_e, p) => products.getProduct((p as { id: number }).id),
  "store:products:find": (_e, p) =>
    products.findProductByCodeOrBarcode((p as { code: string }).code),
  "store:products:create": (_e, p) => {
    const input = p as products.CreateProductInput;
    const created = products.createProduct(input);
    return created;
  },
  "store:products:update": (_e, p) => {
    const input = p as products.UpdateProductInput;
    const before = products.getProduct(input.id);
    const updated = products.updateProduct(input);
    if (before) {
      replaceProfilePhoto(getPaths(), before.image_path, updated.image_path);
    }
    return updated;
  },
  "store:products:archive": (_e, p) => {
    products.archiveProduct((p as { id: number }).id);
    return { ok: true };
  },
  "store:products:stockHistory": (_e, p) =>
    inventory.listProductStockHistory((p as { product_id: number }).product_id),
  "store:products:salesHistory": (_e, p) =>
    inventory.listProductSalesHistory((p as { product_id: number }).product_id),

  "store:inventory:list": (_e, p) => inventory.listInventory((p as products.ListProductsFilter) ?? {}),
  "store:inventory:addStock": (_e, p) => inventory.addStock(p as inventory.AddStockInput),
  "store:inventory:adjust": (_e, p) => inventory.adjustStock(p as inventory.AdjustStockInput),
  "store:inventory:summary": () => products.countProductsByStockStatus(),

  "store:sales:list": (_e, p) => sales.listSales((p as sales.ListSalesFilter) ?? {}),
  "store:sales:get": (_e, p) => sales.getSale((p as { id: number }).id),
  "store:sales:create": (_e, p) => sales.createSale(p as sales.CreateSaleInput),
  "store:sales:cancel": (_e, p) => sales.cancelSale((p as { id: number }).id),
  "store:sales:todayStats": () => sales.getTodayStoreStats(),

  "store:memberPurchases:list": (_e, p) =>
    sales.listMemberPurchaseSales((p as { search?: string }) ?? {}),
  "store:memberPurchases:forMember": (_e, p) =>
    sales.listMemberPurchases((p as { member_id: number }).member_id),

  "notifications:list": (_e, p) =>
    notifications.listNotifications(((p as { filter?: "all" | "unread" })?.filter) ?? "all"),
  "notifications:unreadCount": () => notifications.unreadCount(),
  "notifications:markRead": (_e, p) => {
    notifications.markRead((p as { id: number }).id);
    return { ok: true };
  },
  "notifications:markAllRead": () => {
    notifications.markAllRead();
    return { ok: true };
  },
  "notifications:delete": (_e, p) => {
    notifications.deleteNotification((p as { id: number }).id);
    return { ok: true };
  },
  "notifications:scan": () => {
    notifications.scanOperationalAlerts();
    return { ok: true };
  },

  "settings:get": () => appSettings.getAppSettings(),
  "settings:save": (_e, p) => appSettings.saveAppSettings(p as Partial<appSettings.AppSettingsMap>),

  "reports:get": (_e, p) => reports.getReport(p as reports.ReportFilter),
  "reports:analytics": (_e, p) => {
    const { date_from, date_to } = p as { date_from: string; date_to: string };
    return reports.getAnalyticsDashboard(date_from, date_to);
  },

  "backup:list": () => backup.listBackups(),
  "backup:create": () => backup.createBackup(getPaths()),
  "backup:delete": (_e, p) => {
    backup.deleteBackup((p as { id: number }).id);
    return { ok: true };
  },
  "backup:chooseFolder": async (e) => {
    const win = BrowserWindow.fromWebContents(e.sender);
    return backup.chooseBackupFolder(win);
  },
  "backup:restore": async (_e, p) => {
    await backup.restoreBackup(getPaths(), (p as { folder_path: string }).folder_path);
    return { ok: true };
  },
  };
}

export function registerApiIpc(getPaths: () => DataPaths): void {
  const handlers = buildHandlers(getPaths);
  for (const [channel, handler] of Object.entries(handlers)) {
    ipcMain.handle(channel, (event, payload) => {
      try {
        return handler(event, payload);
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "An unexpected error occurred.";
        throw new Error(message);
      }
    });
  }
}
