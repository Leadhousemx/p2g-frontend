import { NavLink, useLocation } from "react-router-dom";
import { cn } from "../../lib/utils";

export default function ResponsiveNavMenu({ items, onNavigate, compact = false }) {
  const location = useLocation();

  return (
    <ul className={cn("space-y-1", compact ? "px-2" : "px-3")}>
      {items.map((item) => {
        const Icon = item.icon;
        const matchesCustomPrefix = Array.isArray(item.activePrefixes)
          && item.activePrefixes.some((prefix) => location.pathname.startsWith(prefix));
        return (
          <li key={item.label}>
            <NavLink
              to={item.path}
              onClick={onNavigate}
              end={item.path === "/dashboard"}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-lg transition-all duration-200",
                  compact ? "px-3 py-3" : "px-3 py-2.5",
                  (isActive || matchesCustomPrefix)
                    ? "bg-[#2563EB] text-white font-semibold shadow-md"
                    : "text-gray-300 hover:bg-white/10 hover:text-white"
                )
              }
            >
              <Icon size={20} className="shrink-0" />
              <span className="truncate text-sm">{item.label}</span>
            </NavLink>
          </li>
        );
      })}
    </ul>
  );
}
