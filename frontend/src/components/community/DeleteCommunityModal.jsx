export default function DeleteCommunityModal({ open, onClose, onConfirm }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/50" onClick={() => onClose(false)} />
      <div className="relative z-10 w-full max-w-md rounded-2xl bg-white dark:bg-gray-900 p-6 shadow-xl border border-gray-200 dark:border-gray-800">
        <div className="text-lg font-semibold mb-1 text-red-600">Delete Community</div>
        <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">This will deactivate the community. Members will no longer see it. Continue?</p>
        <div className="flex justify-end gap-2">
          <button onClick={() => onClose(false)} className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-800">Cancel</button>
          <button onClick={onConfirm} className="px-3 py-2 rounded-lg bg-red-600 text-white">Delete</button>
        </div>
      </div>
    </div>
  );
}


