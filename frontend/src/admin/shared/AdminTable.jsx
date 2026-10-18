import { ArrowDown, ArrowUp } from "lucide-react";
import { EmptyState, ErrorState, Skeleton } from "./States";
export default function AdminTable({
  columns,
  rows = [],
  rowKey = "id",
  loading,
  error,
  retry,
  sortBy,
  sortOrder,
  onSort,
  label = "Records",
}) {
  if (loading) return <Skeleton />;
  if (error) return <ErrorState message={error} retry={retry} />;
  if (!rows.length) return <EmptyState />;
  return (
    <div className="admin-table-scroll">
      <table className="admin-table" aria-label={label}>
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                aria-sort={
                  column.sortable && sortBy === column.key
                    ? sortOrder === "asc"
                      ? "ascending"
                      : "descending"
                    : undefined
                }
              >
                {column.sortable ? (
                  <button onClick={() => onSort(column.key)}>
                    {column.label}
                    {sortBy === column.key &&
                      (sortOrder === "asc" ? (
                        <ArrowUp size={13} />
                      ) : (
                        <ArrowDown size={13} />
                      ))}
                  </button>
                ) : (
                  column.label
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row[rowKey]}>
              {columns.map((column) => (
                <td key={column.key}>
                  {column.render
                    ? column.render(row)
                    : (row[column.key] ?? "—")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
