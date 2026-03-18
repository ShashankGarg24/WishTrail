import { useEffect, useMemo, useState } from 'react';
import { adminAPI, adminAuth } from '../services/adminApi';

const TABS = ['Users', 'Goals', 'Habits', 'Email', 'Analytics'];

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
  const [usersQuery, setUsersQuery] = useState({ page: 1, limit: 20, search: '', inactiveDays: '' });
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

  const [emailForm, setEmailForm] = useState({
    mode: 'selected',
    preset: 'custom',
    inactiveDays: 30,
    subject: '',
    title: '',
    subtitle: '',
    body: '',
    ending: ''
  });
  const [emailLoading, setEmailLoading] = useState(false);
  const [emailError, setEmailError] = useState('');
  const [emailSuccess, setEmailSuccess] = useState('');

  const canSendEmail = useMemo(() => {
    if (!emailForm.subject.trim() || !emailForm.title.trim() || !emailForm.body.trim() || !emailForm.ending.trim()) return false;
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
      ending: preset.ending
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
        ending: emailForm.ending
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
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
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
                      <th className="py-2">Completed Goals</th>
                      <th className="py-2">Total Goals</th>
                      <th className="py-2">Total Habits</th>
                      <th className="py-2">Last Active</th>
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
                        <td className="py-2">{user.completedGoals || 0}</td>
                        <td className="py-2">{user.totalGoals || 0}</td>
                        <td className="py-2">{user.totalHabits || 0}</td>
                        <td className="py-2">{user.lastActiveAt ? new Date(user.lastActiveAt).toLocaleString() : '-'}</td>
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
          <SectionCard title="Email">
            <div className="space-y-4">
              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Audience</label>
                <select
                  value={emailForm.mode}
                  onChange={(e) => setEmailForm((prev) => ({ ...prev, mode: e.target.value }))}
                  className="w-full sm:w-80 border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-900"
                >
                  <option value="selected">Selected users</option>
                  <option value="all">All users</option>
                  <option value="inactive">Inactive users</option>
                </select>
              </div>

              {emailForm.mode === 'inactive' && (
                <div>
                  <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Inactive more than (days)</label>
                  <input
                    type="number"
                    min="1"
                    value={emailForm.inactiveDays}
                    onChange={(e) => setEmailForm((prev) => ({ ...prev, inactiveDays: e.target.value }))}
                    className="w-full sm:w-80 border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-900"
                  />
                </div>
              )}

              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Preset</label>
                <select
                  value={emailForm.preset}
                  onChange={(e) => applyEmailPreset(e.target.value)}
                  className="w-full sm:w-80 border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-900"
                >
                  <option value="custom">Custom</option>
                  <option value="inactivity">Inactivity</option>
                  <option value="noGoals">Users With No Goals</option>
                  <option value="comeback">Comebacks</option>
                  <option value="featureRelease">Feature Releases</option>
                  <option value="motivation">Motivation Quotes</option>
                  <option value="feedback">Feedbacks</option>
                </select>
              </div>

              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Subject</label>
                <input
                  value={emailForm.subject}
                  onChange={(e) => setEmailForm((prev) => ({ ...prev, subject: e.target.value, preset: 'custom' }))}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Title</label>
                <input
                  value={emailForm.title}
                  onChange={(e) => setEmailForm((prev) => ({ ...prev, title: e.target.value, preset: 'custom' }))}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Subtitle</label>
                <input
                  value={emailForm.subtitle}
                  onChange={(e) => setEmailForm((prev) => ({ ...prev, subtitle: e.target.value, preset: 'custom' }))}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-600 dark:text-gray-300 mb-1">Body</label>
                <textarea
                  rows={8}
                  value={emailForm.body}
                  onChange={(e) => setEmailForm((prev) => ({ ...prev, body: e.target.value, preset: 'custom' }))}
                  className="w-full border border-gray-300 dark:border-gray-600 rounded px-3 py-2 bg-white dark:bg-gray-900"
                />
              </div>

              <button
                onClick={sendEmail}
                disabled={!canSendEmail || emailLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50"
              >
                {emailLoading ? 'Sending...' : 'Send Email'}
              </button>

              {emailError ? <p className="text-sm text-red-600">{emailError}</p> : null}
              {emailSuccess ? <p className="text-sm text-green-600">{emailSuccess}</p> : null}
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
