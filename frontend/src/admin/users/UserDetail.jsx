import { useState } from "react";
import { Link, useNavigate, useOutletContext } from "react-router-dom";
import toast from "react-hot-toast";
import { Mail, ExternalLink } from "lucide-react";
import { adminAPI } from "../../services/adminApi";
import { adminPath } from "../config";
import { useAdminResource } from "../shared/hooks";
import { dateTime, count, premiumState } from "../shared/format";
import {
  Badge,
  Details,
  EmptyState,
  ErrorState,
  Skeleton,
} from "../shared/States";
import DetailDrawer from "../shared/DetailDrawer";
import ConfirmDialog from "../shared/ConfirmDialog";
import Pagination from "../shared/Pagination";

function UserRecords({ id, type }) {
  const [page, setPage] = useState(1);
  const resource = useAdminResource(
    () =>
      (type === "goals" ? adminAPI.getGoals : adminAPI.getHabits)({
        userId: id,
        page,
        limit: 20,
      }),
    `${id}:${type}:${page}`,
  );
  if (resource.loading) return <Skeleton rows={4} />;
  if (resource.error)
    return <ErrorState message={resource.error} retry={resource.refresh} />;
  const rows = resource.data?.[type] || [];
  return (
    <>
      {rows.length ? (
        rows.map((row) => (
          <div key={row.id} className="admin-record">
            <Link
              className="admin-link"
              to={`${adminPath(type)}?userId=${id}&detail=${row.id}`}
            >
              {row.title || row.name}
            </Link>
            <small>
              {type === "goals"
                ? row.completed
                  ? "Completed"
                  : "Active"
                : `${row.frequency} · ${row.status}`}{" "}
              · {dateTime(row.createdAt)}
            </small>
          </div>
        ))
      ) : (
        <EmptyState
          title={`No ${type} yet`}
          description="No records are available for this account."
        />
      )}
      <Pagination
        pagination={resource.data?.pagination}
        onPageChange={setPage}
      />
    </>
  );
}

