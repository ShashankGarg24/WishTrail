import { useEffect, useState } from "react";
import { Link, useOutletContext, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import { adminAPI } from "../../services/adminApi";
import { adminPath } from "../config";
import ConfirmDialog from "../shared/ConfirmDialog";
import { ErrorState } from "../shared/States";
import { EMAIL_PRESETS } from "./presets";
import { useAdminResource } from "../shared/hooks";

const steps = ["Audience", "Content", "Preview", "Review", "Send"];
const labels = {
  selected: "Selected users",
  all: "All active users",
  inactive: "Inactive users",
  noGoals: "Active users with no goals",
};
export default function CampaignsPage() {
  const { selectedUsers } = useOutletContext();
  const [params] = useSearchParams();
  const release = params.get("release") || "";
  const [form, setForm] = useState({
    mode: "selected",
    inactiveDays: 30,
    ...EMAIL_PRESETS.custom,
    ending: "",
    ctaLabel: "Open WishTrail",
    ctaUrl: "https://wishtrail.in/dashboard",
    linkedReleaseVersion: "",
  });
  const [step, setStep] = useState(0);
  const [review, setReview] = useState(null);
  const [result, setResult] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirm, setConfirm] = useState(false);
  const options = useAdminResource(() => adminAPI.campaignOptions());
  const [preset, setPreset] = useState("custom");
  const [mobile, setMobile] = useState(false);
  const payload = { ...form, userIds: selectedUsers };
  useEffect(() => {
    let active = true;
    if (release)
      adminAPI
        .getRelease(release)
        .then((res) => {
          if (!active) return;
          const update = res.data.data.update;
          setForm((previous) => ({
            ...previous,
            subject: `New in WishTrail: ${update.title}`,
            title: update.title,
            subtitle: `Version ${update.version} is now available.`,
            body: update.description,
            linkedReleaseVersion: update.version,
            ctaLabel: "View release notes",
            ctaUrl: "https://wishtrail.in/whats-new",
          }));
          setStep(0);
          setReview(null);
          setResult(null);
          setError("");
        })
        .catch((err) => {
          if (active)
            setError(
              err.response?.data?.message || "Could not load linked release",
            );
        });
    return () => {
      active = false;
    };
  }, [release]);
  const edit = (key, value) => {
    setForm((previous) => ({ ...previous, [key]: value }));
    setReview(null);
    setResult(null);
  };
  const prepare = async (nextStep) => {
    setBusy(true);
    setError("");
    try {
      const res = await adminAPI.reviewCampaign(payload);
      setReview(res.data.data);
      setStep(nextStep);
    } catch (err) {
      setError(err.response?.data?.message || "Unable to review campaign");
    } finally {
      setBusy(false);
    }
  };
  const test = async () => {
    setBusy(true);
    setError("");
    try {
      const res = await adminAPI.testCampaign(payload);
      toast.success(`Test sent to ${res.data.data.to}`);
    } catch (err) {
      const message = err.response?.data?.message || "Test delivery failed";
      setError(message);
      toast.error(message);
    } finally {
      setBusy(false);
    }
  };
  const send = async () => {
    try {
      const res = await adminAPI.sendCampaign({
        ...payload,
        confirmed: true,
        reviewToken: review.reviewToken,
      });
      setResult(res.data.data);
      setStep(4);
      setReview(null);
      toast.success("Campaign operation completed");
    } catch (err) {
      setConfirm(false);
      setReview(null);
      setStep(2);
      setError(
        err.response?.data?.message ||
          "Send result could not be confirmed. Some messages may already have been sent. Review before retrying.",
      );
      throw err;
    }
  };
  const field = (key, label, max, area = false) => (
    <label key={key}>
      {label}
      {area ? (
        <textarea
          rows={key === "body" ? 9 : 3}
          maxLength={max}
          value={form[key]}
          onChange={(e) => edit(key, e.target.value)}
        />
      ) : (
        <input
          maxLength={max}
          value={form[key]}
          onChange={(e) => edit(key, e.target.value)}
        />
      )}
    </label>
  );
  return (
    <div>
      <div className="admin-page-heading">
        <div>
          <div className="admin-kicker">Engagement</div>
          <h1>Campaigns</h1>
          <p>A reviewed message, sent to the right audience.</p>
        </div>
      </div>
      <ol className="admin-steps" aria-label="Campaign progress">
        {steps.map((label, index) => (
          <li key={label} aria-current={step === index ? "step" : undefined}>
            <span>{index + 1}</span>
            {label}
          </li>
        ))}
      </ol>
      {error && <ErrorState message={error} retry={() => setError("")} />}
      {options.error && (
        <ErrorState message={options.error} retry={options.refresh} />
      )}
      <section className="admin-panel">
        <div className="admin-panel-heading">
          <h2>{steps[step]}</h2>
        </div>
        <div className="admin-panel-body admin-form">
          {step === 0 && (
            <>
              <label>
                Audience
                <select
                  value={form.mode}
                  onChange={(e) => edit("mode", e.target.value)}
                >
                  {Object.entries(labels).map(([value, label]) => (
                    <option value={value} key={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </label>
              {form.mode === "selected" && (
                <p>
                  {selectedUsers.length} users selected.{" "}
                  <Link className="admin-link" to={adminPath("users")}>
                    Choose users
                  </Link>
                </p>
              )}
              {form.mode === "inactive" && (
                <label>
                  Inactive more than (days)
                  <input
                    type="number"
                    min="1"
                    max="36500"
                    value={form.inactiveDays}
                    onChange={(e) =>
                      edit("inactiveDays", Number(e.target.value))
                    }
                  />
                </label>
              )}
              <p className="admin-notice">
                Deactivated accounts and users who disabled email notifications
                are excluded. Missing email preferences use the product default:
                enabled.
              </p>
              <button
                className="admin-button admin-button-primary"
                disabled={form.mode === "selected" && !selectedUsers.length}
                onClick={() => setStep(1)}
              >
                Continue to content
              </button>
            </>
          )}
          {step === 1 && (
            <>
              <label>
                Writing preset
                <select
                  value={preset}
                  onChange={(e) => {
                    const value = e.target.value;
                    setPreset(value);
                    setForm((previous) => ({
                      ...previous,
                      ...EMAIL_PRESETS[value],
                      linkedReleaseVersion: "",
                    }));
                    setReview(null);
                  }}
                >
                  {Object.keys(EMAIL_PRESETS).map((key) => (
                    <option key={key} value={key}>
                      {
                        {
                          custom: "Custom",
                          inactivity: "Inactivity",
                          noGoals: "First goal",
                          comeback: "Comeback",
                          featureRelease: "Feature release",
                          motivation: "Motivation",
                          feedback: "Feedback",
                        }[key]
                      }
                    </option>
                  ))}
                </select>
              </label>
              <p className="admin-muted">
                Presets change the copy. Audience targeting stays as selected.
              </p>
              {field("subject", "Subject", 180)}
              {field("title", "Title", 180)}
              {field("subtitle", "Subtitle", 220)}
              {field("body", "Message", 5000, true)}
              {field("ending", "Ending", 500, true)}
              <div className="admin-form-grid">
                {field("ctaLabel", "CTA label", 80)}
                {field("ctaUrl", "WishTrail CTA URL", 500)}
              </div>
              {field(
                "linkedReleaseVersion",
                "Linked release version (optional)",
                50,
              )}
              <div className="admin-actions">
                <button className="admin-button" onClick={() => setStep(0)}>
                  Back
                </button>
                <button
                  className="admin-button admin-button-primary"
                  disabled={busy}
                  onClick={() => prepare(2)}
                >
                  {busy ? "Preparing…" : "Preview message"}
                </button>
              </div>
            </>
          )}
          {step === 2 && (
            <>
              <div className="admin-actions">
                <button
                  className="admin-button"
                  onClick={() => setMobile(!mobile)}
                >
                  {mobile ? "Web preview" : "Mobile preview"}
                </button>
                <button
                  className="admin-button"
                  disabled={
                    busy || options.loading || !options.data?.testAddress
                  }
                  onClick={test}
                >
                  Send test
                  {options.loading
                    ? " (loading address…)"
                    : options.data?.testAddress
                      ? ` to ${options.data.testAddress}`
                      : " (address not configured)"}
                </button>
              </div>
              {review ? (
                <iframe
                  className={`admin-email-preview ${mobile ? "is-mobile" : ""}`}
                  title="Campaign email preview"
                  sandbox=""
                  srcDoc={review.previewHtml}
                />
              ) : (
                <p>
                  Review expired or changed. Generate a fresh review to
                  continue.
                </p>
              )}
              <p className="admin-muted">
                Preview uses the email template with a sample greeting. Each
                recipient receives their own greeting.
              </p>
              <div className="admin-actions">
                <button className="admin-button" onClick={() => setStep(1)}>
                  Edit content
                </button>
                <button
                  className="admin-button admin-button-primary"
                  disabled={busy}
                  onClick={() => prepare(3)}
                >
                  {busy ? "Checking audience…" : "Review audience and send"}
                </button>
              </div>
            </>
          )}
          {step === 3 && review && (
            <>
              <dl className="admin-details">
                <div>
                  <dt>Audience</dt>
                  <dd>
                    {labels[form.mode]}
                    {form.mode === "inactive"
                      ? ` · over ${form.inactiveDays} days`
                      : ""}
                  </dd>
                </div>
                <div>
                  <dt>Estimated recipients</dt>
                  <dd>
                    {review.estimatedRecipients} of {review.matched} active
                    matches
                  </dd>
                </div>
                <div>
                  <dt>Exclusions</dt>
                  <dd>
                    {review.excludedOptOut} opted out ·{" "}
                    {review.excludedInvalidEmail} invalid email ·{" "}
                    {review.excludedInactiveOrMissing || 0} inactive / missing
                    selected accounts
                  </dd>
                </div>
                <div>
                  <dt>Subject</dt>
                  <dd>{review.content.subject}</dd>
                </div>
                <div>
                  <dt>CTA</dt>
                  <dd>
                    {review.content.ctaLabel} · {review.content.ctaUrl}
                  </dd>
                </div>
                <div>
                  <dt>Linked release</dt>
                  <dd>{review.content.linkedReleaseVersion || "None"}</dd>
                </div>
              </dl>
              <p className="admin-notice">
                Review expires after 10 minutes. Changed audiences require
                another review. Keep this page open during sending. Large sends
                run in this API process and may exceed hosting time limits.
              </p>
              <div className="admin-actions">
                <button className="admin-button" onClick={() => setStep(2)}>
                  Back to preview
                </button>
                <button
                  className="admin-button admin-button-primary"
                  disabled={!review.estimatedRecipients}
                  onClick={() => setConfirm(true)}
                >
                  Confirm and send…
                </button>
              </div>
            </>
          )}
          {step === 4 && result && (
            <div role="status">
              <h3>
                {result.sent} sent · {result.failed} failed
              </h3>
              <p>
                {result.attempted} attempted of {result.requested} reviewed
                recipients. {result.skippedSinceReview || 0} skipped after an
                account/preference change.
              </p>
              {result.failures?.length > 0 && (
                <ul>
                  {result.failures.map((item) => (
                    <li key={item.userId}>
                      User {item.userId}: {item.message}
                    </li>
                  ))}
                </ul>
              )}
              <p className="admin-muted">
                Results are available for this operation only. A new send can
                deliver duplicates to users who already received this message.
              </p>
              <button
                className="admin-button"
                onClick={() => {
                  setStep(0);
                  setResult(null);
                }}
              >
                Start another campaign
              </button>
            </div>
          )}
        </div>
      </section>
      {confirm && (
        <ConfirmDialog
          title="Send this campaign?"
          description={`Send “${review?.content.subject}” to approximately ${review?.estimatedRecipients} recipients? This cannot be undone.`}
          confirmLabel="Send campaign"
          onClose={() => setConfirm(false)}
          onConfirm={send}
        />
      )}
    </div>
  );
}
