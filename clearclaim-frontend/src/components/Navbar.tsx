// Navbar.tsx
// Top navigation bar shown after login
// Displays app name, current role badge, and logout button
// Logout dispatches Redux logout action — returns user to Login page

import { useDispatch, useSelector } from "react-redux";
import type { RootState } from "../store/store";
import { logout } from "../store/authSlice";
import { Shield, LogOut } from "lucide-react";

const Navbar = () => {
  const dispatch = useDispatch();
  const { role, userId } = useSelector((state: RootState) => state.auth);

  // Role badge color based on current role
  const roleBadgeColor = {
    customer: "bg-green-100 text-green-700",
    admin: "bg-red-100 text-red-700",
    hospital: "bg-amber-100 text-amber-700",
  }[role!];

  return (
    <nav className="bg-white border-b border-slate-200 px-6 py-3 flex items-center justify-between shadow-sm">
      {/* Left — App name */}
      <div className="flex items-center gap-2">
        <Shield className="text-blue-700" size={22} />
        <span className="text-blue-700 font-bold text-lg">ClearClaim</span>
        <span className="text-slate-400 text-xs ml-1">
          by Simplify Healthcare
        </span>
      </div>

      {/* Right — Role badge + user id + logout */}
      <div className="flex items-center gap-4">
        {/* Role badge */}
        <span
          className={`text-xs font-medium px-3 py-1 rounded-full capitalize ${roleBadgeColor}`}
        >
          {role}
          {userId && ` — ID: ${userId}`}
        </span>

        {/* Logout button */}
        <button
          onClick={() => dispatch(logout())}
          className="flex items-center gap-1 text-sm text-slate-500 hover:text-red-600 transition-colors"
        >
          <LogOut size={16} />
          Logout
        </button>
      </div>
    </nav>
  );
};

export default Navbar;
