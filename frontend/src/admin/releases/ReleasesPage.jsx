import { useState } from "react";
import { Link } from "react-router-dom";
import toast from "react-hot-toast";
import { adminAPI } from "../../services/adminApi";
import { adminPath } from "../config";
import { useAdminResource, useDebounce } from "../shared/hooks";
import AdminTable from "../shared/AdminTable";
import Pagination from "../shared/Pagination";
import ConfirmDialog from "../shared/ConfirmDialog";
import ReleasePreview from "./ReleasePreview";

const blank = {
  version: "",
  title: "",
  type: "feature",
  isMajor: true,
  description: "",
};
export default function ReleasesPage() {
  const [form, setForm] = useState(blank);
  const [editing, setEditing] = useState(null);
  const [search, setSearch] = useState("");
  const debounced = useDebounce(search);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [sort, setSort] = useState({ sortBy: "createdAt", sortOrder: "desc" });
  const [deleting, setDeleting] = useState(null);
  const [publishing, setPublishing] = useState(false);
  const [saved, setSaved] = useState(null);
  const [error, setError] = useState("");
  const list = useAdminResource(
    () =>
      adminAPI.getProductUpdates({ search: debounced, page, limit, ...sort }),
    JSON.stringify([debounced, page, limit, sort]),
  );
  const change = (key, value) => {
    setForm((previous) => ({ ...previous, [key]: value }));
    setSaved(null);
  };
  const save = async () => {
    setError("");
    try {
      const response = editing
        ? await adminAPI.updateProductUpdate(editing, form)
        : await adminAPI.createProductUpdate(form);
      setSaved(response.data.data.update);
      setEditing(null);
      setForm(blank);
      list.refresh();
      toast.success("Release published to What’s New");
    } catch (err) {
      setError(err.response?.data?.message || "Unable to publish release");
      throw err;
    }
  };
  const edit = (row) => {
    setForm({
      version: row.version,
      title: row.title,
      type: row.type,
      isMajor: row.isMajor,
      description: row.description,
    });
    setEditing(row.version);
    setSaved(null);
    setError("");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const columns = [
    { key: "version", label: "Version", sortable: true },
    { key: "title", label: "Title", sortable: true },
    {
      key: "type",
      label: "Type",
      sortable: true,
      render: (row) => row.type.replace("_", " "),
    },
    {
      key: "isMajor",
      label: "Scope",
      render: (row) => (row.isMajor ? "Major" : "Minor"),
    },
    {
      key: "createdAt",
      label: "Published",
      sortable: true,
      render: (row) => new Date(row.createdAt).toLocaleDateString(),
    },
    {
      key: "actions",
      label: "Actions",
      render: (row) => (
          <div className="admin-actions admin-row-actions">
          <button className="admin-button" onClick={() => edit(row)}>
            Edit / preview
          </button>
          <Link
            className="admin-link"
            to={`${adminPath("campaigns")}?release=${encodeURIComponent(row.version)}`}
          >
            Campaign
          </Link>
          <button
            className="admin-button admin-button-danger"
            onClick={() => setDeleting(row)}
          >
            Delete
          </button>
        </div>
      ),
    },
  ];
  return (
    <div>
      <div className="admin-page-heading">
        <div>
          <div className="admin-kicker">Product</div>
          <h1>Releases</h1>
          <p>Publish clear product updates to What’s New.</p>
        </div>
      </div>
      <p className="admin-notice">
        Saving publishes immediately. Major releases are eligible for the
        existing What’s New prompt, subject to its version rules. Draft status
        is unavailable in the current schema.
      </p>
      {saved && (
        <div className="admin-notice" role="status">
          Published v{saved.version}.{" "}
          <a
            className="admin-link"
            href="/whats-new"
            target="_blank"
            rel="noreferrer"
          >
            Open What’s New
          </a>{" "}
          ·{" "}
          <Link
            className="admin-link"
            to={`${adminPath("campaigns")}?release=${encodeURIComponent(saved.version)}`}
          >
            Create a campaign from this release
          </Link>
        </div>
      )}
      <div className="admin-editor-grid">
        <section className="admin-panel">
          <div className="admin-panel-heading">
            <h2>{editing ? `Edit v${editing}` : "New release"}</h2>
          </div>
          <form
            className="admin-panel-body admin-form"
            onSubmit={(event) => {
              event.preventDefault();
              setPublishing(true);
            }}
          >
            <label>
              Version
              <input
                required
                maxLength={50}
                pattern="[A-Za-z0-9][A-Za-z0-9._+\-]*"
                value={form.version}
                onChange={(e) => change("version", e.target.value)}
              />
            </label>
            <label>
              Title
              <input
                required
                maxLength={255}
                value={form.title}
                onChange={(e) => change("title", e.target.value)}
              />
            </label>
            <div className="admin-form-grid">
              <label>
                Type
                <select
                  value={form.type}
                  onChange={(e) => change("type", e.target.value)}
                >
                  <option value="feature">Feature</option>
                  <option value="enhancement">Enhancement</option>
                  <option value="bug_fix">Bug fix</option>
                </select>
              </label>
              <label>
                Scope
                <select
                  value={String(form.isMajor)}
                  onChange={(e) => change("isMajor", e.target.value === "true")}
                >
                  <option value="true">Major</option>
                  <option value="false">Minor</option>
                </select>
              </label>
            </div>
            <label>
              Description
              <textarea
                rows={10}
                required
                maxLength={20000}
                value={form.description}
                onChange={(e) => change("description", e.target.value)}
              />
            </label>
            <button
              type="button"
              className="admin-button"
              onClick={() =>
                change(
                  "description",
                  "What’s new\n\n• Describe the most valuable improvement.\n\nImprovements\n\n• Describe a usability or performance improvement.\n\nBug fixes\n\n• Describe a meaningful fix.",
                )
              }
            >
              Use copy template
            </button>
            {error && (
              <p className="admin-error-text" role="alert">
                {error}
              </p>
            )}
            <div className="admin-actions">
              <button
                className="admin-button admin-button-primary"
                type="submit"
              >
                {editing ? "Review update…" : "Review publication…"}
              </button>
              {editing && (
                <button
                  type="button"
                  className="admin-button"
                  onClick={() => {
                    setEditing(null);
                    setForm(blank);
                    setError("");
                  }}
                >
                  Cancel editing
                </button>
              )}
            </div>
          </form>
        </section>
        <section className="admin-panel">
          <div className="admin-panel-heading">
            <h2>Preview</h2>
          </div>
          <div className="admin-panel-body">
            <ReleasePreview update={form} />
          </div>
        </section>
      </div>
      <section className="admin-panel">
        <div className="admin-filters">
          <label className="admin-search">
            Search releases
            <input
              aria-label="Search releases"
              placeholder="Title, version or description"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </label>
        </div>
        <AdminTable
          columns={columns}
          rows={list.data?.updates || []}
          loading={list.loading || search !== debounced}
          error={list.error}
          retry={list.refresh}
          sortBy={sort.sortBy}
          sortOrder={sort.sortOrder}
          onSort={(key) => {
            setSort((previous) => ({
              sortBy: key,
              sortOrder:
                previous.sortBy === key && previous.sortOrder === "asc"
                  ? "desc"
                  : "asc",
            }));
            setPage(1);
          }}
          label="Releases"
        />
        <Pagination
          pagination={list.data?.pagination}
          onPageChange={setPage}
          onLimitChange={(value) => {
            setLimit(value);
            setPage(1);
          }}
        />
      </section>
      {publishing && (
        <ConfirmDialog
          title={editing ? "Publish release changes?" : "Publish this release?"}
          description={`Version ${form.version} will be visible in What’s New immediately.`}
          confirmLabel="Publish"
          onConfirm={save}
          onClose={() => setPublishing(false)}
        >
          <ReleasePreview update={form} />
        </ConfirmDialog>
      )}
      {deleting && (
        <ConfirmDialog
          title="Delete release?"
          description={`Remove v${deleting.version} from What’s New? This cannot be undone.`}
          danger
          confirmLabel="Delete release"
          onClose={() => setDeleting(null)}
          onConfirm={async () => {
            await adminAPI.deleteProductUpdate(deleting.version);
            if (editing === deleting.version) {
              setEditing(null);
              setForm(blank);
            }
            if (list.data?.updates.length === 1 && page > 1) setPage(page - 1);
            else list.refresh();
            toast.success("Release deleted");
          }}
        />
      )}
    </div>
  );
}
