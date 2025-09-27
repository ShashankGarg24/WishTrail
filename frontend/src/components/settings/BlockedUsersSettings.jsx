import { useState } from "react";

export default function BlockedUsers() {
  const [blocked, setBlocked] = useState(["@toxic_user", "@spammer"]);

  const unblockUser = (user) => {
    setBlocked(blocked.filter((u) => u !== user));
    // 🔄 API call to unblock
  };

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900 dark:text-white">Blocked Users</h3>
      {blocked.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">No blocked users.</p>
      ) : (
        <ul className="space-y-2">
          {blocked.map((user) => (
            <li
              key={user}
              className="flex justify-between items-center bg-gray-50 dark:bg-gray-700/50 p-3 rounded-md"
            >
              <span>{user}</span>
              <button
                onClick={() => unblockUser(user)}
                className="text-sm text-red-600 hover:underline"
              >
                Unblock
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
