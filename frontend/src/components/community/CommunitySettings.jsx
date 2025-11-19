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
          <div className="p-6">
            <h3 className="text-xl font-semibold mb-6 text-gray-900 dark:text-gray-100">Community Profile</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Name</label>
                <input
                  value={profileForm.name}
                  onChange={(e) => setProfileForm(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Visibility</label>
                <select
                  value={profileForm.visibility}
                  onChange={(e) => setProfileForm(prev => ({ ...prev, visibility: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                >
                  <option value="public">Public</option>
                  <option value="private">Private</option>
                  <option value="invite-only">Invite-only</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Description</label>
                <textarea
                  value={profileForm.description}
                  onChange={(e) => setProfileForm(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Avatar</label>
                <div className="flex items-center gap-3">
                  {avatarPreview ? (
                    <img src={avatarPreview} alt="Avatar preview" className="h-12 w-12 rounded-full border-2 border-gray-200 dark:border-gray-800 object-cover" />
                  ) : (
                    <img src={community.avatarUrl || '/api/placeholder/64/64'} alt="Avatar" className="h-12 w-12 rounded-full border-2 border-gray-200 dark:border-gray-800 object-cover" />
                  )}
                  <div className="flex flex-col gap-1">
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
                      className="text-sm"
                    />
                    {avatarUploading && <div className="text-xs text-gray-500">Uploading…</div>}
                    {avatarError && <div className="text-xs text-red-600">{avatarError}</div>}
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Banner</label>
                <div className="flex items-center gap-3">
                  <div className="h-12 w-24 rounded-lg bg-gray-200 dark:bg-gray-800 overflow-hidden border border-gray-200 dark:border-gray-800">
                    {(bannerPreview || community.bannerUrl) && (
                      <img src={bannerPreview || community.bannerUrl} alt="Banner" className="h-full w-full object-cover" />
                    )}
                  </div>
                  <div className="flex flex-col gap-1">
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
                      className="text-sm"
                    />
                    {bannerUploading && <div className="text-xs text-gray-500">Uploading…</div>}
                    {bannerError && <div className="text-xs text-red-600">{bannerError}</div>}
                  </div>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Members (1-100)</label>
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={profileForm.memberLimit}
                  onChange={(e) => setProfileForm(prev => ({ ...prev, memberLimit: e.target.value }))}
                  className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                />
              </div>
              <div className="sm:col-span-2">
                <label className="block text-sm font-medium mb-2 text-gray-700 dark:text-gray-300">Interests</label>
                <Suspense fallback={<div className="text-sm text-gray-500">Loading...</div>}>
                  <InterestsMultiSelect
                    value={profileForm.interests}
                    onChange={(interests) => setProfileForm(prev => ({ ...prev, interests }))}
                  />
                </Suspense>
              </div>
            </div>
            <div className="mt-8 flex items-center gap-4">
              <button
                onClick={handleSaveProfile}
                disabled={!profileDirty || profileSaving}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${!profileDirty || profileSaving
                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
              >
                {profileSaving ? 'Saving…' : 'Save changes'}
              </button>
              {profileStatus && (
                <span className={`text-sm ${profileStatus === 'Saved' ? 'text-green-600' : 'text-red-600'}`}>
                  {profileStatus}
                </span>
              )}
            </div>
          </div>
        )
      case 'permissions':
        return (
          <div className="p-6">
            <h3 className="text-xl font-semibold mb-6 text-gray-900 dark:text-gray-100">Permissions</h3>
            <div className="space-y-4">
              <label className="flex items-start gap-3 p-4 rounded-lg border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={permissionsForm.onlyAdminsCanAddGoals}
                  onChange={(e) => setPermissionsForm(prev => ({ ...prev, onlyAdminsCanAddGoals: e.target.checked }))}
                  className="mt-0.5"
                />
                <div>
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100">Only admins can add goals</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Others can suggest goals</div>
                </div>
              </label>
              <label className="flex items-start gap-3 p-4 rounded-lg border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={permissionsForm.onlyAdminsCanAddHabits}
                  onChange={(e) => setPermissionsForm(prev => ({ ...prev, onlyAdminsCanAddHabits: e.target.checked }))}
                  className="mt-0.5"
                />
                <div>
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100">Only admins can add habits</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Others can suggest habits</div>
                </div>
              </label>
              <label className="flex items-start gap-3 p-4 rounded-lg border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={permissionsForm.onlyAdminsCanChangeImages}
                  onChange={(e) => setPermissionsForm(prev => ({ ...prev, onlyAdminsCanChangeImages: e.target.checked }))}
                  className="mt-0.5"
                />
                <div>
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100">Only admins can change images</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Profile and background images</div>
                </div>
              </label>
              <label className="flex items-start gap-3 p-4 rounded-lg border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={permissionsForm.onlyAdminsCanAddMembers}
                  onChange={(e) => setPermissionsForm(prev => ({ ...prev, onlyAdminsCanAddMembers: e.target.checked }))}
                  className="mt-0.5"
                />
                <div>
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100">Only admins can add members</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Others can invite members</div>
                </div>
              </label>
              <label className="flex items-start gap-3 p-4 rounded-lg border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={permissionsForm.onlyAdminsCanRemoveMembers}
                  onChange={(e) => setPermissionsForm(prev => ({ ...prev, onlyAdminsCanRemoveMembers: e.target.checked }))}
                  className="mt-0.5"
                />
                <div>
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100">Only admins can remove members</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Members cannot remove other members</div>
                </div>
              </label>
              <label className="flex items-start gap-3 p-4 rounded-lg border border-gray-200 dark:border-gray-800 hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={permissionsForm.allowContributions}
                  onChange={(e) => setPermissionsForm(prev => ({ ...prev, allowContributions: e.target.checked }))}
                  className="mt-0.5"
                />
                <div>
                  <div className="text-sm font-medium text-gray-900 dark:text-gray-100">Allow member contributions</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">Members can contribute progress on community goals/habits</div>
                </div>
              </label>
            </div>
            <div className="mt-8 flex items-center gap-4">
              <button
                onClick={handleSavePermissions}
                disabled={!permissionsDirty || permissionsSaving}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${!permissionsDirty || permissionsSaving
                    ? 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
              >
                {permissionsSaving ? 'Saving…' : 'Save changes'}
              </button>
              {permissionsStatus && (
                <span className={`text-sm ${permissionsStatus === 'Saved' ? 'text-green-600' : 'text-red-600'}`}>
                  {permissionsStatus}
                </span>
              )}
            </div>
          </div>
        )
      case 'danger':
        return (
          <div className="p-6">
            <h3 className="text-xl font-semibold mb-2 text-gray-900 dark:text-gray-100">Danger Zone</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">Irreversible and destructive actions</p>
            <div className="p-4 rounded-lg border-2 border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-900/20">
              <div className="mb-4">
                <h4 className="text-sm font-semibold text-red-900 dark:text-red-100 mb-1">Delete Community</h4>
                <p className="text-xs text-red-700 dark:text-red-300">Once you delete a community, there is no going back. Please be certain.</p>
              </div>
              <button
                className="px-4 py-2 rounded-lg bg-red-600 text-white hover:bg-red-700 transition-colors font-medium text-sm"
                onClick={() => setShowDeleteModal(true)}
              >
                Delete Community
              </button>
            </div>
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden">
      {/* Desktop View */}
      <div className="hidden md:flex h-[600px]">
        {/* Left Sidebar */}
        <div className="w-64 border-r border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950 flex flex-col">
          <div className="p-4 border-b border-gray-200 dark:border-gray-800">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Settings</h2>
          </div>
          <nav className="flex-1 p-2 space-y-1">
            {menuItems.map((item) => {
              const Icon = item.icon
              const isActive = activeSection === item.id
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveSection(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive
                      ? 'bg-blue-600 text-white'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{item.label}</span>
                </button>
              )
            })}
          </nav>
        </div>

        {/* Right Content Area */}
        <div className="flex-1 overflow-y-auto">
          {renderSectionContent(activeSection)}
        </div>
      </div>

      {/* Mobile View */}
      <div className="md:hidden">
        <div className="p-4 border-b border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-950">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Settings</h2>
        </div>
        {menuItems.map((item) => {
          const Icon = item.icon
          const isActive = activeSection === item.id
          return (
            <div key={item.id} className="border-b border-gray-200 dark:border-gray-800 last:border-0">
              <button
                onClick={() => setActiveSection(isActive ? '' : item.id)}
                className={`w-full flex items-center justify-between p-4 text-left transition-colors ${isActive ? 'bg-gray-50 dark:bg-gray-800/50' : 'hover:bg-gray-50 dark:hover:bg-gray-800/30'
                  }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className="h-5 w-5 text-gray-500" />
                  <span className={`font-medium ${isActive ? 'text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-gray-100'}`}>
                    {item.label}
                  </span>
                </div>
                <ChevronDown className={`h-5 w-5 text-gray-500 transition-transform duration-200 ${isActive ? 'rotate-180' : ''}`} />
              </button>
              {isActive && (
                <div className="border-t border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900">
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


