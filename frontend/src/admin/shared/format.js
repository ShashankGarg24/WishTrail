export const dateTime = (value) =>
  value ? new Date(value).toLocaleString() : "—";
export const dateOnly = (value) =>
  value ? new Date(value).toLocaleDateString() : "—";
export const count = (value) => Number(value || 0).toLocaleString();
export const premiumState = (user) =>
  !user.premiumExpiresAt
    ? "Free"
    : new Date(user.premiumExpiresAt) > new Date()
      ? "Premium"
      : "Expired";
export const schedule = (habit) =>
  habit.daysOfWeek?.length
    ? `${habit.frequency} · ${habit.daysOfWeek.map((day) => ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"][day]).join(", ")}`
    : habit.frequency || "—";

// Export the current query page only. Prefix spreadsheet formulas to prevent execution.
export function downloadCsv(filename, columns, rows) {
  const cell = (value) => {
    const text = String(value ?? "");
    return `"${(/^[\s]*[=+@-]/.test(text) ? `'${text}` : text).replace(/"/g, '""')}"`;
  };
  const content = [
    columns.map((column) => column.label),
    ...rows.map((row) => columns.map((column) => column.value(row))),
  ];
  const url = URL.createObjectURL(
    new Blob(
      ["\uFEFF", content.map((row) => row.map(cell).join(",")).join("\r\n")],
      { type: "text/csv;charset=utf-8;" },
    ),
  );
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