export default function UserDetail({ id, onClose, onChanged = () => {} }) {
  const resource = useAdminResource(() => adminAPI.getUser(id), id);
  const [tab, setTab] = useState("profile");
  const [action, setAction] = useState(null);
  const [months, setMonths] = useState(1);
  const navigate = useNavigate();
  const { setSelectedUsers } = useOutletContext();
  const user = resource.data?.user;
  const perform = async () => {
    if (action === "status")
      await adminAPI.setUserStatus(id, !user.accountActive);
    if (action === "grant") await adminAPI.grantPremium(id, Number(months));
    if (action === "revoke") await adminAPI.revokePremium(id);
    toast.success(
      action === "status"
        ? `Account ${user.accountActive ? "deactivated" : "reactivated"}`
        : "Premium updated",
    );
    resource.refresh();
    onChanged();
  };
  return (
    <>
      <DetailDrawer title="User details" onClose={onClose}>
        {resource.loading ? (
          <Skeleton />
        ) : resource.error ? (
          <ErrorState message={resource.error} retry={resource.refresh} />
        ) : (
          user && (
            <>
              <div className="admin-actions">
                <h2>{user.name}</h2>
                <Badge tone={user.accountActive ? "success" : "danger"}>
                  {user.accountActive ? "Active" : "Deactivated"}
                </Badge>
                <Badge tone={premiumState(user) === "Premium" ? "blue" : ""}>
                  {premiumState(user)}
                </Badge>
              </div>
              <p className="admin-muted">
                @{user.username} · {user.email}
              </p>
              <div className="admin-detail-tabs">
                {["profile", "goals", "habits", "activity"].map((value) => (
                  <button
                    key={value}
                    className={`admin-button ${value === tab ? "admin-button-primary" : ""}`}
                    onClick={() => setTab(value)}
                    aria-pressed={value === tab}
                  >
                    {value.charAt(0).toUpperCase() + value.slice(1)}
                  </button>
                ))}
              </div>
              {tab === "profile" && (
                <>
                  <Details
                    items={[
                      ["User ID", user.id],
                      ["Joined", dateTime(user.createdAt)],
                      ["Last active", dateTime(user.lastActiveAt)],
                      [
                        "Email preference",
                        user.emailNotificationsEnabled ? "Enabled" : "Disabled",
                      ],
                      [
                        "Verification",
                        user.isVerified ? "Verified" : "Unverified",
                      ],
                      [
                        "Goals",
                        `${count(user.completedGoals)} completed / ${count(user.totalGoals)} total`,
                      ],
                      ["Habits", count(user.totalHabits)],
                      ["Last daily update", dateTime(user.lastDailyUpdatedAt)],
                      ["Last release seen", user.lastUpdateSeen || "None"],
                      ["Premium state", premiumState(user)],
                      ["Premium expiry", dateTime(user.premiumExpiresAt)],
                    ]}
                  />
                  <div className="admin-actions">
                    <button
                      className="admin-button"
                      disabled={!user.accountActive}
                      onClick={() => {
                        setSelectedUsers([user.id]);
                        navigate(adminPath("campaigns"));
                      }}
                    >
                      <Mail size={14} />
                      Email user
                    </button>
                    <a
                      className="admin-button"
                      href={`/profile/${encodeURIComponent(user.username)}`}
                      target="_blank"
                      rel="noreferrer"
                    >
                      Public profile
                      <ExternalLink size={14} />
                    </a>
                  </div>
                  {!user.emailNotificationsEnabled && (
                    <p className="admin-notice">
                      Email notifications are disabled for this user. The
                      existing email composer is unchanged in Pass 1; review
                      this preference before sending.
                    </p>
                  )}
                  <h3 className="admin-section-title">Account controls</h3>
                  <div className="admin-actions">
                    <button
                      className="admin-button"
                      onClick={() => setAction("status")}
                    >
                      {user.accountActive
                        ? "Deactivate account"
                        : "Reactivate account"}
                    </button>
                    <button
                      className="admin-button"
                      disabled={!user.accountActive}
                      onClick={() => setAction("grant")}
                    >
                      {premiumState(user) === "Premium"
                        ? "Extend premium"
                        : "Grant premium"}
                    </button>
                    {user.premiumExpiresAt && user.accountActive && (
                      <button
                        className="admin-button admin-button-danger"
                        onClick={() => setAction("revoke")}
                      >
                        Revoke premium
                      </button>
                    )}
                  </div>
                </>
              )}
              {(tab === "goals" || tab === "habits") && (
                <UserRecords key={`${id}:${tab}`} id={id} type={tab} />
              )}
              {tab === "activity" && (
                <>
                  <p className="admin-muted text-xs">
                    Latest 10 records per source. This is existing product
                    activity.
                  </p>
                  <h3 className="admin-section-title">Goal updates</h3>
                  {resource.data.activity.goalUpdates.length ? (
                    resource.data.activity.goalUpdates.map((update) => (
                      <div key={update.id} className="admin-record">
                        <Link
                          className="admin-link"
                          to={`${adminPath("goals")}?detail=${update.goal_id}`}
                        >
                          Goal #{update.goal_id}
                        </Link>
                        <p>{update.text}</p>
                        <small>
                          {dateTime(update.created_at)}
                          {update.emotion ? ` · ${update.emotion}` : ""}
                        </small>
                      </div>
                    ))
                  ) : (
                    <EmptyState
                      title="No goal updates"
                      description="No goal progress has been recorded."
                    />
                  )}
                  <h3 className="admin-section-title">Habit logs</h3>
                  {resource.data.activity.habitLogs.length ? (
                    resource.data.activity.habitLogs.map((log) => (
                      <div key={log.id} className="admin-record">
                        <Link
                          className="admin-link"
                          to={`${adminPath("habits")}?detail=${log.habit_id}`}
                        >
                          Habit #{log.habit_id}
                        </Link>
                        <small>
                          {log.status} · {count(log.completion_count)}{" "}
                          completions · {dateTime(log.occurred_at)}
                        </small>
                      </div>
                    ))
                  ) : (
                    <EmptyState
                      title="No habit logs"
                      description="No habit activity has been recorded."
                    />
                  )}
                  <h3 className="admin-section-title">Daily check-ins</h3>
                  {resource.data.activity.dailyLogs.length ? (
                    resource.data.activity.dailyLogs.map((log) => (
                      <div key={log._id} className="admin-record">
                        {log.dayKey || "Daily check-in"}
                        {log.mood ? ` · ${log.mood}` : ""}
                        <small>Updated {dateTime(log.updatedAt)}</small>
                      </div>
                    ))
                  ) : (
                    <EmptyState
                      title="No daily check-ins"
                      description="No check-in history is available."
                    />
                  )}
                </>
              )}
            </>
          )
        )}
      </DetailDrawer>
      {action && user && (
        <ConfirmDialog
          title={
            action === "status"
              ? `${user.accountActive ? "Deactivate" : "Reactivate"} @${user.username}?`
              : action === "grant"
                ? "Grant or extend premium?"
                : "Revoke premium?"
          }
          description={
            action === "status"
              ? user.accountActive
                ? "This account will lose access and its refresh sessions will be cleared. Its content will be retained."
                : "This restores account access. The user will need to sign in again."
              : action === "grant"
                ? `Apply premium access to @${user.username}. Active premium is extended from its current expiry.`
                : `Remove premium access from @${user.username}.`
          }
          confirmLabel={
            action === "status"
              ? user.accountActive
                ? "Deactivate"
                : "Reactivate"
              : action === "grant"
                ? "Apply premium"
                : "Revoke premium"
          }
          danger={
            action === "revoke" || (action === "status" && user.accountActive)
          }
          onConfirm={perform}
          onClose={() => setAction(null)}
        >
          {action === "grant" && (
            <label className="block mt-4">
              Duration in months
              <select
                className="block mt-2 w-full"
                value={months}
                onChange={(event) => setMonths(Number(event.target.value))}
              >
                {[1, 3, 6, 12].map((value) => (
                  <option key={value} value={value}>
                    {value} month{value > 1 ? "s" : ""}
                  </option>
                ))}
              </select>
            </label>
          )}
        </ConfirmDialog>
      )}
    </>
  );
}
