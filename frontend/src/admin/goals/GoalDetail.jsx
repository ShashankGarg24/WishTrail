import { Link } from "react-router-dom";
import { adminAPI } from "../../services/adminApi";
import { useAdminResource } from "../shared/hooks";
import { adminPath } from "../config";
import { dateTime, count } from "../shared/format";
import {
  Badge,
  Details,
  EmptyState,
  ErrorState,
  Skeleton,
} from "../shared/States";
import DetailDrawer from "../shared/DetailDrawer";

export default function GoalDetail({ id, onClose }) {
  const resource = useAdminResource(() => adminAPI.getGoal(id), id);
  const goal = resource.data?.goal;
  const progress = resource.data?.progress;
  return (
    <DetailDrawer title="Goal details" onClose={onClose}>
      {resource.loading ? (
        <Skeleton />
      ) : resource.error ? (
        <ErrorState message={resource.error} retry={resource.refresh} />
      ) : (
        goal && (
          <>
            <h2>{goal.title}</h2>
            <div className="admin-actions mt-3">
              <Badge tone={goal.completed_at ? "success" : "blue"}>
                {goal.completed_at ? "Completed" : "Active"}
              </Badge>
              <Badge>{goal.is_public ? "Public" : "Private"}</Badge>
              <Link
                className="admin-link"
                to={`${adminPath("users")}?user=${goal.user_id}`}
              >
                Open @{goal.owner_username}
              </Link>
            </div>
            <Details
              items={[
                ["Goal ID", goal.id],
                ["Category", goal.category],
                ["Year", goal.year],
                ["Created", dateTime(goal.created_at)],
                ["Target date", dateTime(goal.target_date)],
                ["Completed", dateTime(goal.completed_at)],
                ["Last metadata change", dateTime(goal.updated_at)],
                [
                  "Updates visibility",
                  goal.is_updates_public ? "Public" : "Private",
                ],
                ["Total updates", count(goal.update_count)],
              ]}
            />
            {resource.data.details?.description && (
              <p className="whitespace-pre-wrap">
                {resource.data.details.description}
              </p>
            )}
            <h3 className="admin-section-title">Progress breakdown</h3>
            {progress ? (
              <>
                <div className="admin-actions">
                  <strong>{progress.percent}%</strong>
                  <span className="admin-muted text-xs">
                    Calculated using the existing goal progress rules
                  </span>
                </div>
                <progress
                  className="w-full mt-3 accent-[#4c99e6]"
                  max="100"
                  value={progress.percent}
                  aria-label="Goal progress"
                />
                {progress.breakdown.subGoals.map((item, index) => (
                  <div className="admin-record" key={index}>
                    <div className="admin-actions">
                      <Badge tone={item.completed ? "success" : ""}>
                        {item.completed ? "Complete" : "Pending"}
                      </Badge>
                      <strong>{item.title || "Linked goal"}</strong>
                    </div>
                    <small>
                      Weight {Number(item.weight).toFixed(1)}% · Contribution{" "}
                      {Number(item.contribution).toFixed(1)}%
                    </small>
                    {item.linkedGoalId && (
                      <Link
                        className="admin-link"
                        to={`${adminPath("goals")}?detail=${item.linkedGoalId}`}
                      >
                        Inspect linked goal
                      </Link>
                    )}
                  </div>
                ))}
                {progress.breakdown.habits.map((item) => (
                  <div className="admin-record" key={item.habitId}>
                    <Link
                      className="admin-link"
                      to={`${adminPath("habits")}?detail=${item.habitId}`}
                    >
                      Inspect habit #{item.habitId}
                    </Link>
                    <small>
                      {item.doneCount} / {item.targetCount} target days · Weight{" "}
                      {Number(item.weight).toFixed(1)}% · Contribution{" "}
                      {Number(item.contribution).toFixed(1)}%
                    </small>
                  </div>
                ))}
                {!progress.breakdown.subGoals.length &&
                  !progress.breakdown.habits.length && (
                    <p className="admin-muted text-xs mt-3">
                      {goal.completed_at
                        ? "This goal is completed."
                        : "No weighted subgoals or habits are available."}
                    </p>
                  )}
              </>
            ) : (
              <p className="admin-notice">
                Weighted progress could not be calculated from the existing
                records. Completion state and recent updates are still
                available.
              </p>
            )}
            {resource.data.details?.completionNote && (
              <div className="admin-record">
                <h3>Completion note</h3>
                <p>{resource.data.details.completionNote}</p>
              </div>
            )}
            <h3 className="admin-section-title">Recent progress</h3>
            {resource.data.recentUpdates.length ? (
              resource.data.recentUpdates.map((update) => (
                <article key={update.id} className="admin-record">
                  <small>
                    {update.dateKey} · {dateTime(update.createdAt)}
                  </small>
                  <p>{update.text || "Progress recorded"}</p>
                  {update.emotion && <Badge>{update.emotion}</Badge>}
                </article>
              ))
            ) : (
              <EmptyState
                title="No progress updates yet"
                description="This goal has no recorded updates."
              />
            )}
            {resource.data.hasMoreUpdates && (
              <p className="admin-muted text-xs">
                Showing the latest 20 updates.
              </p>
            )}
          </>
        )
      )}
    </DetailDrawer>
  );
}
