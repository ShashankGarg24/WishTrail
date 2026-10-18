import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { RefreshCw } from "lucide-react";
import toast from "react-hot-toast";
import { adminAPI } from "../../services/adminApi";
import { adminPath } from "../config";
import { useAdminResource } from "../shared/hooks";
import { dateTime } from "../shared/format";
import { Badge, Details, ErrorState, Skeleton } from "../shared/States";
import AdminTable from "../shared/AdminTable";
import Pagination from "../shared/Pagination";
import DetailDrawer from "../shared/DetailDrawer";
import ConfirmDialog from "../shared/ConfirmDialog";

function ReportDetail({ id, onClose, onChanged }) {
  const resource = useAdminResource(() => adminAPI.getReport(id), id);
  const [confirm, setConfirm] = useState(false);
  const report = resource.data?.report;
  const target = resource.data?.resource;
  const dismiss = async () => {
    await adminAPI.dismissReport(id);
    toast.success("Report dismissed");
    resource.refresh();
    onChanged();
  };
  return (
    <>
      <DetailDrawer title="Report details" onClose={onClose}>
        {resource.loading ? (
          <Skeleton />
        ) : resource.error ? (
          <ErrorState message={resource.error} retry={resource.refresh} />
        ) : (
          report && (
            <>
              <div className="admin-actions">
                <h2>{report.reason}</h2>
                <Badge
                  tone={
                    ["open", "reviewing"].includes(report.status)
                      ? "warning"
                      : ""
                  }
                >
                  {report.status}
                </Badge>
              </div>
              <Details
                items={[
                  ["Report ID", report._id],
                  ["Reported on", dateTime(report.createdAt)],
                  ["Resource type", report.targetType],
                  ["Resource ID", String(report.targetId)],
                  [
                    "Reporter",
                    <Link
                      className="admin-link"
                      to={`${adminPath("users")}?user=${report.reporterId}`}
                    >
                      Open user #{report.reporterId}
                    </Link>,
                  ],
                ]}
              />
              <h3 className="admin-section-title">Report description</h3>
              <p className="whitespace-pre-wrap">
                {report.description || "No additional details supplied."}
              </p>
              <h3 className="admin-section-title">Reported resource</h3>
              {target ? (
                <div className="admin-record">
                  {report.targetType === "user" ? (
                    <>
                      <Link
                        className="admin-link"
                        to={`${adminPath("users")}?user=${target.id}`}
                      >
                        Open @{target.username}
                      </Link>
                      <small>
                        {target.is_active
                          ? "Active account"
                          : "Deactivated account"}
                      </small>
                    </>
                  ) : (
                    <>
                      <h3>{target.data?.share?.title || target.type}</h3>
                      {target.data?.share?.note && (
                        <p>{target.data.share.note}</p>
                      )}
                      <small>
                        {dateTime(target.createdAt)} ·{" "}
                        {target.isPublic ? "Public" : "Private"}
                      </small>
                      <div className="admin-actions mt-3">
                        <Link
                          className="admin-link"
                          to={`${adminPath("users")}?user=${target.userId}`}
                        >
                          Open author #{target.userId}
                        </Link>
                        {target.data?.goalId && (
                          <Link
                            className="admin-link"
                            to={`${adminPath("goals")}?detail=${target.data.goalId}`}
                          >
                            Inspect related goal
                          </Link>
                        )}
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <p className="admin-notice">
                  This resource is no longer available or its identifier is
                  invalid.
                </p>
              )}
              {["open", "reviewing"].includes(report.status) && (
                <button
                  className="admin-button mt-5"
                  onClick={() => setConfirm(true)}
                >
                  Dismiss report
                </button>
              )}
            </>
          )
        )}
      </DetailDrawer>
      {confirm && (
        <ConfirmDialog
          title="Dismiss this report?"
          description="The existing report will be marked dismissed. The reported content and account will be retained."
          confirmLabel="Dismiss report"
          onConfirm={dismiss}
          onClose={() => setConfirm(false)}
        />
      )}
    </>
  );
}

export default function ReportsPage() {
  const [query, setQuery] = useState({ page: 1, limit: 20, status: "open" });
  const [params, setParams] = useSearchParams();
  const resource = useAdminResource(
    () => adminAPI.getReports(query),
    JSON.stringify(query),
  );
  const columns = [
    {
      key: "reason",
      label: "Reason",
      render: (report) => (
        <button
          className="admin-link"
          onClick={() => setParams({ detail: report._id })}
        >
          {report.reason}
        </button>
      ),
    },
    {
      key: "resource",
      label: "Reported resource",
      render: (report) => (
        <>
          {report.targetType === "user" && report.targetUser ? (
            <Link
              className="admin-link"
              to={`${adminPath("users")}?user=${report.targetId}`}
            >
              @{report.targetUser.username}
            </Link>
          ) : (
            <span>
              {report.targetType} #{String(report.targetId)}
            </span>
          )}
        </>
      ),
    },
    {
      key: "reporter",
      label: "Reporter",
      render: (report) => (
        <Link
          className="admin-link"
          to={`${adminPath("users")}?user=${report.reporterId}`}
        >
          {report.reporter?.username
            ? `@${report.reporter.username}`
            : `User #${report.reporterId}`}
        </Link>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (report) => (
        <Badge
          tone={["open", "reviewing"].includes(report.status) ? "warning" : ""}
        >
          {report.status}
        </Badge>
      ),
    },
    {
      key: "createdAt",
      label: "Reported",
      render: (report) => dateTime(report.createdAt),
    },
  ];
  return (
    <>
      <div className="admin-page-heading">
        <div>
          <div className="admin-kicker">Content</div>
          <h1>Reports</h1>
          <p>
            Review existing reports, inspect the resource, and follow up on an
            account.
          </p>
        </div>
        <button
          className="admin-button"
          disabled={resource.loading}
          onClick={resource.refresh}
        >
          <RefreshCw size={15} />
          Refresh
        </button>
      </div>
      <section className="admin-panel">
        <div className="admin-filters">
          <label className="admin-actions">
            Status
            <select
              value={query.status}
              onChange={(event) =>
                setQuery({ ...query, page: 1, status: event.target.value })
              }
            >
              {["all", "open", "reviewing", "resolved", "dismissed"].map(
                (value) => (
                  <option key={value} value={value}>
                    {value.charAt(0).toUpperCase() + value.slice(1)}
                  </option>
                ),
              )}
            </select>
          </label>
        </div>
        <AdminTable
          label="Content reports"
          columns={columns}
          rows={resource.data?.reports}
          rowKey="_id"
          loading={resource.loading}
          error={resource.error}
          retry={resource.refresh}
        />
        {!resource.loading && !resource.error && (
          <Pagination
            pagination={resource.data?.pagination}
            onPageChange={(page) => setQuery({ ...query, page })}
            onLimitChange={(limit) => setQuery({ ...query, limit, page: 1 })}
          />
        )}
      </section>
      {params.get("detail") && (
        <ReportDetail
          key={params.get("detail")}
          id={params.get("detail")}
          onClose={() => setParams({})}
          onChanged={resource.refresh}
        />
      )}
    </>
  );
}
