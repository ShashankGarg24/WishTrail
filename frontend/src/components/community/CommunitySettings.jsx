import { lazy, Suspense, useEffect, useRef, useState } from 'react'
import { communityUploadAPI, communitiesAPI } from '../../services/api'
import { User, Shield, AlertTriangle, ChevronDown } from 'lucide-react'
const InterestsMultiSelect = lazy(() => import('./InterestsMultiSelect'));

const createProfileState = (community) => ({
  name: community.name || '',
  visibility: community.visibility || 'public',
  description: community.description || '',
  memberLimit: String(community.settings?.memberLimit ?? 1),
  interests: Array.isArray(community.interests) ? community.interests : [],
})

const createPermissionsState = (community) => ({
  onlyAdminsCanAddGoals: community.settings?.onlyAdminsCanAddGoals !== false,
  onlyAdminsCanAddHabits: community.settings?.onlyAdminsCanAddHabits !== false,
  onlyAdminsCanChangeImages: community.settings?.onlyAdminsCanChangeImages !== false,
  onlyAdminsCanAddMembers: community.settings?.onlyAdminsCanAddMembers !== false,
  onlyAdminsCanRemoveMembers: community.settings?.onlyAdminsCanRemoveMembers !== false,
  allowContributions: community.settings?.allowContributions !== false,
})

const shallowEqual = (a, b) => {
  const keys = Object.keys(a)
  return keys.every((key) => {
    const av = a[key]
    const bv = b[key]
    if (Array.isArray(av) || Array.isArray(bv)) {
      const aArr = Array.isArray(av) ? av : []
      const bArr = Array.isArray(bv) ? bv : []
      if (aArr.length !== bArr.length) return false
      return aArr.every((item, idx) => bArr[idx] === item)
    }
    if (typeof av === 'boolean' || typeof bv === 'boolean') return Boolean(av) === Boolean(bv)
    return String(av ?? '') === String(bv ?? '')
  })
}

