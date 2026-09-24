import { useEffect, useMemo, useState } from 'react';
import { adminAPI, adminAuth } from '../services/adminApi';

const TABS = ['Users', 'Goals', 'Habits', 'Email', 'Release Notes', 'Analytics'];

const EMPTY_RELEASE_NOTE = {
  title: '',
  version: '',
  type: 'feature',
  isMajor: true,
  description: ''
};

const RELEASE_NOTE_TEMPLATE = `What’s new\n\n• Describe the most valuable improvement in one clear sentence.\n• Add one or two details people will notice.\n\nImprovements\n\n• Mention reliability, performance, or usability improvements.\n\nBug fixes\n\n• Briefly note meaningful fixes without technical jargon.`;

const EMAIL_PRESETS = {
  custom: {
    subject: '',
    title: '',
    subtitle: '',
    body: ''
  },
  inactivity: {
    subject: 'We miss your progress on WishTrail',
    title: 'Your goals are still waiting for you',
    subtitle: 'One small step today can restart your momentum.',
    body: 'It has been a while since your last check-in. Your goals are still here, and progress is always one action away.\n\nOpen WishTrail today and complete just one meaningful action.'
  },
  noGoals: {
    subject: 'Let’s create your first goal on WishTrail',
    title: 'Your journey starts with one goal',
    subtitle: 'No goals yet — now is the best time to begin.',
    body: 'You have not created any goals yet, and that is okay. A clear goal gives your effort direction and helps you stay consistent.\n\nTake two minutes to create your first goal and define the first step.'
  },
  comeback: {
    subject: 'Your comeback starts with one small win',
    title: 'Ready for your comeback?',
    subtitle: 'You do not need perfect — you only need to start.',
    body: 'A comeback is built one action at a time. Pick one goal, complete one task, and rebuild your streak from today.\n\nYou have done hard things before. You can do this again.'
  },
  featureRelease: {
    subject: 'New features are live on WishTrail',
    title: 'What’s new in WishTrail',
    subtitle: 'We shipped improvements to support your growth journey.',
    body: 'We have released new updates to make planning, tracking, and consistency easier.\n\nOpen your dashboard and explore the latest features now.'
  },
  motivation: {
    subject: 'Motivation for your journey today',
    title: 'A quote for your progress',
    subtitle: '“Success is the sum of small efforts, repeated day in and day out.”',
    body: 'Progress is not always loud. Quiet consistency wins over time.\n\nChoose one important action today and complete it before the day ends.'
  },
  feedback: {
    subject: 'Help us improve WishTrail with your feedback',
    title: 'Your feedback matters',
    subtitle: 'Tell us what is working and what can be better.',
    body: 'We are continuously improving WishTrail for your goals and habits journey.\n\nShare your honest feedback: what you love, what feels confusing, and what you want next.'
  }
};

const Pagination = ({ page, pages, onPageChange }) => (
  <div className="mt-4 flex items-center justify-between text-sm">
    <button
      className="px-3 py-1 rounded border border-gray-300 disabled:opacity-40"
      onClick={() => onPageChange(page - 1)}
      disabled={page <= 1}
    >
      Previous
    </button>
    <span className="text-gray-600 dark:text-gray-300">Page {page} of {pages || 1}</span>
    <button
      className="px-3 py-1 rounded border border-gray-300 disabled:opacity-40"
      onClick={() => onPageChange(page + 1)}
      disabled={page >= (pages || 1)}
    >
      Next
    </button>
  </div>
);

const SectionCard = ({ title, children }) => (
  <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4">
    <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">{title}</h2>
    {children}
  </div>
);

