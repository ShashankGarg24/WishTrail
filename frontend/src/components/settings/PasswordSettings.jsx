import { useState } from "react";

export default function PasswordSettings() {
  const [current, setCurrent] = useState("");
  const [newPass, setNewPass] = useState("");

  const handleSubmit = (e) => {
    e.preventDefault();
    // 🔄 Call API to update password
    alert("Password updated!");
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6 max-w-md">
      <h3 className="text-lg font-medium text-gray-900 dark:text-white">Change Password</h3>
      <div>
        <label className="block text-sm font-medium mb-1">Current Password</label>
        <input
          type="password"
          value={current}
          onChange={(e) => setCurrent(e.target.value)}
          className="w-full px-3 py-2 border rounded-md bg-gray-50 dark:bg-gray-700"
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1">New Password</label>
        <input
          type="password"
          value={newPass}
          onChange={(e) => setNewPass(e.target.value)}
          className="w-full px-3 py-2 border rounded-md bg-gray-50 dark:bg-gray-700"
        />
      </div>
      <button
        type="submit"
        className="px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700"
      >
        Update Password
      </button>
    </form>
  );
}
