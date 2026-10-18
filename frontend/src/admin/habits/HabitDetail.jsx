import { Link } from "react-router-dom";
import { adminAPI } from "../../services/adminApi";
import { useAdminResource } from "../shared/hooks";
import { adminPath } from "../config";
import { dateTime, count, schedule } from "../shared/format";
import {
  Badge,
  Details,
  EmptyState,
  ErrorState,
  Skeleton,
} from "../shared/States";
import DetailDrawer from "../shared/DetailDrawer";

export default function HabitDetail({ id, onClose }) {
  const resource = useAdminResource(() => adminAPI.getHabit(id), id);
  const habit = resource.data?.habit;
  return (
    <DetailDrawer title="Habit details" onClose={onClose}>
      {resource.loading ? (
        <Skeleton />
      ) : resource.error ? (
        <ErrorState message={resource.error} retry={resource.refresh} />
      ) : (
        habit && (
          <>
            <h2>{habit.name}</h2>
            <p className="admin-muted mt-2">{habit.description}</p>
            <div className="admin-actions mt-3">
              <Badge>{habit.is_public ? "Public" : "Private"}</Badge>
              {habit.is_archived && <Badge tone="warning">Archived</Badge>}
              <Link
                className="admin-link"
                to={`${adminPath("users")}?user=${habit.user_id}`}
              >
                Open @{habit.owner_username}
              </Link>
            </div>
            <Details
              items={[
                ["Habit ID", habit.id],
                ["Category", habit.category],
                [
                  "Schedule",
                  schedule({
                    frequency: habit.frequency,
                    daysOfWeek: habit.days_of_week,
                  }),
                ],
                [
                  "Daily target",
                  habit.daily_target_count
                    ? `${habit.daily_target_count} completions`
                    : "Not specified",
                ],
                ["Target days", habit.target_days ?? "Not specified"],
                ["Current streak", count(habit.current_streak)],
                ["Best streak", count(habit.best_streak)],
                ["Total daily log records", count(habit.total_logs)],
                ["Last log", dateTime(habit.last_log_at)],
                ["Created", dateTime(habit.created_at)],
              ]}
            />
            <h3 className="admin-section-title">Recent logs</h3>
            <p className="admin-muted text-xs">
              Latest 20 daily records. Completion counts may include multiple
              check-ins on a day.
            </p>
            {resource.data.recentLogs.length ? (
              resource.data.recentLogs.map((log) => (
                <article key={log.id} className="admin-record">
                  <div className="admin-actions">
                    <strong>{log.date_key}</strong>
                    <Badge tone={log.status === "done" ? "success" : ""}>
                      {log.status}
                    </Badge>
                  </div>
                  <p>
                    {count(log.completion_count)} completions
                    {habit.daily_target_count
                      ? ` / ${habit.daily_target_count} daily target`
                      : ""}
                  </p>
                  {log.note && <p>{log.note}</p>}
                  <small>{dateTime(log.occurred_at)}</small>
                </article>
              ))
            ) : (
              <EmptyState
                title="No habit logs yet"
                description="No history has been recorded for this habit."
              />
            )}
          </>
        )
      )}
    </DetailDrawer>
  );
}