export default function CommunitySettings({ community, role, setShowDeleteModal, DeleteModal, onCommunityChange }) {
  const [activeSection, setActiveSection] = useState('profile')
  const justSavedProfileRef = useRef(false)
  const justSavedPermissionsRef = useRef(false)

  const [profileInitial, setProfileInitial] = useState(createProfileState(community))
  const [profileForm, setProfileForm] = useState(profileInitial)
  const [profileSaving, setProfileSaving] = useState(false)
  const [profileStatus, setProfileStatus] = useState('')

  const [permissionsInitial, setPermissionsInitial] = useState(createPermissionsState(community))
  const [permissionsForm, setPermissionsForm] = useState(permissionsInitial)
  const [permissionsSaving, setPermissionsSaving] = useState(false)
  const [permissionsStatus, setPermissionsStatus] = useState('')

  const [avatarUploading, setAvatarUploading] = useState(false)
  const [bannerUploading, setBannerUploading] = useState(false)
  const [avatarPreview, setAvatarPreview] = useState('')
  const [bannerPreview, setBannerPreview] = useState('')
  const [avatarError, setAvatarError] = useState('')
  const [bannerError, setBannerError] = useState('')

  useEffect(() => {
    if (justSavedProfileRef.current) {
      justSavedProfileRef.current = false
      return
    }
    if (justSavedPermissionsRef.current) {
      justSavedPermissionsRef.current = false
      return
    }
    const nextProfile = createProfileState(community)
    const nextPermissions = createPermissionsState(community)
    setProfileInitial(nextProfile)
    setProfileForm(nextProfile)
    setProfileStatus('')
    setPermissionsInitial(nextPermissions)
    setPermissionsForm(nextPermissions)
    setPermissionsStatus('')
  }, [
    community?._id,
    community?.name,
    community?.visibility,
    community?.description,
    community?.settings?.memberLimit,
    community?.interests,
    community?.settings?.onlyAdminsCanAddGoals,
    community?.settings?.onlyAdminsCanAddHabits,
    community?.settings?.onlyAdminsCanChangeImages,
    community?.settings?.onlyAdminsCanAddMembers,
    community?.settings?.onlyAdminsCanRemoveMembers,
    community?.settings?.allowContributions,
  ])

  const profileDirty = !shallowEqual(profileForm, profileInitial)
  const permissionsDirty = !shallowEqual(permissionsForm, permissionsInitial)

  if (role !== 'admin') {
    return <div className="text-sm text-gray-500">Settings are visible to admins only.</div>
  }

  const menuItems = [
    { id: 'profile', label: 'Community Profile', icon: User },
    { id: 'permissions', label: 'Permissions', icon: Shield },
    { id: 'danger', label: 'Danger Zone', icon: AlertTriangle },
  ]

  const handleSaveProfile = async () => {
    if (!profileDirty || profileSaving) return
    setProfileSaving(true)
    setProfileStatus('')
    const memberLimit = Math.max(1, Math.min(100, parseInt(profileForm.memberLimit || '1', 10) || 1))
    const payload = {
      name: profileForm.name?.trim() || '',
      visibility: profileForm.visibility,
      description: profileForm.description || '',
      memberLimit,
      interests: Array.isArray(profileForm.interests) ? profileForm.interests : [],
    }
    try {
      await communitiesAPI.update(community._id, payload)
      onCommunityChange?.(payload)
      const normalized = { ...payload, memberLimit: String(memberLimit) }
      justSavedProfileRef.current = true
      setProfileInitial(normalized)
      setProfileForm(normalized)
      setProfileStatus('Saved')
    } catch (err) {
      setProfileStatus('Failed to save')
    } finally {
      setProfileSaving(false)
      setTimeout(() => setProfileStatus(''), 3000)
    }
  }

  const handleSavePermissions = async () => {
    if (!permissionsDirty || permissionsSaving) return
    setPermissionsSaving(true)
    setPermissionsStatus('')
    try {
      await communitiesAPI.update(community._id, permissionsForm)
      justSavedPermissionsRef.current = true
      setPermissionsInitial({ ...permissionsForm })
      setPermissionsStatus('Saved')
    } catch (err) {
      setPermissionsStatus('Failed to save')
    } finally {
      setPermissionsSaving(false)
      setTimeout(() => setPermissionsStatus(''), 3000)
    }
  }

  const renderSectionContent = (sectionId) => {
    switch (sectionId) {
      case 'profile':
        return (
          <div className="p-6 sm:p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white text-xl">👤</div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Community Profile</h3>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">Name</label>
                <input
                  value={profileForm.name}
                  onChange={(e) => setProfileForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-blue-500 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
                  placeholder="Enter community name"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">Visibility</label>
                <select
                  value={profileForm.visibility}
                  onChange={(e) => setProfileForm(prev => ({ ...prev, visibility: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-blue-500 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
                >
                  <option value="public">🌍 Public</option>
                  <option value="private">🔒 Private</option>
                  <option value="invite-only">📧 Invite-only</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">Description</label>
                <textarea
                  value={profileForm.description}
                  onChange={(e) => setProfileForm(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-blue-500 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none resize-none"
                  placeholder="Describe your community..."
                />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">Avatar</label>
                <div className="flex items-center gap-4">
                  <div className="relative">
                    {avatarPreview ? (
                      <img src={avatarPreview} alt="Avatar preview" className="h-16 w-16 rounded-full border-4 border-blue-200 dark:border-blue-800 object-cover shadow-lg" />
                    ) : (
                      <img src={community.avatarUrl || '/api/placeholder/64/64'} alt="Avatar" className="h-16 w-16 rounded-full border-4 border-gray-200 dark:border-gray-800 object-cover shadow-lg" />
                    )}
                    {avatarUploading && (
                      <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent"></div>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <input
                      disabled={avatarUploading}
                      type="file"
                      accept="image/*"
                      onChange={async (e) => {
                        const file = e.target.files?.[0]; if (!file) return;
                        setAvatarError('')
                        if (!file.type.startsWith('image/')) { setAvatarError('Please select an image file'); return }
                        if (file.size > 5 * 1024 * 1024) { setAvatarError('Max image size is 5 MB'); return }
                        try {
                          setAvatarPreview(URL.createObjectURL(file))
                        } catch { }
                        try {
                          setAvatarUploading(true)
                          const fd = new FormData(); fd.append('image', file);
                          const resp = await communityUploadAPI.uploadAvatar(community._id, fd);
                          const url = resp?.data?.data?.url;
                          if (url) {
                            await communitiesAPI.update(community._id, { avatarUrl: url });
                            onCommunityChange?.({ avatarUrl: url })
                          }
                        } catch (err) {
                          setAvatarError('Upload failed. Try a different image')
                        } finally {
                          setAvatarUploading(false)
                        }
                      }}
                      className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 cursor-pointer font-medium"
                    />
                    {avatarUploading && <div className="text-xs text-blue-600 font-medium">⏳ Uploading…</div>}
                    {avatarError && <div className="text-xs text-red-600 font-medium">❌ {avatarError}</div>}
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">Banner</label>
                <div className="flex items-center gap-4">
                  <div className="relative h-16 w-32 rounded-xl bg-gradient-to-br from-gray-200 to-gray-300 dark:from-gray-800 dark:to-gray-900 overflow-hidden border-2 border-gray-200 dark:border-gray-800 shadow-lg">
                    {(bannerPreview || community.bannerUrl) && (
                      <img src={bannerPreview || community.bannerUrl} alt="Banner" className="h-full w-full object-cover" />
                    )}
                    {bannerUploading && (
                      <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                        <div className="animate-spin rounded-full h-6 w-6 border-2 border-white border-t-transparent"></div>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col gap-1.5">
                    <input
                      disabled={bannerUploading}
                      type="file"
                      accept="image/*"
                      onChange={async (e) => {
                        const file = e.target.files?.[0]; if (!file) return;
                        setBannerError('')
                        if (!file.type.startsWith('image/')) { setBannerError('Please select an image file'); return }
                        if (file.size > 5 * 1024 * 1024) { setBannerError('Max image size is 5 MB'); return }
                        try {
                          setBannerPreview(URL.createObjectURL(file))
                        } catch { }
                        try {
                          setBannerUploading(true)
                          const fd = new FormData(); fd.append('image', file);
                          const resp = await communityUploadAPI.uploadBanner(community._id, fd);
                          const url = resp?.data?.data?.url;
                          if (url) {
                            await communitiesAPI.update(community._id, { bannerUrl: url });
                            onCommunityChange?.({ bannerUrl: url })
                          }
                        } catch (err) {
                          setBannerError('Upload failed. Try a different image')
                        } finally {
                          setBannerUploading(false)
                        }
                      }}
                      className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 dark:hover:text-blue-300 cursor-pointer font-medium"
                    />
                    {bannerUploading && <div className="text-xs text-blue-600 font-medium">⏳ Uploading…</div>}
                    {bannerError && <div className="text-xs text-red-600 font-medium">❌ {bannerError}</div>}
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">Member Limit (1-100)</label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={profileForm.memberLimit}
                  onChange={(e) => setProfileForm(prev => ({ ...prev, memberLimit: e.target.value }))}
                  className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-blue-500 dark:focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
                  placeholder="Max 100"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-semibold mb-2 text-gray-700 dark:text-gray-300">Interests</label>
                <Suspense fallback={<div className="text-sm text-gray-500">Loading...</div>}>
                  <InterestsMultiSelect
                    value={profileForm.interests}
                    onChange={(interests) => setProfileForm(prev => ({ ...prev, interests }))}
                  />
                </Suspense>
              </div>
            </div>
            <div className="mt-8 flex items-center gap-4 pt-6 border-t-2 border-gray-200 dark:border-gray-800">
              <button
                onClick={handleSaveProfile}
                disabled={!profileDirty || profileSaving}
                className={`px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-300 ${!profileDirty || profileSaving
                    ? 'bg-gray-200 dark:bg-gray-800 text-gray-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700 shadow-lg hover:shadow-xl'
                  }`}
              >
                {profileSaving ? '⏳ Saving…' : '💾 Save Changes'}
              </button>
              {profileStatus && (
                <span className={`text-sm font-semibold flex items-center gap-1 ${profileStatus === 'Saved' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {profileStatus === 'Saved' ? '✅' : '❌'} {profileStatus}
                </span>
              )}
            </div>
          </div>
        )
      case 'permissions':
        return (
          <div className="p-6 sm:p-8">
            <div className="flex items-center gap-3 mb-6">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center text-white text-xl">🛡️</div>
              <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Permissions</h3>
            </div>
            <div className="space-y-3">
              <label className="flex items-start gap-4 p-5 rounded-xl border-2 border-gray-200 dark:border-gray-800 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-purple-50/50 dark:hover:from-blue-900/10 dark:hover:to-purple-900/10 cursor-pointer transition-all duration-300 group">
                <input
                  type="checkbox"
                  checked={permissionsForm.onlyAdminsCanAddGoals}
                  onChange={(e) => setPermissionsForm(prev => ({ ...prev, onlyAdminsCanAddGoals: e.target.checked }))}
                  className="mt-1 h-5 w-5 rounded border-2 border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-2 focus:ring-blue-500/20"
                />
                <div className="flex-1">
                  <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">🎯 Only admins can add goals</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Others can suggest goals</div>
                </div>
              </label>
              <label className="flex items-start gap-4 p-5 rounded-xl border-2 border-gray-200 dark:border-gray-800 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-purple-50/50 dark:hover:from-blue-900/10 dark:hover:to-purple-900/10 cursor-pointer transition-all duration-300 group">
                <input
                  type="checkbox"
                  checked={permissionsForm.onlyAdminsCanAddHabits}
                  onChange={(e) => setPermissionsForm(prev => ({ ...prev, onlyAdminsCanAddHabits: e.target.checked }))}
                  className="mt-1 h-5 w-5 rounded border-2 border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-2 focus:ring-blue-500/20"
                />
                <div className="flex-1">
                  <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">⚡ Only admins can add habits</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Others can suggest habits</div>
                </div>
              </label>
              <label className="flex items-start gap-4 p-5 rounded-xl border-2 border-gray-200 dark:border-gray-800 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-purple-50/50 dark:hover:from-blue-900/10 dark:hover:to-purple-900/10 cursor-pointer transition-all duration-300 group">
                <input
                  type="checkbox"
                  checked={permissionsForm.onlyAdminsCanChangeImages}
                  onChange={(e) => setPermissionsForm(prev => ({ ...prev, onlyAdminsCanChangeImages: e.target.checked }))}
                  className="mt-1 h-5 w-5 rounded border-2 border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-2 focus:ring-blue-500/20"
                />
                <div className="flex-1">
                  <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">🖼️ Only admins can change images</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Profile and background images</div>
                </div>
              </label>
              <label className="flex items-start gap-4 p-5 rounded-xl border-2 border-gray-200 dark:border-gray-800 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-purple-50/50 dark:hover:from-blue-900/10 dark:hover:to-purple-900/10 cursor-pointer transition-all duration-300 group">
                <input
                  type="checkbox"
                  checked={permissionsForm.onlyAdminsCanAddMembers}
                  onChange={(e) => setPermissionsForm(prev => ({ ...prev, onlyAdminsCanAddMembers: e.target.checked }))}
                  className="mt-1 h-5 w-5 rounded border-2 border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-2 focus:ring-blue-500/20"
                />
                <div className="flex-1">
                  <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">👥 Only admins can add members</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Others can invite members</div>
                </div>
              </label>
              <label className="flex items-start gap-4 p-5 rounded-xl border-2 border-gray-200 dark:border-gray-800 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-purple-50/50 dark:hover:from-blue-900/10 dark:hover:to-purple-900/10 cursor-pointer transition-all duration-300 group">
                <input
                  type="checkbox"
                  checked={permissionsForm.onlyAdminsCanRemoveMembers}
                  onChange={(e) => setPermissionsForm(prev => ({ ...prev, onlyAdminsCanRemoveMembers: e.target.checked }))}
                  className="mt-1 h-5 w-5 rounded border-2 border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-2 focus:ring-blue-500/20"
                />
                <div className="flex-1">
                  <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">🚫 Only admins can remove members</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Members cannot remove other members</div>
                </div>
              </label>
              <label className="flex items-start gap-4 p-5 rounded-xl border-2 border-gray-200 dark:border-gray-800 hover:border-blue-300 dark:hover:border-blue-600 hover:bg-gradient-to-r hover:from-blue-50/50 hover:to-purple-50/50 dark:hover:from-blue-900/10 dark:hover:to-purple-900/10 cursor-pointer transition-all duration-300 group">
                <input
                  type="checkbox"
                  checked={permissionsForm.allowContributions}
                  onChange={(e) => setPermissionsForm(prev => ({ ...prev, allowContributions: e.target.checked }))}
                  className="mt-1 h-5 w-5 rounded border-2 border-gray-300 dark:border-gray-600 text-blue-600 focus:ring-2 focus:ring-blue-500/20"
                />
                <div className="flex-1">
                  <div className="text-sm font-semibold text-gray-900 dark:text-gray-100 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">📊 Allow member contributions</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">Members can contribute progress on community goals/habits</div>
                </div>
              </label>
            </div>
            <div className="mt-8 flex items-center gap-4 pt-6 border-t-2 border-gray-200 dark:border-gray-800">
              <button
                onClick={handleSavePermissions}
                disabled={!permissionsDirty || permissionsSaving}
                className={`px-6 py-3 rounded-xl text-sm font-semibold transition-all duration-300 ${!permissionsDirty || permissionsSaving
                    ? 'bg-gray-200 dark:bg-gray-800 text-gray-500 cursor-not-allowed'
                    : 'bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700 shadow-lg hover:shadow-xl'
                  }`}
              >
                {permissionsSaving ? '⏳ Saving…' : '💾 Save Changes'}
              </button>
              {permissionsStatus && (
                <span className={`text-sm font-semibold flex items-center gap-1 ${permissionsStatus === 'Saved' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  {permissionsStatus === 'Saved' ? '✅' : '❌'} {permissionsStatus}
                </span>
              )}
            </div>
          </div>
        )
      case 'danger':
        return (
          <div className="p-6 sm:p-8">
            <div className="flex items-center gap-3 mb-2">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center text-white text-xl">⚠️</div>
              <h3 className="text-2xl font-bold text-red-600 dark:text-red-400">Danger Zone</h3>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6 ml-13">Irreversible and destructive actions</p>
            <div className="p-6 rounded-2xl border-2 border-red-300 dark:border-red-800 bg-gradient-to-br from-red-50 to-red-100/50 dark:from-red-900/20 dark:to-red-900/10 shadow-lg">
              <div className="mb-5">
                <h4 className="text-base font-bold text-red-900 dark:text-red-100 mb-2 flex items-center gap-2">
                  🗑️ Delete Community
                </h4>
                <p className="text-sm text-red-700 dark:text-red-300">Once you delete a community, there is no going back. All data will be permanently lost. Please be certain.</p>
              </div>
              <button
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-red-600 to-red-700 text-white hover:from-red-700 hover:to-red-800 transition-all duration-300 font-semibold text-sm shadow-lg hover:shadow-xl"
                onClick={() => setShowDeleteModal(true)}
              >
                🗑️ Delete Community Permanently
              </button>
            </div>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div className="rounded-2xl border-2 border-gray-200 dark:border-gray-800 bg-gradient-to-br from-white to-gray-50 dark:from-gray-900 dark:to-gray-900/80 overflow-hidden shadow-xl">
      {/* Desktop View */}
      <div className="hidden md:flex h-[600px]">
        {/* Left Sidebar */}
        <div className="w-64 border-r-2 border-gray-200 dark:border-gray-800 bg-gradient-to-br from-gray-50 to-gray-100/50 dark:from-gray-950 dark:to-gray-900 flex flex-col">
          <div className="p-5 border-b-2 border-gray-200 dark:border-gray-800">
            <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center text-white text-sm">⚙️</div>
              Settings
            </h2>
          </div>
          <nav className="flex-1 p-3 space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon
              const isActive = activeSection === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-all duration-300 ${isActive
                      ? 'bg-gradient-to-r from-blue-500 to-purple-600 text-white shadow-lg scale-105'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-gray-800 hover:shadow-md'
                    }`}
                >
                  <Icon className={`h-5 w-5 ${isActive ? '' : 'text-gray-500'}`} />
                  <span>{item.label}</span>
                </button>
              )
            })}
          </nav>
        </div>

        {/* Right Content Area */}
        <div className="flex-1 overflow-y-auto bg-white dark:bg-gray-900">
          {renderSectionContent(activeSection)}
        </div>
      </div>

      {/* Mobile View */}
      <div className="md:hidden">
        <div className="p-5 border-b-2 border-gray-200 dark:border-gray-800 bg-gradient-to-r from-blue-500 to-purple-600">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <div className="h-8 w-8 rounded-lg bg-white/20 backdrop-blur-sm flex items-center justify-center text-xl">⚙️</div>
            Settings
          </h2>
        </div>
        {menuItems.map((item) => {
          const Icon = item.icon
          const isActive = activeSection === item.id
          return (
            <div key={item.id} className="border-b-2 border-gray-200 dark:border-gray-800 last:border-0">
              <button
                onClick={() => setActiveSection(isActive ? '' : item.id)}
                className={`w-full flex items-center justify-between p-4 text-left transition-all duration-300 ${isActive ? 'bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20' : 'hover:bg-gray-50 dark:hover:bg-gray-800/30'
                  }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`h-10 w-10 rounded-lg flex items-center justify-center transition-all ${isActive ? 'bg-gradient-to-br from-blue-500 to-purple-600 text-white' : 'bg-gray-100 dark:bg-gray-800'}`}>
                    <Icon className={`h-5 w-5 ${isActive ? '' : 'text-gray-500'}`} />
                  </div>
                  <span className={`font-semibold ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-gray-100'}`}>
                    {item.label}
                  </span>
                </div>
                <ChevronDown className={`h-5 w-5 transition-all duration-300 ${isActive ? 'rotate-180 text-blue-600 dark:text-blue-400' : 'text-gray-400'}`} />
              </button>
              {isActive && (
                <div className="border-t-2 border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
                  {renderSectionContent(item.id)}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {DeleteModal}
    </div>
  )
}


