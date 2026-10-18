import { lazy, Suspense, useEffect, useState } from "react";
import {
  Navigate,
  Route,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { adminAuth } from "../services/adminApi";
import { ADMIN_BASE, adminPath } from "../admin/config";
import AdminLayout from "../admin/AdminLayout";
import LoginPage from "../admin/LoginPage";
import { Skeleton } from "../admin/shared/States";
import "../admin/admin.css";

const OverviewPage = lazy(() => import("../admin/overview/OverviewPage"));
const UsersPage = lazy(() => import("../admin/users/UsersPage"));
const GoalsPage = lazy(() => import("../admin/goals/GoalsPage"));
const HabitsPage = lazy(() => import("../admin/habits/HabitsPage"));
const ReportsPage = lazy(() => import("../admin/reports/ReportsPage"));
const CampaignsPage = lazy(() => import("../admin/campaigns/CampaignsPage"));
const ReleasesPage = lazy(() => import("../admin/releases/ReleasesPage"));
const ProductPage = lazy(() => import("../admin/product/ProductPage"));

export default function AdminPage() {
  const [token, setToken] = useState(adminAuth.getToken);
  const [expired, setExpired] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const logout = () => {
    adminAuth.clearToken();
    setToken(null);
    navigate(adminPath("login"), { replace: true });
  };
  useEffect(() => {
    const onExpired = () => {
      setToken(null);
      setExpired(true);
      navigate(adminPath("login"), { replace: true });
    };
    const onStorage = (event) => {
      if (event.key === adminAuth.tokenKey && !event.newValue) onExpired();
    };
    window.addEventListener("wishtrail-admin-session-expired", onExpired);
    window.addEventListener("storage", onStorage);
    return () => {
      window.removeEventListener("wishtrail-admin-session-expired", onExpired);
      window.removeEventListener("storage", onStorage);
    };
  }, [navigate]);
  if (!token) {
    if (location.pathname !== adminPath("login"))
      return (
        <Navigate
          to={adminPath("login")}
          replace
          state={{ from: location.pathname + location.search }}
        />
      );
    return (
      <LoginPage
        expired={expired}
        onLogin={(newToken) => {
          setToken(newToken);
          setExpired(false);
          const from = location.state?.from;
          navigate(
            typeof from === "string" &&
              (from === ADMIN_BASE || from.startsWith(`${ADMIN_BASE}/`)) &&
              !from.startsWith(adminPath("login"))
              ? from
              : adminPath(),
            { replace: true },
          );
        }}
      />
    );
  }
  return (
    <Suspense
      fallback={
        <div className="admin-console">
          <Skeleton cards rows={4} />
        </div>
      }
    >
      <Routes>
        <Route
          path={`${ADMIN_BASE}/*`}
          element={<AdminLayout onLogout={logout} />}
        >
          <Route index element={<OverviewPage />} />
          <Route path="users" element={<UsersPage />} />
          <Route path="goals" element={<GoalsPage />} />
          <Route path="habits" element={<HabitsPage />} />
          <Route path="reports" element={<ReportsPage />} />
          <Route path="campaigns" element={<CampaignsPage />} />
          <Route path="releases" element={<ReleasesPage />} />
          <Route path="product-control" element={<ProductPage />} />
          <Route path="login" element={<Navigate to={adminPath()} replace />} />
          <Route path="*" element={<Navigate to={adminPath()} replace />} />
        </Route>
      </Routes>
    </Suspense>
  );
}
