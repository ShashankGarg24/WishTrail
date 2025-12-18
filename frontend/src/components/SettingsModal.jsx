import { useEffect, useState } from 'react';
import { lockBodyScroll, unlockBodyScroll } from '../utils/scrollLock';
import { motion } from 'framer-motion';
import { X, Lock, Shield, Settings, Bell, UserX, Palette, ArrowLeft } from 'lucide-react';
import useApiStore from '../store/apiStore';

// Import new settings components
import PrivacySettings from './settings/PrivacySettings';
import ThemeSettings from './settings/ThemeSettings';
import BlockedUsersSettings from './settings/BlockedUsersSettings';
import NotificationsSettings from './settings/NotificationsSettings';
import PasswordSettings from './settings/PasswordSettings';

const SettingsModal = ({ isOpen, onClose }) => {
  const { user, logout } = useApiStore();
  const [activeTab, setActiveTab] = useState('privacy');
  const [mobileView, setMobileView] = useState('tabs'); // 'tabs' or 'content'

  // Tab configuration using new components
  const tabs = [
    {
      id: 'privacy',
      label: 'Privacy',
      icon: Shield,
      component: <PrivacySettings />
    },
    {
      id: 'theme',
      label: 'Theme',
      icon: Palette,
      component: <ThemeSettings />
    },
    {
      id: 'blocked',
      label: 'Blocked',
      icon: UserX,
      component: <BlockedUsersSettings />
    },
    {
      id: 'notifications',
      label: 'Notifications',
      icon: Bell,
      component: <NotificationsSettings />
    },
    {
      id: 'password',
      label: 'Password',
      icon: Lock,
      component: <PasswordSettings />
    }
  ];

  useEffect(() => {
    if (isOpen) {
      lockBodyScroll();
      // Reset mobile view to tabs when modal opens (only on mobile)
      if (window.innerWidth < 768) {
        setMobileView('tabs');
      }
      return () => unlockBodyScroll();
    }
    return undefined;
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-[150]"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 20 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 20 }}
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-gray-800 rounded-2xl w-full max-w-5xl h-[700px] overflow-hidden shadow-2xl border border-gray-200 dark:border-gray-700 flex flex-col"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 flex-shrink-0">
          <div className="flex items-center space-x-2">
            {/* Mobile back button - only show when in content view */}
            {mobileView === 'content' && (
              <button
                onClick={() => setMobileView('tabs')}
                className="md:hidden p-2 -ml-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors mr-2"
              >
                <ArrowLeft className="h-5 w-5 text-gray-500 dark:text-gray-400" />
              </button>
            )}
            <Settings className="h-6 w-6 text-primary-600" />
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            <X className="h-5 w-5 text-gray-500 dark:text-gray-400" />
          </button>
        </div>

        {/* Main Content Area with Sidebar */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left Sidebar - Desktop */}
          <div className="hidden md:flex w-64 border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 flex-col flex-shrink-0">
            <nav className="flex-1 p-2 space-y-1 overflow-y-auto">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-primary-600 text-white'
                        : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Mobile Tab List */}
          {mobileView === 'tabs' && (
            <div className="md:hidden flex-1 overflow-y-auto p-4 space-y-2">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => {
                      setActiveTab(tab.id);
                      setMobileView('content');
                    }}
                    className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700"
                  >
                    <Icon className="h-5 w-5" />
                    <span>{tab.label}</span>
                  </button>
                );
              })}
            </div>
          )}

          {/* Content Area - Desktop always visible, Mobile only when mobileView is 'content' */}
          <div className={`flex-1 overflow-y-auto p-6 ${mobileView === 'tabs' ? 'hidden md:block' : ''}`}>
            {tabs.find(tab => tab.id === activeTab)?.component}
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default SettingsModal;
