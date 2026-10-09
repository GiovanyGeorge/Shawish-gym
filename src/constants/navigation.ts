import {
  BarChart3,
  CalendarDays,
  Dumbbell,
  Home,
  Settings,
  ShoppingBasket,
  UserRound,
  Users,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  id: string;
  label: string;
  path: string;
  icon: LucideIcon;
};

export const MAIN_NAV: NavItem[] = [
  { id: "home", label: "Home", path: "/", icon: Home },
  { id: "members", label: "Members", path: "/members", icon: Users },
  {
    id: "private-training",
    label: "Private Training",
    path: "/private-training",
    icon: Dumbbell,
  },
  {
    id: "store",
    label: "Supplements / Store",
    path: "/store",
    icon: ShoppingBasket,
  },
  {
    id: "attendance",
    label: "Attendance",
    path: "/attendance",
    icon: CalendarDays,
  },
  { id: "trainers", label: "Trainers", path: "/trainers", icon: UserRound },
  { id: "reports", label: "Reports", path: "/reports", icon: BarChart3 },
  { id: "settings", label: "Settings", path: "/settings", icon: Settings },
];

export const ROUTE_TITLES: Record<string, { title: string; subtitle?: string }> =
  {
    "/": {
      title: "Home",
    },
    "/members": {
      title: "Members",
      subtitle: "Manage memberships, trainers, and member profiles.",
    },
    "/private-training": {
      title: "Private Training",
      subtitle:
        "Manage personal training sessions and track workout history.",
    },
    "/store": {
      title: "Supplements / Store",
      subtitle: "Products, inventory, stock in, and sales checkout.",
    },
    "/attendance": {
      title: "Attendance",
      subtitle: "Daily attendance for active members.",
    },
    "/trainers": {
      title: "Trainers",
      subtitle: "Trainer roster and client assignments.",
    },
    "/reports": {
      title: "Analytics",
      subtitle: "Insights into members, subscriptions, training and revenue.",
    },
    "/settings": {
      title: "Settings",
      subtitle: "Gym configuration, prices, backup, and store settings.",
    },
  };
