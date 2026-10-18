import { ChevronLeft, ChevronRight } from "lucide-react";
import { count } from "./format";
export default function Pagination({
  pagination = {},
  onPageChange,
  onLimitChange,
}) {
  const { page = 1, pages = 1, total = 0, limit = 20 } = pagination;
  return (
    <div className="admin-pagination">
      <span>
        {count(total)} records · Page {page} of {pages || 1}
      </span>
      <div>
        {onLimitChange && (
          <select
            aria-label="Rows per page"
            value={limit}
            onChange={(event) => onLimitChange(Number(event.target.value))}
          >
            {[20, 50, 100].map((size) => (
              <option key={size} value={size}>
                {size} / page
              </option>
            ))}
          </select>
        )}
        <button
          className="admin-button"
          aria-label="Previous page"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          <ChevronLeft size={16} />
        </button>
        <button
          className="admin-button"
          aria-label="Next page"
          disabled={page >= pages}
          onClick={() => onPageChange(page + 1)}
        >
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