function AdminPage() {
  const [activeTab, setActiveTab] = useState('Users');
  const [token, setToken] = useState(adminAuth.getToken());
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  const [usersData, setUsersData] = useState({ users: [], pagination: { page: 1, pages: 1, total: 0 } });
  const [usersLoading, setUsersLoading] = useState(false);
  const [usersError, setUsersError] = useState('');
  const [usersQuery, setUsersQuery] = useState({ page: 1, limit: 20, search: '', inactiveDays: '', emailNotifications: 'all' });
  const [selectedUsers, setSelectedUsers] = useState([]);

  const [goalsData, setGoalsData] = useState({ goals: [], pagination: { page: 1, pages: 1, total: 0 } });
  const [goalsLoading, setGoalsLoading] = useState(false);
  const [goalsError, setGoalsError] = useState('');
  const [goalsQuery, setGoalsQuery] = useState({ page: 1, limit: 20, search: '', status: 'all' });

  const [habitsData, setHabitsData] = useState({ habits: [], pagination: { page: 1, pages: 1, total: 0 } });
  const [habitsLoading, setHabitsLoading] = useState(false);
  const [habitsError, setHabitsError] = useState('');
  const [habitsQuery, setHabitsQuery] = useState({ page: 1, limit: 20, search: '', status: 'all' });

  const [analytics, setAnalytics] = useState({ totalUsers: 0, activeToday: 0, inactiveUsers: 0, totalGoals: 0 });
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [analyticsError, setAnalyticsError] = useState('');

  const [releaseNotesData, setReleaseNotesData] = useState({ updates: [], pagination: { page: 1, pages: 1, total: 0 } });
  const [releaseNotesLoading, setReleaseNotesLoading] = useState(false);
  const [releaseNotesError, setReleaseNotesError] = useState('');
  const [releaseNotesSuccess, setReleaseNotesSuccess] = useState('');
  const [releaseNoteForm, setReleaseNoteForm] = useState(EMPTY_RELEASE_NOTE);
  const [editingReleaseVersion, setEditingReleaseVersion] = useState(null);
  const [releaseNotesSaving, setReleaseNotesSaving] = useState(false);

  const [emailForm, setEmailForm] = useState({
    mode: 'selected',
    preset: 'custom',
    inactiveDays: 30,
    subject: '',
    title: '',
    subtitle: '',
    body: '',
    ending: '',
    linkedReleaseVersion: '',
    ctaLabel: 'Open WishTrail',
    ctaUrl: 'https://wishtrail.in/dashboard'
  });
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [emailSuccess, setEmailSuccess] = useState('');

  const canSendEmail = useMemo(() => {
    if (!emailForm.subject.trim() || !emailForm.title.trim() || !emailForm.body.trim()) return false;
    if (emailForm.mode === 'selected' && selectedUsers.length === 0) return false;
    return true;
  }, [emailForm, selectedUsers.length]);

  const handleLogin = async (event) => {
    event.preventDefault();
    setLoginLoading(true);
    setLoginError('');

    try {
      const res = await adminAPI.login({
        email: loginForm.email,
        password: loginForm.password
      });

      const newToken = res?.data?.data?.token;
      if (!newToken) {
        throw new Error('Missing admin token');
      }

      adminAuth.setToken(newToken);
      setToken(newToken);
    } catch (error) {
      setLoginError(error?.response?.data?.message || error.message || 'Login failed');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    adminAuth.clearToken();
    setToken('');
  };

  const loadUsers = async () => {
    setUsersLoading(true);
    setUsersError('');
    try {
      const res = await adminAPI.getUsers(usersQuery);
      setUsersData(res?.data?.data || { users: [], pagination: { page: 1, pages: 1, total: 0 } });
    } catch (error) {
      setUsersError(error?.response?.data?.message || 'Failed to load users');
    } finally {
      setUsersLoading(false);
    }
  };

  const loadGoals = async () => {
    setGoalsLoading(true);
    setGoalsError('');
    try {
      const res = await adminAPI.getGoals(goalsQuery);
      setGoalsData(res?.data?.data || { goals: [], pagination: { page: 1, pages: 1, total: 0 } });
    } catch (error) {
      setGoalsError(error?.response?.data?.message || 'Failed to load goals');
    } finally {
      setGoalsLoading(false);
    }
  };

  const loadHabits = async () => {
    setHabitsLoading(true);
    setHabitsError('');
    try {
      const res = await adminAPI.getHabits(habitsQuery);
      setHabitsData(res?.data?.data || { habits: [], pagination: { page: 1, pages: 1, total: 0 } });
    } catch (error) {
      setHabitsError(error?.response?.data?.message || 'Failed to load habits');
    } finally {
      setHabitsLoading(false);
    }
  };

  const loadAnalytics = async () => {
    setAnalyticsLoading(true);
    setAnalyticsError('');
    try {
      const res = await adminAPI.getAnalytics({ inactiveDays: 30 });
      setAnalytics(res?.data?.data?.analytics || { totalUsers: 0, activeToday: 0, inactiveUsers: 0, totalGoals: 0 });
    } catch (error) {
      setAnalyticsError(error?.response?.data?.message || 'Failed to load analytics');
    } finally {
      setAnalyticsLoading(false);
    }
  };

  const loadReleaseNotes = async () => {
    setReleaseNotesLoading(true);
    setReleaseNotesError('');
    try {
      const res = await adminAPI.getProductUpdates({ page: 1, limit: 100 });
      setReleaseNotesData(res?.data?.data || { updates: [], pagination: { page: 1, pages: 1, total: 0 } });
    } catch (error) {
      setReleaseNotesError(error?.response?.data?.message || 'Failed to load release notes');
    } finally {
      setReleaseNotesLoading(false);
    }
  };

  useEffect(() => {
    if (!token) return;
    loadUsers();
    loadGoals();
    loadHabits();
    loadAnalytics();
  }, [token]);

  useEffect(() => {
    if (!token) return;
    loadUsers();
  }, [usersQuery.page, usersQuery.limit]);

  useEffect(() => {
    if (!token) return;
    loadGoals();
  }, [goalsQuery.page, goalsQuery.limit, goalsQuery.status]);

  useEffect(() => {
    if (!token) return;
    loadHabits();
  }, [habitsQuery.page, habitsQuery.limit, habitsQuery.status]);

  useEffect(() => {
    if (token && (activeTab === 'Release Notes' || activeTab === 'Email')) loadReleaseNotes();
  }, [token, activeTab]);

  const toggleSelectUser = (id) => {
    setSelectedUsers((prev) =>
      prev.includes(id) ? prev.filter((userId) => userId !== id) : [...prev, id]
    );
  };

  const applyEmailPreset = (presetKey) => {
    const preset = EMAIL_PRESETS[presetKey] || EMAIL_PRESETS.custom;
    setEmailForm((prev) => ({
      ...prev,
      preset: presetKey,
      subject: preset.subject,
      title: preset.title,
      subtitle: preset.subtitle,
      body: preset.body,
      ending: preset.ending,
      linkedReleaseVersion: '',
      ctaLabel: 'Open WishTrail',
      ctaUrl: 'https://wishtrail.in/dashboard'
    }));
  };

  const sendEmail = async () => {
    setEmailLoading(true);
    setEmailError('');
    setEmailSuccess('');

    try {
      const payload = {
        mode: emailForm.mode,
        inactiveDays: emailForm.mode === 'inactive' ? Number(emailForm.inactiveDays || 30) : undefined,
        userIds: emailForm.mode === 'selected' ? selectedUsers : undefined,
        subject: emailForm.subject,
        title: emailForm.title,
        subtitle: emailForm.subtitle,
        body: emailForm.body,
        ending: emailForm.ending,
        ctaLabel: emailForm.ctaLabel,
        ctaUrl: emailForm.ctaUrl
      };

      const res = await adminAPI.sendEmail(payload);
      const data = res?.data?.data;
      setEmailSuccess(`Broadcast completed: ${data?.sent || 0} sent, ${data?.failed || 0} failed`);
    } catch (error) {
      setEmailError(error?.response?.data?.message || 'Failed to send email');
    } finally {
      setEmailLoading(false);
    }
  };

  const resetReleaseNoteForm = () => {
    setReleaseNoteForm(EMPTY_RELEASE_NOTE);
    setEditingReleaseVersion(null);
    setReleaseNotesError('');
  };

  const editReleaseNote = (update) => {
    setEditingReleaseVersion(update.version);
    setReleaseNoteForm({
      title: update.title || '',
      version: update.version || '',
      type: String(update.type || 'feature').split(',')[0],
      isMajor: Boolean(update.isMajor),
      description: update.description || ''
    });
    setReleaseNotesSuccess('');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const saveReleaseNote = async () => {
    setReleaseNotesSaving(true);
    setReleaseNotesError('');
    setReleaseNotesSuccess('');
    try {
      const payload = { ...releaseNoteForm, title: releaseNoteForm.title.trim(), version: releaseNoteForm.version.trim(), description: releaseNoteForm.description.trim() };
      if (editingReleaseVersion) {
        await adminAPI.updateProductUpdate(editingReleaseVersion, payload);
        setReleaseNotesSuccess('Release note updated.');
      } else {
        await adminAPI.createProductUpdate(payload);
        setReleaseNotesSuccess('Release note published.');
      }
      resetReleaseNoteForm();
      await loadReleaseNotes();
    } catch (error) {
      if (error?.response?.status === 409) {
        try {
          const res = await adminAPI.getProductUpdates({ page: 1, limit: 100 });
          const existing = (res?.data?.data?.updates || []).find((update) => update.version === releaseNoteForm.version.trim());
          if (existing) {
            setReleaseNotesData(res.data.data);
            editReleaseNote(existing);
            setReleaseNotesSuccess(`Version ${existing.version} already exists, so it has been opened for editing.`);
            return;
          }
        } catch {
          // Preserve the original API error below if refresh also fails.
        }
      }
      setReleaseNotesError(error?.response?.data?.message || 'Failed to save release note');
    } finally {
      setReleaseNotesSaving(false);
    }
  };

  const deleteReleaseNote = async (version) => {
    if (!window.confirm(`Delete release note v${version}? This cannot be undone.`)) return;
    setReleaseNotesError('');
    try {
      await adminAPI.deleteProductUpdate(version);
      if (editingReleaseVersion === version) resetReleaseNoteForm();
      setReleaseNotesSuccess('Release note deleted.');
      await loadReleaseNotes();
    } catch (error) {
      setReleaseNotesError(error?.response?.data?.message || 'Failed to delete release note');
    }
  };

  const linkReleaseToEmail = (version) => {
    const update = releaseNotesData.updates.find((item) => item.version === version);
    if (!update) return;
    setEmailForm((prev) => ({
      ...prev,
      preset: 'featureRelease',
      linkedReleaseVersion: update.version,
      subject: `New in WishTrail: ${update.title}`,
      title: update.title,
      subtitle: `Version ${update.version} is now available.`,
      body: update.description,
      ctaLabel: 'View release notes',
      ctaUrl: 'https://wishtrail.in/whats-new'
    }));
  };

  if (!token) {
    return (
      <div className="min-h-screen bg-[#f5f5f5] dark:bg-gray-900 flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-6">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-4">WishTrail Admin Login</h1>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Email</label>
              <input
                type="email"
                className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-900"
                value={loginForm.email}
                onChange={(e) => setLoginForm((prev) => ({ ...prev, email: e.target.value }))}
                required
              />
            </div>
            <div>
              <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Password</label>
              <input
                type="password"
                className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-900"
                value={loginForm.password}
                onChange={(e) => setLoginForm((prev) => ({ ...prev, password: e.target.value }))}
                required
              />
            </div>
            {loginError && <p className="text-sm text-red-600">{loginError}</p>}
            <button
              type="submit"
              className="w-full px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
              disabled={loginLoading}
            >
              {loginLoading ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f5f5f5] dark:bg-gray-900 p-4 sm:p-6">
      <div className="max-w-7xl mx-auto space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">WishTrail Admin Panel</h1>
          <button
            onClick={handleLogout}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded text-sm"
          >
            Logout
          </button>
        </div>

        <div className="flex flex-wrap gap-2">
          {TABS.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-3 py-2 rounded text-sm border ${
                activeTab === tab
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white dark:bg-gray-800 border-gray-300 dark:border-gray-600'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {activeTab === 'Users' && (
          <SectionCard title="Users">
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 mb-4">
              <input
                placeholder="Search name, username, email"
                value={usersQuery.search}
                onChange={(e) => setUsersQuery((prev) => ({ ...prev, search: e.target.value }))}
                className="border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-900"
              />
              <input
                type="number"
                min="0"
                placeholder="Inactive > days"
                value={usersQuery.inactiveDays}
                onChange={(e) => setUsersQuery((prev) => ({ ...prev, inactiveDays: e.target.value }))}
                className="border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-900"
              />
              <select
                value={usersQuery.emailNotifications}
                onChange={(e) => setUsersQuery((prev) => ({ ...prev, emailNotifications: e.target.value }))}
                className="border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-900"
              >
                <option value="all">Email Notif: All</option>
                <option value="enabled">Email Notif: Enabled</option>
                <option value="disabled">Email Notif: Disabled</option>
              </select>
              <button
                onClick={() => {
                  setUsersQuery((prev) => ({ ...prev, page: 1 }));
                  loadUsers();
                }}
                className="px-3 py-2 bg-blue-600 text-white rounded"
              >
                Apply Filters
              </button>
            </div>

            {usersLoading ? <p>Loading users...</p> : null}
            {usersError ? <p className="text-red-600 text-sm">{usersError}</p> : null}

            {!usersLoading && !usersError && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left border-b border-gray-200 dark:border-gray-700">
                      <th className="py-2">Select</th>
                      <th className="py-2">User</th>
                      <th className="py-2">Email</th>
                      <th className="py-2">Email Notifications</th>
                      <th className="py-2">Completed Goals</th>
                      <th className="py-2">Total Goals</th>
                      <th className="py-2">Total Habits</th>
                      <th className="py-2">Last Active</th>
                      <th className="py-2">Last Daily Updated</th>
                      <th className="py-2">Account Active</th>
                      <th className="py-2">Last Update Seen</th>
                    </tr>
                  </thead>
                  <tbody>
                    {usersData.users.map((user) => (
                      <tr key={user.id} className="border-b border-gray-100 dark:border-gray-800">
                        <td className="py-2">
                          <input
                            type="checkbox"
                            checked={selectedUsers.includes(user.id)}
                            onChange={() => toggleSelectUser(user.id)}
                          />
                        </td>
                        <td className="py-2">{user.name} (@{user.username})</td>
                        <td className="py-2">{user.email}</td>
                        <td className="py-2">{user.emailNotificationsEnabled ? 'Enabled' : 'Disabled'}</td>
                        <td className="py-2">{user.completedGoals || 0}</td>
                        <td className="py-2">{user.totalGoals || 0}</td>
                        <td className="py-2">{user.totalHabits || 0}</td>
                        <td className="py-2">{user.lastActiveAt ? new Date(user.lastActiveAt).toLocaleString() : '-'}</td>
                        <td className="py-2">{user.lastDailyUpdatedAt ? new Date(user.lastDailyUpdatedAt).toLocaleString() : '-'}</td>
                        <td className="py-2">{user.accountActive ? 'Yes' : 'No'}</td>
                        <td className="py-2">{user.lastUpdateSeen || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <Pagination
              page={usersData.pagination.page || 1}
              pages={usersData.pagination.pages || 1}
              onPageChange={(nextPage) => setUsersQuery((prev) => ({ ...prev, page: nextPage }))}
            />
          </SectionCard>
        )}

        {activeTab === 'Goals' && (
          <SectionCard title="Goals">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
              <input
                placeholder="Search goal or user"
                value={goalsQuery.search}
                onChange={(e) => setGoalsQuery((prev) => ({ ...prev, search: e.target.value }))}
                className="border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-900"
              />
              <select
                value={goalsQuery.status}
                onChange={(e) => setGoalsQuery((prev) => ({ ...prev, status: e.target.value, page: 1 }))}
                className="border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-900"
              >
                <option value="all">All</option>
                <option value="active">Active</option>
                <option value="completed">Completed</option>
              </select>
              <button
                onClick={() => {
                  setGoalsQuery((prev) => ({ ...prev, page: 1 }));
                  loadGoals();
                }}
                className="px-3 py-2 bg-blue-600 text-white rounded"
              >
                Apply Filters
              </button>
            </div>

            {goalsLoading ? <p>Loading goals...</p> : null}
            {goalsError ? <p className="text-red-600 text-sm">{goalsError}</p> : null}

            {!goalsLoading && !goalsError && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left border-b border-gray-200 dark:border-gray-700">
                      <th className="py-2">Goal</th>
                      <th className="py-2">Category</th>
                      <th className="py-2">Status</th>
                      <th className="py-2">Owner</th>
                      <th className="py-2">Total Updates</th>
                      <th className="py-2">Last Goal Update</th>
                      <th className="py-2">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {goalsData.goals.map((goal) => (
                      <tr key={goal.id} className="border-b border-gray-100 dark:border-gray-800">
                        <td className="py-2">{goal.title}</td>
                        <td className="py-2">{goal.category}</td>
                        <td className="py-2">{goal.completed ? 'Completed' : 'Active'}</td>
                        <td className="py-2">{goal.user?.username}</td>
                        <td className="py-2">{goal.totalGoalUpdates || 0}</td>
                        <td className="py-2">{goal.lastGoalUpdateAt ? new Date(goal.lastGoalUpdateAt).toLocaleString() : '-'}</td>
                        <td className="py-2">{new Date(goal.createdAt).toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <Pagination
              page={goalsData.pagination.page || 1}
              pages={goalsData.pagination.pages || 1}
              onPageChange={(nextPage) => setGoalsQuery((prev) => ({ ...prev, page: nextPage }))}
            />
          </SectionCard>
        )}

        {activeTab === 'Habits' && (
          <SectionCard title="Habits">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
              <input
                placeholder="Search habit or user"
                value={habitsQuery.search}
                onChange={(e) => setHabitsQuery((prev) => ({ ...prev, search: e.target.value }))}
                className="border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-900"
              />
              <select
                value={habitsQuery.status}
                onChange={(e) => setHabitsQuery((prev) => ({ ...prev, status: e.target.value, page: 1 }))}
                className="border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-900"
              >
                <option value="all">All</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
              <button
                onClick={() => {
                  setHabitsQuery((prev) => ({ ...prev, page: 1 }));
                  loadHabits();
                }}
                className="px-3 py-2 bg-blue-600 text-white rounded"
              >
                Apply Filters
              </button>
            </div>

            {habitsLoading ? <p>Loading habits...</p> : null}
            {habitsError ? <p className="text-red-600 text-sm">{habitsError}</p> : null}

            {!habitsLoading && !habitsError && (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left border-b border-gray-200 dark:border-gray-700">
                      <th className="py-2">Habit</th>
                      <th className="py-2">Frequency</th>
                      <th className="py-2">Status</th>
                      <th className="py-2">Owner</th>
                      <th className="py-2">Total Logs</th>
                      <th className="py-2">Current Streak</th>
                      <th className="py-2">Best Streak</th>
                      <th className="py-2">Created</th>
                    </tr>
                  </thead>
                  <tbody>
                    {habitsData.habits.map((habit) => (
                      <tr key={habit.id} className="border-b border-gray-100 dark:border-gray-800">
                        <td className="py-2">{habit.name}</td>
                        <td className="py-2">{habit.frequency || '-'}</td>
                        <td className="py-2">{habit.status}</td>
                        <td className="py-2">{habit.user?.username}</td>
                        <td className="py-2">{habit.totalLogs || 0}</td>
                        <td className="py-2">{habit.currentStreak || 0}</td>
                        <td className="py-2">{habit.bestStreak || 0}</td>
                        <td className="py-2">{habit.createdAt ? new Date(habit.createdAt).toLocaleString() : '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <Pagination
              page={habitsData.pagination.page || 1}
              pages={habitsData.pagination.pages || 1}
              onPageChange={(nextPage) => setHabitsQuery((prev) => ({ ...prev, page: nextPage }))}
            />
          </SectionCard>
        )}

        {activeTab === 'Email' && (
          <SectionCard title="Email Composer">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div><label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Audience</label><select value={emailForm.mode} onChange={(e) => setEmailForm((prev) => ({ ...prev, mode: e.target.value }))} className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-900"><option value="selected">Selected users</option><option value="all">All users</option><option value="inactive">Inactive users</option></select></div>
                  <div><label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Writing preset</label><select value={emailForm.preset} onChange={(e) => applyEmailPreset(e.target.value)} className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-900"><option value="custom">Custom</option><option value="inactivity">Inactivity</option><option value="noGoals">Users With No Goals</option><option value="comeback">Comebacks</option><option value="featureRelease">Feature Release</option><option value="motivation">Motivation</option><option value="feedback">Feedback</option></select></div>
                </div>

                {emailForm.mode === 'inactive' && <div><label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Inactive more than (days)</label><input type="number" min="1" value={emailForm.inactiveDays} onChange={(e) => setEmailForm((prev) => ({ ...prev, inactiveDays: e.target.value }))} className="w-full sm:w-80 border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-900" /></div>}

                <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4 dark:border-blue-900/50 dark:bg-blue-950/20">
                  <label className="block text-sm font-medium text-gray-800 dark:text-gray-100 mb-1">Link a published release note</label>
                  <select value={emailForm.linkedReleaseVersion} onChange={(e) => linkReleaseToEmail(e.target.value)} className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-900"><option value="">No linked release</option>{releaseNotesData.updates.map((update) => <option key={update.id || update.version} value={update.version}>v{update.version} — {update.title}</option>)}</select>
                  <p className="mt-2 text-xs text-gray-500">Choosing one fills the email with the release title and note, and links recipients to What’s New.</p>
                </div>

                <div><label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Subject line</label><input value={emailForm.subject} onChange={(e) => setEmailForm((prev) => ({ ...prev, subject: e.target.value, preset: 'custom' }))} className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-900" /></div>
                <div><label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Email heading</label><input value={emailForm.title} onChange={(e) => setEmailForm((prev) => ({ ...prev, title: e.target.value, preset: 'custom' }))} className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-900" /></div>
                <div><label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Supporting line <span className="text-gray-400">(optional)</span></label><input value={emailForm.subtitle} onChange={(e) => setEmailForm((prev) => ({ ...prev, subtitle: e.target.value, preset: 'custom' }))} className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-900" /></div>
                <div><label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Message</label><textarea rows={9} value={emailForm.body} onChange={(e) => setEmailForm((prev) => ({ ...prev, body: e.target.value, preset: 'custom' }))} className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 leading-6 bg-white dark:bg-gray-900" /></div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><div><label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Button label</label><input value={emailForm.ctaLabel} onChange={(e) => setEmailForm((prev) => ({ ...prev, ctaLabel: e.target.value }))} className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-900" /></div><div><label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">WishTrail link</label><input value={emailForm.ctaUrl} onChange={(e) => setEmailForm((prev) => ({ ...prev, ctaUrl: e.target.value }))} placeholder="https://wishtrail.in/whats-new" className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-900" /></div></div>
                <p className="text-xs text-gray-500">For safety, the email only accepts WishTrail links.</p>
                <div className="flex flex-wrap items-center gap-3"><button onClick={sendEmail} disabled={!canSendEmail || emailLoading} className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50">{emailLoading ? 'Sending…' : 'Send Email'}</button>{emailError ? <p className="text-sm text-red-600">{emailError}</p> : null}{emailSuccess ? <p className="text-sm text-green-600">{emailSuccess}</p> : null}</div>
              </div>

              <div className="rounded-xl border border-gray-200 bg-gray-100 p-4 dark:border-gray-700 dark:bg-gray-900/50">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[#4c99e6]">Live email preview</p>
                <div className="mx-auto max-w-[600px] overflow-hidden rounded-xl bg-white shadow-lg dark:bg-white">
                  <div className="bg-gradient-to-br from-[#667eea] to-[#764ba2] px-6 py-7 text-center text-white"><p className="text-xl font-bold">WishTrail</p><h3 className="mt-4 text-2xl font-bold">{emailForm.title || 'Your email heading'}</h3>{emailForm.subtitle && <p className="mt-2 text-sm text-white/90">{emailForm.subtitle}</p>}</div>
                  <div className="p-6 text-gray-800"><h4 className="text-lg font-semibold">{emailForm.subject || 'Your subject line'}</h4><div className="mt-4 rounded-lg border border-gray-200 bg-gray-50 p-4 text-sm leading-6"><p>Hi Alex,</p><p className="mt-3 whitespace-pre-line">{emailForm.body || 'Your message will appear here.'}</p></div><div className="py-5 text-center"><span className="inline-block rounded-md bg-[#667eea] px-5 py-3 text-sm font-bold text-white">{emailForm.ctaLabel || 'Open WishTrail'}</span></div></div>
                  <div className="border-t border-gray-100 px-6 py-4 text-center text-xs text-gray-500">© 2026 WishTrail. All rights reserved.<br />Dreams. Goals. Progress.</div>
                </div>
                <p className="mt-3 break-all text-xs text-gray-500">Button destination: {emailForm.ctaUrl || 'https://wishtrail.in/dashboard'}</p>
              </div>
            </div>
          </SectionCard>
        )}

        {activeTab === 'Release Notes' && (
          <SectionCard title="Release Notes">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="text-sm text-gray-600 dark:text-gray-300">Create polished, user-friendly notes for What’s New. Use short headings, plain language, and bullet points.</p>
                  </div>
                  <button type="button" onClick={() => setReleaseNoteForm((prev) => ({ ...prev, description: RELEASE_NOTE_TEMPLATE }))} className="px-3 py-2 text-sm border border-blue-200 text-blue-700 dark:text-blue-300 dark:border-blue-800 rounded hover:bg-blue-50 dark:hover:bg-blue-950/30">Use writing guide</button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Release title</label>
                    <input value={releaseNoteForm.title} onChange={(e) => setReleaseNoteForm((prev) => ({ ...prev, title: e.target.value }))} placeholder="Smarter Progress & Better Conversations" className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-900" />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Version</label>
                    <input value={releaseNoteForm.version} onChange={(e) => setReleaseNoteForm((prev) => ({ ...prev, version: e.target.value }))} placeholder="1.3.0" className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-900" />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Primary category</label>
                    <select value={releaseNoteForm.type} onChange={(e) => setReleaseNoteForm((prev) => ({ ...prev, type: e.target.value }))} className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-900">
                      <option value="feature">Feature</option>
                      <option value="enhancement">Improvement</option>
                      <option value="bug_fix">Bug fix</option>
                    </select>
                  </div>
                  <label className="flex items-center gap-2 pt-6 text-sm text-gray-700 dark:text-gray-200">
                    <input type="checkbox" checked={releaseNoteForm.isMajor} onChange={(e) => setReleaseNoteForm((prev) => ({ ...prev, isMajor: e.target.checked }))} />
                    Show as a major release popup
                  </label>
                </div>

                <div>
                  <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Release note</label>
                  <textarea rows={13} value={releaseNoteForm.description} onChange={(e) => setReleaseNoteForm((prev) => ({ ...prev, description: e.target.value }))} placeholder="What’s new\n\n• Add a clear customer benefit.\n• Keep each point easy to scan." className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-900 leading-6" />
                  <p className="mt-1 text-xs text-gray-500">This is plain text. Line breaks and bullet characters are preserved on the website; Markdown is not rendered.</p>
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <button type="button" onClick={saveReleaseNote} disabled={releaseNotesSaving || !releaseNoteForm.title.trim() || !releaseNoteForm.version.trim() || !releaseNoteForm.description.trim()} className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50">{releaseNotesSaving ? 'Saving…' : editingReleaseVersion ? 'Save Changes' : 'Publish Release Note'}</button>
                  {editingReleaseVersion && <button type="button" onClick={resetReleaseNoteForm} className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded">Cancel editing</button>}
                  {releaseNotesError && <p className="text-sm text-red-600">{releaseNotesError}</p>}
                  {releaseNotesSuccess && <p className="text-sm text-green-600">{releaseNotesSuccess}</p>}
                </div>
              </div>

              <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 p-4 sm:p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-[#4c99e6]">Website preview</p>
                <div className="mt-3 rounded-2xl border border-gray-200 bg-white p-5 shadow-sm dark:border-gray-700 dark:bg-gray-800">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{releaseNoteForm.title || 'Your release title'}</h3>
                      <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">v{releaseNoteForm.version || '0.0.0'}</p>
                    </div>
                    <span className="rounded-full bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">{releaseNoteForm.isMajor ? 'Major' : 'Minor'} · {releaseNoteForm.type.replace('_', ' ')}</span>
                  </div>
                  <p className="mt-4 whitespace-pre-line text-sm leading-7 text-gray-700 dark:text-gray-300">{releaseNoteForm.description || 'Write a short, useful note that explains what changed and why it matters.'}</p>
                </div>
              </div>
            </div>

            <div className="mt-8 border-t border-gray-200 pt-6 dark:border-gray-700">
              <div className="flex items-center justify-between gap-3 mb-4">
                <div><h3 className="font-semibold text-gray-900 dark:text-white">Published release notes</h3><p className="text-sm text-gray-500">Select a note to edit it, or remove an outdated one.</p></div>
                <button type="button" onClick={loadReleaseNotes} className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded">Refresh</button>
              </div>
              {releaseNotesLoading ? <p>Loading release notes…</p> : null}
              {!releaseNotesLoading && releaseNotesData.updates.length === 0 ? <p className="text-sm text-gray-500">No release notes yet.</p> : null}
              <div className="space-y-3">
                {releaseNotesData.updates.map((update) => (
                  <article key={update.id || update.version} className="flex flex-col gap-3 rounded-xl border border-gray-200 p-4 dark:border-gray-700 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><h4 className="font-semibold text-gray-900 dark:text-white">{update.title}</h4><span className="text-xs text-gray-500">v{update.version}</span>{update.isMajor && <span className="rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-950/50 dark:text-blue-300">Major</span>}</div><p className="mt-1 line-clamp-2 whitespace-pre-line text-sm text-gray-600 dark:text-gray-300">{update.description}</p><p className="mt-2 text-xs text-gray-400">{update.createdAt ? new Date(update.createdAt).toLocaleDateString() : ''} · {String(update.type || 'feature').replace('_', ' ')}</p></div>
                    <div className="flex shrink-0 gap-2"><button type="button" onClick={() => editReleaseNote(update)} className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded">Edit</button><button type="button" onClick={() => deleteReleaseNote(update.version)} className="px-3 py-2 text-sm border border-red-200 text-red-600 rounded dark:border-red-900">Delete</button></div>
                  </article>
                ))}
              </div>
            </div>
          </SectionCard>
        )}

        {activeTab === 'Analytics' && (
          <SectionCard title="Analytics">
            {analyticsLoading ? <p>Loading analytics...</p> : null}
            {analyticsError ? <p className="text-red-600 text-sm">{analyticsError}</p> : null}
            {!analyticsLoading && !analyticsError && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                <div className="border border-gray-200 dark:border-gray-700 rounded p-4">
                  <p className="text-sm text-gray-500">Total Users</p>
                  <p className="text-2xl font-semibold">{analytics.totalUsers}</p>
                </div>
                <div className="border border-gray-200 dark:border-gray-700 rounded p-4">
                  <p className="text-sm text-gray-500">Active Today</p>
                  <p className="text-2xl font-semibold">{analytics.activeToday}</p>
                </div>
                <div className="border border-gray-200 dark:border-gray-700 rounded p-4">
                  <p className="text-sm text-gray-500">Inactive Users</p>
                  <p className="text-2xl font-semibold">{analytics.inactiveUsers}</p>
                </div>
                <div className="border border-gray-200 dark:border-gray-700 rounded p-4">
                  <p className="text-sm text-gray-500">Total Goals</p>
                  <p className="text-2xl font-semibold">{analytics.totalGoals}</p>
                </div>
              </div>
            )}
          </SectionCard>
        )}

      </div>
    </div>
  );
}

export default AdminPage;
