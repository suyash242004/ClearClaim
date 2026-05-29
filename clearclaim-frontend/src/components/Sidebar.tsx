// Sidebar.tsx
// Left side navigation menu shown after login
// Menu items change based on current role (customer / admin / hospital)
// Uses React Router NavLink for active link highlighting

import { NavLink } from "react-router-dom";
import { useSelector } from "react-redux";
import type { RootState } from "../store/store";
import {
  LayoutDashboard,
  Search,
  ShoppingCart,
  FileText,
  ClipboardList,
  CheckSquare,
  Users,
  Database,
  Hospital,
} from "lucide-react";

// Menu item type
interface MenuItem {
  label: string;
  path: string;
  icon: React.ReactNode;
}

const Sidebar = () => {
  const { role } = useSelector((state: RootState) => state.auth);

  // Menu items for each role
  const customerMenu: MenuItem[] = [
    { label: "Dashboard", path: "/", icon: <LayoutDashboard size={18} /> },
    {
      label: "Browse Plans",
      path: "/browse-plans",
      icon: <Search size={18} />,
    },
    {
      label: "Purchase Policy",
      path: "/purchase-policy",
      icon: <ShoppingCart size={18} />,
    },
    {
      label: "My Policies",
      path: "/my-policies",
      icon: <FileText size={18} />,
    },
    {
      label: "Submit Claim",
      path: "/submit-claim",
      icon: <ClipboardList size={18} />,
    },
    { label: "My Claims", path: "/my-claims", icon: <CheckSquare size={18} /> },
    { label: "Family Members", path: "/family-members", icon: <Users size={18} /> },
  ];

  const adminMenu: MenuItem[] = [
    { label: "Dashboard", path: "/", icon: <LayoutDashboard size={18} /> },
    {
      label: "Pending Claims",
      path: "/pending-claims",
      icon: <ClipboardList size={18} />,
    },
    {
      label: "Customer Search",
      path: "/customer-search",
      icon: <Users size={18} />,
    },
    {
      label: "Manage Data",
      path: "/manage-data",
      icon: <Database size={18} />,
    },
  ];

  const hospitalMenu: MenuItem[] = [
    { label: "Claims", path: "/", icon: <Hospital size={18} /> },
  ];

  // Pick menu based on role
  const menu =
    role === "customer"
      ? customerMenu
      : role === "admin"
        ? adminMenu
        : hospitalMenu;

  return (
    <aside className="w-56 bg-white border-r border-slate-200 min-h-full py-6 px-3 flex flex-col gap-1">
      {menu.map((item) => (
        <NavLink
          key={item.path}
          to={item.path}
          end={item.path === "/"}
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors
            ${
              isActive
                ? "bg-blue-50 text-blue-700"
                : "text-slate-600 hover:bg-slate-100"
            }`
          }
        >
          {item.icon}
          {item.label}
        </NavLink>
      ))}
    </aside>
  );
};

export default Sidebar;
