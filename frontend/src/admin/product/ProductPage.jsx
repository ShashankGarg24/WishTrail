import { useState } from "react";
import toast from "react-hot-toast";
import { adminAPI } from "../../services/adminApi";
import { useAdminResource } from "../shared/hooks";
import { ErrorState, Skeleton } from "../shared/States";
import ConfirmDialog from "../shared/ConfirmDialog";
import PromotionCard from "./PromotionCard";

function ProductEditor({ data, refresh }) {
  const [maintenance, setMaintenance] = useState(data.maintenance);
  const [promotion, setPromotion] = useState(data.promotion);
  const [action, setAction] = useState(null);
  const [mobile, setMobile] = useState(false);
  const edit = (key, value) =>
    setPromotion((previous) => ({ ...previous, [key]: value }));
  const save = async () => {
    if (action === "maintenance") await adminAPI.setMaintenance(maintenance);
    else await adminAPI.setPromotion(promotion);
    toast.success(
      action === "maintenance"
        ? "Maintenance setting updated"
        : "Promotion contract saved",
    );
    refresh();
  };
  return (
    <>
      <section className="admin-panel">
        <div className="admin-panel-heading">
          <h2>Maintenance mode</h2>
          <span className="admin-badge">Live runtime control</span>
        </div>
        <div className="admin-panel-body admin-form">
          <label>
            Status
            <select
              value={String(maintenance.enabled)}
              onChange={(e) =>
                setMaintenance((previous) => ({
                  ...previous,
                  enabled: e.target.value === "true",
                }))
              }
            >
              <option value="false">Off</option>
              <option value="true">On</option>
            </select>
          </label>
          <label>
            Public maintenance message
            <textarea
              maxLength={500}
              rows={3}
              value={maintenance.message}
              onChange={(e) =>
                setMaintenance((previous) => ({
                  ...previous,
                  message: e.target.value,
                }))
              }
            />
          </label>
          <p className="admin-muted">
            Enabling maintenance blocks product API requests. Admin remains
            accessible to restore service.
          </p>
          <button
            className="admin-button admin-button-primary"
            onClick={() => setAction("maintenance")}
          >
            Review maintenance change…
          </button>
        </div>
      </section>
      <section className="admin-panel">
        <div className="admin-panel-heading">
          <h2>Promotions</h2>
          <span className="admin-badge">Live Home announcement</span>
        </div>
        <div className="admin-panel-body">
          <p className="admin-notice">
            Enabled promotions appear on Home Overview for eligible users on web
            and in the app. Start is inclusive and end is exclusive (UTC).
            Updates appear on refresh or within one minute while Home is visible.
          </p>
          <div className="admin-editor-grid">
            <form
              className="admin-form"
              onSubmit={(e) => {
                e.preventDefault();
                setAction("promotion");
              }}
            >
              <label>
                Contract status
                <select
                  value={String(promotion.enabled)}
                  onChange={(e) => edit("enabled", e.target.value === "true")}
                >
                  <option value="false">Disabled</option>
                  <option value="true">Enabled</option>
                </select>
              </label>
              {[
                ["title", "Title", 120],
                ["subtitle", "Subtitle", 240],
                ["ctaLabel", "CTA label", 80],
                ["ctaUrl", "WishTrail CTA link", 500],
                ["offerCopy", "Offer / price copy", 120],
              ].map(([key, label, max]) => (
                <label key={key}>
                  {label}
                  <input
                    required={
                      promotion.enabled &&
                      ["title", "ctaLabel", "ctaUrl"].includes(key)
                    }
                    maxLength={max}
                    value={promotion[key]}
                    onChange={(e) => edit(key, e.target.value)}
                  />
                </label>
              ))}
              <div className="admin-form-grid">
                {["startAt", "endAt"].map((key) => (
                  <label key={key}>
                    {key === "startAt" ? "Starts at" : "Ends at"} (UTC)
                    <input
                      type="datetime-local"
                      value={promotion[key]?.slice(0, 16) || ""}
                      onChange={(e) =>
                        edit(
                          key,
                          e.target.value ? `${e.target.value}:00.000Z` : "",
                        )
                      }
                    />
                  </label>
                ))}
              </div>
              <label>
                Audience
                <select
                  value={promotion.audience}
                  onChange={(e) => edit("audience", e.target.value)}
                >
                  <option value="all">All</option>
                  <option value="free">Free accounts</option>
                  <option value="premium">Premium accounts</option>
                </select>
              </label>
              <label>
                Predefined surface
                <select value={promotion.surface} disabled>
                  <option value="announcement_card">Announcement card</option>
                </select>
              </label>
              <button
                className="admin-button admin-button-primary"
                type="submit"
              >
                Review promotion contract…
              </button>
            </form>
            <div>
              <button
                className="admin-button"
                onClick={() => setMobile(!mobile)}
              >
                {mobile ? "Web preview" : "Mobile preview"}
              </button>
              <div
                className={`admin-content-preview ${mobile ? "is-mobile" : ""}`}
              >
                <PromotionCard promotion={promotion} />
              </div>
              <p className="admin-muted">
                Both previews use the same predefined card component.
              </p>
            </div>
          </div>
        </div>
      </section>
      <section className="admin-panel">
        <div className="admin-panel-heading">
          <h2>Deployment required</h2>
        </div>
        <div className="admin-panel-body">
          <p className="admin-muted">
            These settings have no supported runtime write path or consumer.
            Change them through a reviewed deployment.
          </p>
          <ul>
            {data.deploymentRequired.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p>Arbitrary HTML, CSS and JavaScript editing is unavailable.</p>
        </div>
      </section>
      {action && (
        <ConfirmDialog
          title={
            action === "maintenance"
              ? "Apply maintenance change?"
              : "Save promotion contract?"
          }
          description={
            action === "maintenance"
              ? `${maintenance.enabled ? "Enable" : "Disable"} maintenance mode for the product? Message: ${maintenance.message || "System maintenance in progress"}`
              : "Save this promotion for eligible Home Overview users?"
          }
          confirmLabel="Apply change"
          danger={action === "maintenance" && maintenance.enabled}
          onConfirm={save}
          onClose={() => setAction(null)}
        />
      )}
    </>
  );
}
export default function ProductPage() {
  const resource = useAdminResource(() => adminAPI.getProductControl());
  return (
    <div>
      <div className="admin-page-heading">
        <div>
          <div className="admin-kicker">Product</div>
          <h1>Product Control</h1>
          <p>Supported operations and predefined promotion content.</p>
        </div>
      </div>
      {resource.loading ? (
        <Skeleton rows={5} />
      ) : resource.error ? (
        <ErrorState message={resource.error} retry={resource.refresh} />
      ) : (
        <ProductEditor data={resource.data} refresh={resource.refresh} />
      )}
    </div>
  );
}
