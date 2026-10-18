import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { RefreshCw } from "lucide-react";
import { adminAPI } from "../../services/adminApi";
import { adminPath } from "../config";
import { useAdminResource, useDebounce } from "../shared/hooks";
import { count, dateTime } from "../shared/format";
import { Badge } from "../shared/States";
import AdminTable from "../shared/AdminTable";
import FilterBar from "../shared/FilterBar";
import Pagination from "../shared/Pagination";
import GoalDetail from "./GoalDetail";

export default function GoalsPage() {
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
    () => adminAPI.getGoals(request),
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
      key: "title",
      label: "Goal",
      sortable: true,
      render: (goal) => (
        <button
          className="admin-link"
          onClick={() =>
            setParams((previous) => {
              previous.set("detail", goal.id);
              return previous;
            })
          }
        >
          {goal.title}
        </button>
      ),
    },
    {
      key: "owner",
      label: "Owner",
      render: (goal) => (
        <Link
          className="admin-link"
          to={`${adminPath("users")}?user=${goal.user?.id}`}
        >
          @{goal.user?.username}
        </Link>
      ),
    },
    { key: "category", label: "Category", sortable: true },
    {
      key: "status",
      label: "Status",
      render: (goal) => (
        <Badge tone={goal.completed ? "success" : "blue"}>
          {goal.completed ? "Completed" : "Active"}
        </Badge>
      ),
    },
    {
      key: "progress",
      label: "Progress",
      render: (goal) =>
        goal.completed ? (
          "100%"
        ) : (
          <button
            className="admin-link"
            onClick={() =>
              setParams((previous) => {
                previous.set("detail", goal.id);
                return previous;
              })
            }
          >
            Inspect breakdown
          </button>
        ),
    },
    {
      key: "visibility",
      label: "Visibility",
      render: (goal) => <Badge>{goal.isPublic ? "Public" : "Private"}</Badge>,
    },
    {
      key: "totalGoalUpdates",
      label: "Updates",
      render: (goal) => count(goal.totalGoalUpdates),
    },
    {
      key: "lastGoalUpdateAt",
      label: "Last progress",
      render: (goal) => dateTime(goal.lastGoalUpdateAt),
    },
    {
      key: "createdAt",
      label: "Created",
      sortable: true,
      render: (goal) => dateTime(goal.createdAt),
    },
  ];
  return (
    <>
      <div className="admin-page-heading">
        <div>
          <div className="admin-kicker">Content</div>
          <h1>Goals</h1>
          <p>
            Inspect goals, visibility, and the progress behind each journey.
          </p>
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
          placeholder="Search goal, username or email"
        >
          <select
            aria-label="Goal status"
            value={query.status}
            onChange={(event) => change({ status: event.target.value })}
          >
            <option value="all">All statuses</option>
            <option value="active">Active</option>
            <option value="completed">Completed</option>
          </select>
        </FilterBar>
        <AdminTable
          label="WishTrail goals"
          columns={columns}
          rows={resource.data?.goals}
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
        <GoalDetail
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
