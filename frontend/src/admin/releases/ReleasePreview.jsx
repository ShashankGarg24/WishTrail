import { useState } from "react";
export default function ReleasePreview({ update }) {
  const [mobile, setMobile] = useState(false);
  return (
    <div>
      <div className="admin-actions">
        <button
          type="button"
          className="admin-button"
          onClick={() => setMobile(!mobile)}
        >
          {mobile ? "Web preview" : "Mobile preview"}
        </button>
        <span className="admin-muted">What’s New · plain text</span>
      </div>
      <article className={`admin-content-preview ${mobile ? "is-mobile" : ""}`}>
        <div className="admin-preview-brand">WishTrail</div>
        <h2>What’s New</h2>
        <p>
          v{update.version || "—"} · {update.type?.replace("_", " ")} ·{" "}
          {update.isMajor ? "Major" : "Minor"}
        </p>
        <h3>{update.title || "Release title"}</h3>
        <p className="admin-pre-wrap">
          {update.description || "Release description"}
        </p>
        <div className="admin-actions">
          <span className="admin-badge">Got it</span>
          <span className="admin-badge">See all updates</span>
        </div>
      </article>
    </div>
  );
}
