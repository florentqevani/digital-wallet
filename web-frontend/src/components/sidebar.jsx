import { useState } from "react";
import { NavLink, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/use-auth";

const NAV_GROUPS = [
  {
    label: "Overview",
    items: [
      {
        to: "/dashboard",
        label: "Overview",
        icon: "⬡",
        end: true,
        roles: ["user", "superadmin"],
      },
    ],
  },
  {
    label: "Users & Clients",
    items: [
      {
        to: "/dashboard/users/backoffice",
        label: "Backoffice",
        icon: "◈",
        roles: ["superadmin"],
      },
      {
        to: "/dashboard/users/clients",
        label: "Clients",
        icon: "◇",
        roles: ["user", "superadmin"],
      },
    ],
  },
  {
    label: "Payments",
    items: [
      {
        to: "/payments/topup",
        label: "Top-Up",
        icon: "↑",
        roles: ["user", "superadmin"],
      },
      {
        to: "/payments/balance",
        label: "Balance",
        icon: "◎",
        roles: ["user", "superadmin"],
      },
      {
        to: "/payments/history",
        label: "History",
        icon: "↻",
        roles: ["user", "superadmin"],
      },
    ],
  },
  {
    label: "Accounts",
    items: [
      {
        to: "/accounts",
        label: "Accounts",
        icon: "▣",
        roles: ["user", "superadmin"],
      },
    ],
  },
  {
    label: "Logs",
    items: [
      {
        to: "/dashboard/client-logs",
        label: "Client Logs",
        icon: "≡",
        roles: ["user", "superadmin"],
      },
      {
        to: "/dashboard/user-logs",
        label: "User Logs",
        icon: "≡",
        roles: ["user", "superadmin"],
      },
      {
        to: "/accounts/logs",
        label: "Account Logs",
        icon: "≡",
        roles: ["user", "superadmin"],
      },
    ],
  },
];

export default function Sidebar({ collapsed, onToggle }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { role, logout } = useAuth();

  const initialOpen = () => {
    const state = {};
    NAV_GROUPS.forEach((g) => {
      state[g.label] = true; // all groups open by default
    });
    return state;
  };
  const [openGroups, setOpenGroups] = useState(initialOpen);

  const toggleGroup = (label) => {
    setOpenGroups((prev) => ({ ...prev, [label]: !prev[label] }));
  };

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <aside className={`sidebar${collapsed ? " sidebar--collapsed" : ""}`}>
      <div className="sidebar-brand">
        {!collapsed && (
          <div className="sidebar-brand-text">
            <span className="sidebar-eyebrow">Backoffice</span>
            <h1 className="sidebar-title">Operations</h1>
          </div>
        )}
        <button
          type="button"
          className="sidebar-toggle"
          onClick={onToggle}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? "☰" : "☰"}
        </button>
      </div>

      <nav className="sidebar-nav" aria-label="Main navigation">
        {NAV_GROUPS.map((group) => {
          const visibleItems = group.items.filter((item) =>
            item.roles.includes(role),
          );
          if (visibleItems.length === 0) return null;
          const isOpen = collapsed || openGroups[group.label];
          const hasActiveChild = visibleItems.some((item) =>
            item.end
              ? location.pathname === item.to
              : location.pathname.startsWith(item.to),
          );
          return (
            <div key={group.label} className="sidebar-group">
              {!collapsed && (
                <button
                  type="button"
                  className={`sidebar-group-toggle${hasActiveChild && !isOpen ? " sidebar-group-toggle--active" : ""}`}
                  onClick={() => toggleGroup(group.label)}
                  aria-expanded={isOpen}
                >
                  <span className="sidebar-group-toggle-label">
                    {group.label}
                  </span>
                  <span
                    className={`sidebar-group-chevron${isOpen ? " sidebar-group-chevron--open" : ""}`}
                    aria-hidden="true"
                  >
                    ›
                  </span>
                </button>
              )}
              <div
                className={`sidebar-group-items${isOpen ? " sidebar-group-items--open" : ""}`}
              >
                <div>
                  {visibleItems.map(({ to, label, icon, end }) => (
                    <NavLink
                      key={to}
                      to={to}
                      end={end}
                      title={collapsed ? label : undefined}
                      className={({ isActive }) =>
                        `sidebar-link${isActive ? " sidebar-link-active" : ""}`
                      }
                    >
                      <span className="sidebar-icon" aria-hidden="true">
                        {icon}
                      </span>
                      {!collapsed && label}
                    </NavLink>
                  ))}
                </div>
              </div>
            </div>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        {!collapsed && <span className="role-chip">{role}</span>}
        <button
          type="button"
          className="button-muted sidebar-signout"
          onClick={handleLogout}
          title="Sign out"
        >
          {collapsed ? "↩" : "Sign out"}
        </button>
      </div>
    </aside>
  );
}
