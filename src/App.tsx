import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppShell } from "@/components/layout/AppShell";
import { HomePage } from "@/pages/Home/HomePage";
import { AttendancePage } from "@/pages/Attendance/AttendancePage";
import { AddMemberPage } from "@/pages/Members/AddMemberPage";
import { EditMemberPage } from "@/pages/Members/EditMemberPage";
import { MemberProfilePage } from "@/pages/Members/MemberProfilePage";
import { MembersPage } from "@/pages/Members/MembersPage";
import { ReportsPage } from "@/pages/Reports/ReportsPage";
import { PrivateTrainingPage } from "@/pages/PrivateTraining/PrivateTrainingPage";
import { WorkoutSessionPage } from "@/pages/PrivateTraining/WorkoutSessionPage";
import { SettingsPage } from "@/pages/Settings/SettingsPage";
import { StorePage } from "@/pages/Store/StorePage";
import { NewSalePage } from "@/pages/Store/NewSalePage";
import { SaleDetailPage } from "@/pages/Store/SaleDetailPage";
import { TrainersPage } from "@/pages/Trainers/TrainersPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<AppShell />}>
          <Route index element={<HomePage />} />
          <Route path="/members" element={<MembersPage />} />
          <Route path="/members/new" element={<AddMemberPage />} />
          <Route path="/members/:id/edit" element={<EditMemberPage />} />
          <Route path="/members/:id" element={<MemberProfilePage />} />
          <Route path="/private-training" element={<PrivateTrainingPage />} />
          <Route path="/private-training/session/:id" element={<WorkoutSessionPage />} />
          <Route path="/store" element={<StorePage />} />
          <Route path="/store/sales/new" element={<NewSalePage />} />
          <Route path="/store/sales/:id" element={<SaleDetailPage />} />
          <Route path="/attendance" element={<AttendancePage />} />
          <Route path="/trainers" element={<TrainersPage />} />
          <Route path="/reports" element={<ReportsPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
