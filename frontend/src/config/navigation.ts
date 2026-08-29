import {
  LayoutDashboard, CalendarDays, Users, BedDouble, Sparkles, Wrench,
  ShoppingCart, Package, Globe, DollarSign, PartyPopper, Target, Briefcase,
  BarChart3, Moon, Lock, UserCog, UserCheck, Settings, ShieldCheck, Code2,
  CreditCard, Receipt, LucideIcon
} from "lucide-react";

export { Users };

export interface NavSubItem {
  label: string;
  tab?: string;
  path?: string;
}

export interface NavItemConfig {
  icon: LucideIcon;
  label: string;
  path: string;
  subItems?: NavSubItem[];
  defaultTab?: string;
}

export const navItems: NavItemConfig[] = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/" },
  {
    icon: CalendarDays,
    label: "Reservations",
    path: "/reservations",
    defaultTab: "list",
    subItems: [
      { label: "List View", tab: "list" },
      { label: "Calendar", tab: "calendar" },
    ]
  },
  {
    icon: Globe,
    label: "Channel Manager",
    path: "/channel-manager",
    defaultTab: "channels",
    subItems: [
      { label: "Channels", tab: "channels" },
      { label: "Rate Calendar", tab: "rates" },
      { label: "Sync Logs", tab: "logs" },
      { label: "Reports", tab: "reports" },
    ]
  },
  {
    icon: Users,
    label: "Guests",
    path: "/guests",
    defaultTab: "guests",
    subItems: [
      { label: "Guest List", tab: "guests" },
      { label: "Feedback", tab: "feedback" },
      { label: "Loyalty", tab: "loyalty" },
      { label: "Preferences", tab: "preferences" },
      { label: "Documents", tab: "documents" },
      { label: "History", tab: "history" },
    ]
  },
{
    icon: BedDouble,
    label: "Front Desk",
    path: "/front-desk",
    defaultTab: "inhouse",
    subItems: [
      { label: "In-House", tab: "inhouse" },
      { label: "Billing", tab: "billing" },
      { label: "Guest Folios", tab: "folios" },
      { label: "Setup", tab: "setup" },
    ]
  },

  {
    icon: ShoppingCart,
    label: "POS",
    path: "/pos",
    subItems: [
      { label: "Dashboard", path: "/pos" },
      { label: "History", path: "/pos/history" },
      { label: "Reports", path: "/pos/reports" },
    ]
  },
  {
    icon: PartyPopper,
    label: "Banquet",
    path: "/banquet",
    defaultTab: "events",
    subItems: [
      { label: "Events", tab: "events" },
      { label: "Calendar", tab: "calendar" },
      { label: "Catering", tab: "catering" },
      { label: "Venue Setup", tab: "venue" },
      { label: "Reports", tab: "reports" },
    ]
  },

  {
    icon: DollarSign,
    label: "Finance/Account",
    path: "/finance",
  },
  {
    icon: Package,
    label: "Inventory",
    path: "/inventory",
    defaultTab: "items",
    subItems: [
      { label: "Item Master", tab: "items" },
      { label: "Suppliers", tab: "suppliers" },
      { label: "Purchase Orders", tab: "orders" },
      { label: "Stock Issues", tab: "issue" },
      { label: "Movements", tab: "movements" },
      { label: "Stock Count", tab: "stock-count" },
      { label: "Reports", tab: "stock-on-hand" },
    ]
  },

  {
    icon: Target,
    label: "Sales & Marketing",
    path: "/marketing",
    defaultTab: "inquiries",
    subItems: [
      { label: "Inquiries", tab: "inquiries" },
      { label: "Activities", tab: "activities" },
      { label: "Accounts", tab: "accounts" },
    ]
  },
  {
    icon: Briefcase,
    label: "Management",
    path: "/management",
    defaultTab: "performance",
    subItems: [
      { label: "Performance", tab: "performance" },
      { label: "Forecasting", tab: "forecasting" },
      { label: "Analysis", tab: "segmentation" },
    ]
  },
  {
    icon: BarChart3,
    label: "Reports",
    path: "/reports",
    defaultTab: "overview",
    subItems: [
      { label: "Overview", tab: "overview" },
      { label: "DMR Executive", tab: "dmr" },
      { label: "Daily Stats", tab: "daily" },
      { label: "Monthly Summary", tab: "monthly" },
    ]
  },
];

