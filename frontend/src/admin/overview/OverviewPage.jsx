import { useState } from "react";
import { Link } from "react-router-dom";
import {
  Users,
  UserCheck,
  UserPlus,
  Target,
  CircleDot,
  CheckCircle2,
  Repeat2,
  Activity,
  RefreshCw,
  ArrowUpRight,
  Flag,
} from "lucide-react";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
} from "chart.js";
import { Line } from "react-chartjs-2";
import { adminAPI } from "../../services/adminApi";
import { useAdminResource } from "../shared/hooks";
import { count, dateTime } from "../shared/format";
import { ErrorState, Skeleton } from "../shared/States";
import { adminPath } from "../config";

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
);
const today = () => new Date().toISOString().slice(0, 10);
const initialRange = () => ({
  start: new Date(Date.now() - 29 * 86400000).toISOString().slice(0, 10),
  end: today(),
});
const metrics = [
  ["totalUsers", "Total users", Users, "All registered accounts"],
  ["activeToday", "Active today", UserCheck, "Last activity since 00:00 UTC"],
  ["newUsers", "New users", UserPlus, "Created in selected period"],
  ["totalGoals", "Total goals", Target, "Across all accounts"],
  ["activeGoals", "Active goals", CircleDot, "Not yet completed"],
  ["completedGoals", "Completed goals", CheckCircle2, "With a completion date"],
  ["totalHabits", "Total habits", Repeat2, "Includes archived habits"],
  [
    "recentGoalProgress",
    "Goal progress",
    Activity,
    "Update records in selected period",
  ],
  [
    "recentHabitLogs",
    "Habit logs",
    Repeat2,
    "Daily log records in selected period",
  ],
];

export default function OverviewPage() {
  const [range, setRange] = useState(initialRange);
  const [draft, setDraft] = useState(range);
  const [rangeError, setRangeError] = useState("");
  const resource = useAdminResource(
    () => adminAPI.getOverview(range),
    JSON.stringify(range),
  );
  const apply = (event) => {
    event.preventDefault();
    const days =
      (Date.parse(draft.end) - Date.parse(draft.start)) / 86400000 + 1;
    if (
      !Number.isFinite(days) ||
      days < 1 ||
      days > 90 ||
      draft.end > today()
    ) {
      setRangeError(
        "Choose a period of 1–90 days, ending no later than today (UTC).",
      );
      return;
    }
    setRangeError("");
    setRange({ ...draft });
  };
  const daily = resource.data?.daily || [];
  const chart = {
    labels: daily.map((row) => row.day),
    datasets: [
      {
        label: "New users",
        data: daily.map((row) => row.users),
        borderColor: "#4c99e6",
        backgroundColor: "#4c99e6",
        tension: 0.3,
      },
      {
        label: "Goal updates",
        data: daily.map((row) => row.progress),
        borderColor: "#38a281",
        backgroundColor: "#38a281",
        tension: 0.3,
      },
      {
        label: "Habit log records",
        data: daily.map((row) => row.logs),
        borderColor: "#a089d2",
        backgroundColor: "#a089d2",
        tension: 0.3,
      },
    ],
  };
  return (
    <>
      <div className="admin-page-heading">
        <div>
          <div className="admin-kicker">A little perspective</div>
          <h1>Your trail at a glance</h1>
          <p>
            Understand activity across WishTrail and see what needs your
            attention.
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
      <form
        className="admin-panel admin-panel-body admin-range"
        onSubmit={apply}
      >
        <label>
          From (UTC)
          <input
            type="date"
            required
            value={draft.start}
            max={draft.end || today()}
            onChange={(event) =>
              setDraft({ ...draft, start: event.target.value })
            }
          />
        </label>
        <label>
          To (UTC)
          <input
            type="date"
            required
            value={draft.end}
            min={draft.start}
            max={today()}
            onChange={(event) =>
              setDraft({ ...draft, end: event.target.value })
            }
          />
        </label>
        <button className="admin-button admin-button-primary">
          Apply period
        </button>
        <span className="admin-muted text-xs">
          Up to 90 days · Totals are all-time
        </span>
        {rangeError && (
          <p role="alert" className="admin-error-text">
            {rangeError}
          </p>
        )}
      </form>
      {resource.loading ? (
        <>
          <Skeleton cards rows={9} />
          <div className="admin-panel">
            <Skeleton rows={5} />
          </div>
        </>
      ) : resource.error ? (
        <ErrorState message={resource.error} retry={resource.refresh} />
      ) : (
        <>
          <div className="admin-metrics">
            {metrics.map(([key, label, Icon, note]) => (
              <article key={key} className="admin-metric">
                <div className="admin-metric-top">
                  <span>{label}</span>
                  <Icon size={17} />
                </div>
                <strong>{count(resource.data?.metrics[key])}</strong>
                <small>{note}</small>
              </article>
            ))}
          </div>
          <div className="admin-overview-bottom">
            <section className="admin-panel">
              <div className="admin-panel-heading">
                <div>
                  <h2>Daily activity</h2>
                  <p className="admin-muted text-xs mt-1">
                    Actual records per UTC day · {range.start} to {range.end}
                  </p>
                </div>
              </div>
              <div className="admin-chart">
                <Line
                  data={chart}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    animation: false,
                    plugins: {
                      legend: {
                        position: "bottom",
                        labels: {
                          boxWidth: 8,
                          usePointStyle: true,
                          padding: 20,
                          font: { size: 11 },
                        },
                      },
                    },
                    elements: {
                      point: { radius: daily.length > 31 ? 0 : 2 },
                      line: { borderWidth: 2 },
                    },
                    scales: {
                      y: {
                        beginAtZero: true,
                        ticks: { precision: 0 },
                        grid: { color: "#eff3f7" },
                      },
                      x: {
                        grid: { display: false },
                        ticks: { maxTicksLimit: 7, font: { size: 10 } },
                      },
                    },
                  }}
                  aria-label="Daily new users, goal update records, and habit log records"
                  role="img"
                />
              </div>
              <details className="admin-panel-body">
                <summary className="admin-link cursor-pointer">
                  View chart data
                </summary>
                <div className="admin-table-scroll">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>UTC date</th>
                        <th>Users</th>
                        <th>Goal updates</th>
                        <th>Habit logs</th>
                      </tr>
                    </thead>
                    <tbody>
                      {daily.map((row) => (
                        <tr key={row.day}>
                          <td>{row.day}</td>
                          <td>{row.users}</td>
                          <td>{row.progress}</td>
                          <td>{row.logs}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </details>
            </section>
            <section className="admin-panel">
              <div className="admin-panel-heading">
                <h2>Needs attention</h2>
                <Flag size={17} className="admin-muted" />
              </div>
              <div className="admin-panel-body">
                <div className="admin-metric-top">
                  <span>Open or reviewing reports</span>
                  <strong>
                    {count(resource.data?.needsAttention.openReports)}
                  </strong>
                </div>
                <Link to={adminPath("reports")} className="admin-button mt-5">
                  Review reports
                  <ArrowUpRight size={15} />
                </Link>
                <p className="admin-muted text-xs mt-5">
                  Review reports submitted by the WishTrail community.
                </p>
              </div>
            </section>
          </div>
          <p className="admin-muted text-xs">
            Last refreshed {dateTime(resource.data?.refreshedAt)} · Activity
            uses UTC boundaries. Habit logs count daily records, not individual
            completions.
          </p>
        </>
      )}
    </>
  );
}
