import { useState } from "react";

export default function NotificationsSettings() {
  const [email, setEmail] = useState(true);
  const [push, setPush] = useState(false);

  return (
    <div className="space-y-6">
      <h3 className="text-lg font-medium text-gray-900 dark:text-white">Notifications</h3>
      <div className="space-y-4">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={email}
            onChange={() => setEmail(!email)}
            className="h-4 w-4"
          />
          Email notifications
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={push}
            onChange={() => setPush(!push)}
            className="h-4 w-4"
          />
          Push notifications
        </label>
      </div>
    </div>
  );
}
