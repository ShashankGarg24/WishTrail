import { useState, useEffect } from "react";
import { settingsAPI } from "../../services/api";
import { AlertCircle, CheckCircle } from "lucide-react";

export default function BlockedUsers() {
  const [blocked, setBlocked] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    fetchBlockedUsers();
  }, []);

  const fetchBlockedUsers = async () => {
    try {
      const response = await settingsAPI.getBlockedUsers({ page: 1, limit: 50 });
      setBlocked(response.data.data.users || []);
    } catch (error) {
      console.error('Failed to fetch blocked users:', error);
    } finally {
      setLoading(false);
    }
  };

  const unblockUser = async (username) => {
    setError("");
    setSuccess("");
    try {
      await settingsAPI.unblockUser(username);
      setBlocked(blocked.filter((u) => u.username !== username));
      setSuccess('User unblocked successfully');
    } catch (error) {
      console.error('Failed to unblock user:', error);
      setError(error.response?.data?.message || 'Failed to unblock user');
    }
  };

  if (loading) {
    return <div className="text-center py-4">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900 dark:text-white">Blocked Users</h3>
      
      {/* Error Message */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-800 dark:text-red-200">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg text-green-800 dark:text-green-200">
          <CheckCircle className="h-5 w-5 flex-shrink-0" />
          <p className="text-sm">{success}</p>
        </div>
      )}

      {blocked.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">No blocked users.</p>
      ) : (
        <ul className="space-y-2">
          {blocked.map((user) => (
            <li
              key={user.id}
              className="flex justify-between items-center bg-gray-50 dark:bg-gray-700/50 p-3 rounded-md"
            >
              <div className="flex items-center gap-3">
                <img src={user.avatar || '/api/placeholder/40/40'} alt={user.name} className="w-10 h-10 rounded-full" />
                <div>
                  <div className="font-medium text-gray-900 dark:text-white">{user.name}</div>
                  <div className="text-sm text-gray-500 dark:text-gray-400">@{user.username}</div>
                </div>
              </div>
              <button
                onClick={() => unblockUser(user.username)}
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
