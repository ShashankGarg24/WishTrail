import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { User, Shield, Bell, Settings as SettingsIcon } from 'lucide-react';
import PersonalInfoSection from '../components/settings/PersonalInfoSection';
import SecuritySection from '../components/settings/SecuritySection';
import NotificationsSection from '../components/settings/NotificationsSection';
import AccountSection from '../components/settings/AccountSection';

const SettingsPageNew = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  let initialTab = searchParams.get('section') || searchParams.get('tab') || 'personal-info';
  // Normalize 'personal' to 'personal-info'
  if (initialTab === 'personal') initialTab = 'personal-info';
  const [activeSection, setActiveSection] = useState(initialTab);

  const sections = [
    {
      id: 'personal-info',
      label: 'Personal Info',
      icon: User,
      component: PersonalInfoSection
    },
    {
      id: 'security',
      label: 'Security',
      icon: Shield,
      component: SecuritySection
    },
    // {
    //   id: 'notifications',
    //   label: 'Notifications',
    //   icon: Bell,
    //   component: NotificationsSection
    // },
    {
      id: 'account',
      label: 'Account',
      icon: SettingsIcon,
      component: AccountSection
    }
  ];

  const handleSectionChange = (sectionId) => {
    setActiveSection(sectionId);
    setSearchParams({ section: sectionId });
  };

  const ActiveComponent = sections.find(s => s.id === activeSection)?.component || PersonalInfoSection;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-7xl mx-auto px-3 sm:px-4 md:px-6 lg:px-8 py-4 sm:py-6 md:py-8">
        {/* Header */}
        <div className="mb-4 sm:mb-6 md:mb-8">
          <h1 className="text-2xl sm:text-3xl md:text-3xl font-bold text-gray-900 dark:text-white">Settings</h1>
          <p className="mt-1 sm:mt-2 text-xs sm:text-sm text-gray-600 dark:text-gray-400">
            Manage your account preferences, subscription, and data security.
          </p>
        </div>

        <div className="flex flex-col lg:flex-row gap-4 sm:gap-6">
          {/* Sidebar Navigation - Desktop */}
          <div className="hidden lg:block w-56 xl:w-64 flex-shrink-0">
            <nav className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-2">
              {sections.map((section) => {
                const Icon = section.icon;
                const isActive = activeSection === section.id;
                return (
                  <button
                    key={section.id}
                    onClick={() => handleSectionChange(section.id)}
                    className={`w-full flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-2.5 sm:py-3 rounded-lg text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                    }`}
                  >
                    <Icon className="h-4 w-4 sm:h-5 sm:w-5 flex-shrink-0" />
                    <span>{section.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Mobile Tabs */}
          <div className="lg:hidden">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-1 flex gap-1 overflow-x-auto scrollbar-hide">
              {sections.map((section) => {
                const Icon = section.icon;
                const isActive = activeSection === section.id;
                return (
                  <button
                    key={section.id}
                    onClick={() => handleSectionChange(section.id)}
                    className={`flex items-center gap-1.5 sm:gap-2 px-3 sm:px-4 py-2 sm:py-2.5 rounded-lg text-xs sm:text-sm font-medium whitespace-nowrap transition-all flex-1 justify-center ${
                      isActive
                        ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700/50'
                    }`}
                  >
                    <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4 flex-shrink-0" />
                    <span className="hidden xs:inline sm:inline">{section.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 min-w-0">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700">
              <ActiveComponent />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPageNew;
