import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { RefreshCw } from "lucide-react";
import { adminAPI } from "../../services/adminApi";
import { adminPath } from "../config";
import { useAdminResource, useDebounce } from "../shared/hooks";
import { count, dateTime, schedule } from "../shared/format";
import { Badge } from "../shared/States";
import AdminTable from "../shared/AdminTable";
import FilterBar from "../shared/FilterBar";
import Pagination from "../shared/Pagination";
import HabitDetail from "./HabitDetail";

export default function HabitsPage() {
  const [query, setQuery] = useState({
    page: 1,
    limit: 20,
    status: "all",
    sortBy: "createdAt",
    sortOrder: "desc",
  });
  const [text, setText] = useState("");
  const search = useDebounce(text);
  const searching = text !== search;
  const [params, setParams] = useSearchParams();
  const request = {
    ...query,
    search,
    userId: params.get("userId") || undefined,
  };
  const resource = useAdminResource(
    () => adminAPI.getHabits(request),
    JSON.stringify(request),
  );
  const change = (update) =>
    setQuery((previous) => ({
      ...previous,
      ...update,
      page: update.page ?? 1,
    }));
  const columns = [
    {
      key: "name",
      label: "Habit",
      sortable: true,
      render: (habit) => (
        <>
          <button
            className="admin-link"
            onClick={() =>
              setParams((previous) => {
                previous.set("detail", habit.id);
                return previous;
              })
            }
          >
            {habit.name}
          </button>
          {habit.isArchived && <small>Archived</small>}
        </>
      ),
    },
    {
      key: "owner",
      label: "Owner",
      render: (habit) => (
        <Link
          className="admin-link"
          to={`${adminPath("users")}?user=${habit.user?.id}`}
        >
          @{habit.user?.username}
        </Link>
      ),
    },
    { key: "frequency", label: "Schedule", render: schedule },
    {
      key: "status",
      label: "Recent activity",
      render: (habit) => (
        <Badge tone={habit.status === "Active" ? "success" : ""}>
          {habit.status}
        </Badge>
      ),
    },
    {
      key: "totalLogs",
      label: "Logs",
      render: (habit) => count(habit.totalLogs),
    },
    {
      key: "currentStreak",
      label: "Current streak",
      sortable: true,
      render: (habit) => count(habit.currentStreak),
    },
    {
      key: "bestStreak",
      label: "Best streak",
      render: (habit) => count(habit.bestStreak),
    },
    {
      key: "lastLogAt",
      label: "Last log",
      render: (habit) => dateTime(habit.lastLogAt),
    },
    {
      key: "createdAt",
      label: "Created",
      sortable: true,
      render: (habit) => dateTime(habit.createdAt),
    },
  ];
  return (
    <>
      <div className="admin-page-heading">
        <div>
          <div className="admin-kicker">Content</div>
          <h1>Habits</h1>
          <p>Inspect schedules, streaks, and recent logging activity.</p>
        </div>
        <button
          className="admin-button"
          disabled={searching || resource.loading}
          onClick={resource.refresh}
        >
          <RefreshCw size={15} />
          Refresh
        </button>
      </div>
      <p className="admin-notice">
        Active means a log was recorded in the last seven days. Archival state
        is shown separately.
      </p>
      {params.get("userId") && (
        <div className="admin-notice admin-actions">
          Showing user #{params.get("userId")}
          <button
            className="admin-link"
            onClick={() => {
              setParams({});
              change({});
            }}
          >
            Show all users
          </button>
        </div>
      )}
      <section className="admin-panel">
        <FilterBar
          search={text}
          onSearch={(value) => {
            setText(value);
            change({});
          }}
          placeholder="Search habit, username or email"
        >
          <select
            aria-label="Habit activity"
            value={query.status}
            onChange={(event) => change({ status: event.target.value })}
          >
            <option value="all">All activity</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </FilterBar>
        <AdminTable
          label="WishTrail habits"
          columns={columns}
          rows={resource.data?.habits}
          loading={resource.loading || searching}
          error={resource.error}
          retry={resource.refresh}
          sortBy={query.sortBy}
          sortOrder={query.sortOrder}
          onSort={(key) =>
            change({
              sortBy: key,
              sortOrder:
                query.sortBy === key && query.sortOrder === "asc"
                  ? "desc"
                  : "asc",
            })
          }
        />
        {!resource.loading && !searching && !resource.error && (
          <Pagination
            pagination={resource.data?.pagination}
            onPageChange={(page) => change({ page })}
            onLimitChange={(limit) => change({ limit })}
          />
        )}
      </section>
      {params.get("detail") && (
        <HabitDetail
          id={params.get("detail")}
          onClose={() =>
            setParams((previous) => {
              previous.delete("detail");
              return previous;
            })
          }
        />
      )}
    </>
  );
}
