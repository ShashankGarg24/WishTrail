import { Search } from "lucide-react";
export default function FilterBar({ search, onSearch, placeholder, children }) {
  return (
    <div className="admin-filters">
      <label className="admin-search">
        <Search size={17} aria-hidden="true" />
        <input
          aria-label={placeholder || "Search"}
          placeholder={placeholder || "Search"}
          value={search}
          onChange={(event) => onSearch(event.target.value)}
        />
      </label>
      {children}
    </div>
  );
}
