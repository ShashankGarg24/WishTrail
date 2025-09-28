import { communityUploadAPI, communitiesAPI } from '../../services/api'
import InterestsMultiSelect from './InterestsMultiSelect'

export default function CommunitySettings({ community, role, showDeleteModal, setShowDeleteModal, DeleteModal }) {
  if (role !== 'admin') {
    return <div className="text-sm text-gray-500">Settings are visible to admins only.</div>
  }
  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-800 p-0 bg-white dark:bg-gray-900 overflow-hidden">
      <div>
        <details open>
          <summary className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 font-semibold cursor-pointer">Community Profile</summary>
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium mb-1">Name</label>
              <input defaultValue={community.name || ''} onBlur={async (e) => { await communitiesAPI.update(community._id, { name: e.target.value }); }} className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Visibility</label>
              <select defaultValue={community.visibility || 'public'} onChange={async (e) => { await communitiesAPI.update(community._id, { visibility: e.target.value }); }} className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
                <option value="public">Public</option>
                <option value="private">Private</option>
                <option value="invite-only">Invite-only</option>
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium mb-1">Description</label>
              <textarea defaultValue={community.description || ''} onBlur={async (e) => { await communitiesAPI.update(community._id, { description: e.target.value }); }} rows={3} className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900" />
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Avatar</label>
              <div className="flex items-center gap-3">
                <img src={community.avatarUrl || '/api/placeholder/64/64'} alt="Avatar" className="h-10 w-10 rounded-full border" />
                <input type="file" accept="image/*" onChange={async (e) => {
                  const file = e.target.files?.[0]; if (!file) return;
                  const fd = new FormData(); fd.append('image', file);
                  const resp = await communityUploadAPI.uploadAvatar(community._id, fd);
                  const url = resp?.data?.data?.url; if (url) { await communitiesAPI.update(community._id, { avatarUrl: url }); window.location.reload(); }
                }} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Banner</label>
              <div className="flex items-center gap-3">
                <div className="h-10 w-20 rounded bg-gray-200 dark:bg-gray-800 overflow-hidden">
                  {community.bannerUrl && <img src={community.bannerUrl} alt="Banner" className="h-full w-full object-cover" />}
                </div>
                <input type="file" accept="image/*" onChange={async (e) => {
                  const file = e.target.files?.[0]; if (!file) return;
                  const fd = new FormData(); fd.append('image', file);
                  const resp = await communityUploadAPI.uploadBanner(community._id, fd);
                  const url = resp?.data?.data?.url; if (url) { await communitiesAPI.update(community._id, { bannerUrl: url }); window.location.reload(); }
                }} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1">Members (1-100)</label>
              <input type="number" min={1} max={100} defaultValue={community.settings?.memberLimit || 1} onBlur={async (e) => { const memberLimit = Math.max(1, Math.min(100, parseInt(e.target.value||'1'))); await communitiesAPI.update(community._id, { memberLimit }); }} className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900" />
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium mb-1">Interests</label>
              <InterestsMultiSelect community={community} />
            </div>
          </div>
        </details>

        <details open>
          <summary className="px-4 py-3 border-y border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 font-semibold cursor-pointer">Permissions</summary>
          <div className="p-4 grid grid-cols-1 gap-3">
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" defaultChecked={community.settings?.onlyAdminsCanAddGoals !== false} onChange={async (e) => { await communitiesAPI.update(community._id, { onlyAdminsCanAddGoals: e.target.checked }); }} />
              Only admins can add goals (others can suggest)
            </label>
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" defaultChecked={community.settings?.onlyAdminsCanAddHabits !== false} onChange={async (e) => { await communitiesAPI.update(community._id, { onlyAdminsCanAddHabits: e.target.checked }); }} />
              Only admins can add habits (others can suggest)
            </label>
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" defaultChecked={community.settings?.onlyAdminsCanChangeImages !== false} onChange={async (e) => { await communitiesAPI.update(community._id, { onlyAdminsCanChangeImages: e.target.checked }); }} />
              Only admins can change profile and background image
            </label>
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" defaultChecked={community.settings?.onlyAdminsCanAddMembers !== false} onChange={async (e) => { await communitiesAPI.update(community._id, { onlyAdminsCanAddMembers: e.target.checked }); }} />
              Only admins can add members (others can invite)
            </label>
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" defaultChecked={community.settings?.onlyAdminsCanRemoveMembers !== false} onChange={async (e) => { await communitiesAPI.update(community._id, { onlyAdminsCanRemoveMembers: e.target.checked }); }} />
              Only admins can remove members
            </label>
            <label className="inline-flex items-center gap-2 text-sm">
              <input type="checkbox" defaultChecked={community.settings?.allowContributions !== false} onChange={async (e) => { await communitiesAPI.update(community._id, { allowContributions: e.target.checked }); }} />
              Allow members to contribute progress on community goals/habits
            </label>
          </div>
        </details>

        <details>
          <summary className="px-4 py-3 border-y border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 font-semibold text-red-600 cursor-pointer">Danger</summary>
          <div className="p-4">
            <button className="px-3 py-2 rounded-lg bg-red-600 text-white" onClick={() => setShowDeleteModal(true)}>Delete Community</button>
          </div>
        </details>

        {DeleteModal}
      </div>
    </div>
  )
}


