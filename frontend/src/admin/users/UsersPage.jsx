import { useState } from "react";
import {
  useNavigate,
  useOutletContext,
  useSearchParams,
} from "react-router-dom";
import { Download, Mail, RefreshCw } from "lucide-react";
import { adminAPI } from "../../services/adminApi";
import { adminPath } from "../config";
import { useAdminResource, useDebounce } from "../shared/hooks";
import AdminTable from "../shared/AdminTable";
import FilterBar from "../shared/FilterBar";
import Pagination from "../shared/Pagination";
import { Badge } from "../shared/States";
import { dateTime, count, downloadCsv, premiumState } from "../shared/format";
import UserDetail from "./UserDetail";

export default function UsersPage() {
  const [query, setQuery] = useState({
    page: 1,
    limit: 20,
    search: "",
    inactiveDays: "",
    emailNotifications: "all",
    sortBy: "createdAt",
    sortOrder: "desc",
  });
  const [draft, setDraft] = useState({
    inactiveDays: "",
    emailNotifications: "all",
  });
  const [text, setText] = useState("");
  const search = useDebounce(text);
  const searching = text !== search;
  const { selectedUsers, setSelectedUsers } = useOutletContext();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const request = { ...query, search };
  const resource = useAdminResource(
    () => adminAPI.getUsers(request),
    JSON.stringify(request),
  );
  const users = resource.data?.users || [];
  const change = (update) => {
    setQuery((previous) => ({
      ...previous,
      ...update,
      page: update.page ?? 1,
    }));
    setSelectedUsers([]);
  };
  const sort = (key) =>
    change({
      sortBy: key,
      sortOrder:
        query.sortBy === key && query.sortOrder === "asc" ? "desc" : "asc",
    });
  const toggle = (id) =>
    setSelectedUsers((previous) =>
      previous.includes(id)
        ? previous.filter((value) => value !== id)
        : [...previous, id],
    );
  const allSelected =
    users.length > 0 && users.every((user) => selectedUsers.includes(user.id));
  const columns = [
    {
      key: "select",
      label: (
        <input
          type="checkbox"
          aria-label="Select all users on this page"
          checked={allSelected}
          onChange={() =>
            setSelectedUsers(allSelected ? [] : users.map((user) => user.id))
          }
        />
      ),
      render: (user) => (
        <input
          aria-label={`Select ${user.username}`}
          type="checkbox"
          checked={selectedUsers.includes(user.id)}
          onChange={() => toggle(user.id)}
        />
      ),
    },
    {
      key: "name",
      label: "User",
      sortable: true,
      render: (user) => (
        <>
          <button
            className="admin-link"
            onClick={() => setParams({ user: user.id })}
          >
            {user.name}
          </button>
          <small>@{user.username}</small>
        </>
      ),
    },
    { key: "email", label: "Email", sortable: true },
    {
      key: "accountActive",
      label: "Account",
      render: (user) => (
        <Badge tone={user.accountActive ? "success" : "danger"}>
          {user.accountActive ? "Active" : "Deactivated"}
        </Badge>
      ),
    },
    {
      key: "isVerified",
      label: "Verification",
      render: (user) => (
        <Badge tone={user.isVerified ? "blue" : ""}>
          {user.isVerified ? "Verified" : "Unverified"}
        </Badge>
      ),
    },
    {
      key: "premium",
      label: "Plan",
      render: (user) => (
        <Badge tone={premiumState(user) === "Premium" ? "blue" : ""}>
          {premiumState(user)}
        </Badge>
      ),
    },
    {
      key: "emailNotificationsEnabled",
      label: "Email",
      render: (user) =>
        user.emailNotificationsEnabled ? "Enabled" : "Disabled",
    },
    {
      key: "totalGoals",
      label: "Goals",
      sortable: true,
      render: (user) =>
        `${count(user.completedGoals)} / ${count(user.totalGoals)} completed`,
    },
    {
      key: "totalHabits",
      label: "Habits",
      render: (user) => count(user.totalHabits),
    },
    {
      key: "lastActiveAt",
      label: "Last active",
      sortable: true,
      render: (user) => dateTime(user.lastActiveAt),
    },
    {
      key: "lastDailyUpdatedAt",
      label: "Daily update",
      render: (user) => dateTime(user.lastDailyUpdatedAt),
    },
    {
      key: "lastUpdateSeen",
      label: "Last release seen",
      render: (user) => user.lastUpdateSeen || "—",
    },
    {
      key: "createdAt",
      label: "Joined",
      sortable: true,
      render: (user) => dateTime(user.createdAt),
    },
  ];
  const exportPage = () =>
    downloadCsv(
      "wishtrail-users-current-page.csv",
      [
        { label: "Name", value: (user) => user.name },
        { label: "Username", value: (user) => user.username },
        { label: "Email", value: (user) => user.email },
        { label: "Account active", value: (user) => user.accountActive },
        { label: "Verified", value: (user) => user.isVerified },
        { label: "Plan", value: premiumState },
        { label: "Premium expires", value: (user) => user.premiumExpiresAt },
        { label: "Goals", value: (user) => user.totalGoals },
        { label: "Completed goals", value: (user) => user.completedGoals },
        { label: "Habits", value: (user) => user.totalHabits },
        { label: "Joined", value: (user) => user.createdAt },
        { label: "Last active", value: (user) => user.lastActiveAt },
      ],
      users,
    );
  return (
    <>
      <div className="admin-page-heading">
        <div>
          <div className="admin-kicker">People</div>
          <h1>Users</h1>
          <p>
            Find an account, understand its activity, and provide focused
            support.
          </p>
        </div>
        <div className="admin-actions">
          <button
            className="admin-button"
            disabled={searching || resource.loading || !users.length}
            onClick={exportPage}
          >
            <Download size={15} />
            Export this page
          </button>
          <button
            className="admin-button"
            aria-label="Refresh users"
            disabled={searching || resource.loading}
            onClick={resource.refresh}
          >
            <RefreshCw size={15} />
          </button>
        </div>
      </div>
      <section className="admin-panel">
        <FilterBar
          search={text}
          onSearch={(value) => {
            setText(value);
            change({ search: value });
          }}
          placeholder="Search name, username or email"
        >
          <input
            type="number"
            min="1"
            aria-label="Inactive for more than days"
            placeholder="Inactive > days"
            className="w-36"
            value={draft.inactiveDays}
            onChange={(event) =>
              setDraft({ ...draft, inactiveDays: event.target.value })
            }
          />
          <select
            aria-label="Email preference filter"
            value={draft.emailNotifications}
            onChange={(event) =>
              setDraft({ ...draft, emailNotifications: event.target.value })
            }
          >
            <option value="all">All email preferences</option>
            <option value="enabled">Email enabled</option>
            <option value="disabled">Email disabled</option>
          </select>
          <button className="admin-button" onClick={() => change(draft)}>
            Apply filters
          </button>
        </FilterBar>
        {selectedUsers.length > 0 && (
          <div className="admin-selection">
            <span>{selectedUsers.length} users selected</span>
            <button className="admin-link" onClick={() => setSelectedUsers([])}>
              Clear selection
            </button>
            <button
              className="admin-button"
              onClick={() => navigate(adminPath("campaigns"))}
            >
              <Mail size={14} />
              Email selected
            </button>
          </div>
        )}
        <AdminTable
          label="WishTrail users"
          columns={columns}
          rows={users}
          loading={resource.loading || searching}
          error={resource.error}
          retry={resource.refresh}
          sortBy={query.sortBy}
          sortOrder={query.sortOrder}
          onSort={sort}
        />
        {!resource.loading && !searching && !resource.error && (
          <Pagination
            pagination={resource.data?.pagination}
            onPageChange={(page) => change({ page })}
            onLimitChange={(limit) => change({ limit })}
          />
        )}
      </section>
      {params.get("user") && (
        <UserDetail
          key={params.get("user")}
          id={params.get("user")}
          onClose={() => setParams({})}
          onChanged={() => {
            resource.refresh();
            setSelectedUsers([]);
          }}
        />
      )}
    </>
  );
}