export const operationsNavItems: NavItemConfig[] = [
  {
    icon: Sparkles,
    label: "Operational",
    path: "/operations",
    defaultTab: "housekeeping",
    subItems: [
      { label: "Housekeeping", tab: "housekeeping" },
      { label: "Engineering", tab: "engineering" },
      { label: "Concierge", tab: "concierge" },
      { label: "Asset Tracking", tab: "assets" },
      { label: "Lost & Found", tab: "lost-found" },
      { label: "Day Close", tab: "day-close" },
      { label: "Night Audit", tab: "night-audit" },
    ]
  }
];

export const adminNavItems: NavItemConfig[] = [
  {
    icon: UserCog,
    label: "User Management",
    path: "/users",
    defaultTab: "users",
    subItems: [
      { label: "Users", tab: "users" },
      { label: "Activity", tab: "activity" },
      { label: "Bulk Actions", tab: "bulk" },
      { label: "Audit Log", tab: "audit" },
    ]
  },
  {
    icon: Users,
    label: "Staff Management",
    path: "/staff",
    defaultTab: "directory",
    subItems: [
      { label: "Directory", tab: "directory" },
      { label: "My Profile", tab: "details" },
      { label: "Preferences", tab: "preferences" },
      { label: "Attendance", tab: "attendance" },
      { label: "Schedules", tab: "schedules" },
      { label: "Alerts", tab: "alerts" },
      { label: "Security", tab: "security" },
      { label: "Logs", tab: "logs" },
    ]
  },
  {
    icon: UserCheck,
    label: "HRM",
    path: "/hrm",
    defaultTab: "employees",
    subItems: [
      { label: "Employees", tab: "employees" },
      { label: "Payroll", tab: "payroll" },
      { label: "Leave", tab: "leave" },
      { label: "Reports", tab: "reports" },
    ]
  },
  {
    icon: Settings,
    label: "Settings",
    path: "/settings",
    defaultTab: "checkin",
    subItems: [
      { label: "Check-in", tab: "checkin" },
      { label: "UI", tab: "ui" },
      { label: "Payment", tab: "payment" },
      { label: "Sources", tab: "sources" },
      { label: "Rates", tab: "rates" },
      { label: "Quick Menu", tab: "quickmenu" },
      { label: "Property", tab: "property" },
      { label: "Notifications", tab: "notifications" },
      { label: "Broadcast", tab: "broadcast" },
      { label: "Configure", tab: "configure" },
      { label: "Security", tab: "security" },
    ]
  },
  {
    icon: ShieldCheck,
    label: "Admin Console",
    path: "/admin-console",
    defaultTab: "overview",
    subItems: [
      { label: "Overview", tab: "overview" },
      { label: "Users", tab: "users" },
      { label: "Security", tab: "security" },
      { label: "Permissions", tab: "permissions" },
      { label: "Audit", tab: "audit" },
      { label: "Integrations", tab: "integrations" },
      { label: "Design System", tab: "design_system" },
      { label: "Security Breach", tab: "security_breach" },
    ]
  },
  {
    icon: Code2,
    label: "Dev Panel",
    path: "/dev",
    defaultTab: "status",
    subItems: [
      { label: "Status", tab: "status" },
      { label: "Seeder", tab: "seeder" },
      { label: "Cleanup", tab: "cleanup" },
      { label: "Email", tab: "email" },
      { label: "Logs", tab: "logs" },
      { label: "MCP", tab: "mcp" },
      { label: "Security", tab: "security" },
    ]
  },
];
