# Dark theme implementation

Extended the existing `--wt-*` tokens and mapped dark Tailwind variants to semantic canvas, surface, elevated, ink, muted, and line utilities. Existing light utility values remain in place. Custom CSS covers navigation, profile, habits, Weekly Trail, leaderboard, goal detail, and landing previews. Goal art and share exports have intentional dark palettes; user images are not globally filtered.

Light/Dark/System selection is stored in the existing Zustand persistence record. Legacy boolean preferences migrate; System follows media-query changes. Theme initialization runs before the application mounts. Both settings entry points use the same selector. Theme choice is now device-local, so an account fetch cannot overwrite System mode. The WebView receives a same-origin-checked theme message for its background and status bar.

The fourth mobile navigation destination is Discover, as requested by the specification; safe-area placement is retained. Selected tabs retain a surface indicator. Existing reduced-motion CSS and keyboard focus styles remain active. Placeholder text uses a slightly brighter gray than the proposed palette to improve readability.

## Validation

- Frontend ESLint passed.
- Production Vite build passed (existing Browserslist and PostCSS warnings remain).
- Frontend Node tests: 40 passed.
- Native-shell Node tests: 18 passed.
- Shared PillTabs now guards unavailable ResizeObserver and missing nodes, resolving the renderer test failures.

## Remaining verification

Interactive desktop/mobile screenshots, authenticated route visual review, exported-image visual inspection, and physical-device testing were not performed. Android system navigation-bar coloring is not explicitly controlled by the existing shell; the implementation synchronizes its status bar and safe-area/WebView background. Native onboarding and startup splash artwork retain their existing styling. Contrast has not been exhaustively audited across every semantic badge and CTA state.

## Changed files

- `app/index.js`
- `frontend/index.html`
- `frontend/src/App.jsx`
- `frontend/src/components/AbstractGoalArtwork.jsx`
- `frontend/src/components/ActivityCalendar.jsx`
- `frontend/src/components/ActivityCommentsModal.jsx`
- `frontend/src/components/ActivityDetailModal.jsx`
- `frontend/src/components/ActivityFeed.jsx`
- `frontend/src/components/AnalyticsRangeSelect.jsx`
- `frontend/src/components/AvatarCropModal.jsx`
- `frontend/src/components/BlockModal.jsx`
- `frontend/src/components/BottomTabBar.jsx`
- `frontend/src/components/CategoryTileSelector.jsx`
- `frontend/src/components/CelebrationModal.jsx`
- `frontend/src/components/CompletionModal.jsx`
- `frontend/src/components/ConfirmActionModal.jsx`
- `frontend/src/components/CoverCropModal.jsx`
- `frontend/src/components/CreateGoalWizard.jsx`
- `frontend/src/components/CreateHabitModal.jsx`
- `frontend/src/components/CreateWishModal.jsx`
- `frontend/src/components/DailyLogsEntryModal.jsx`
- `frontend/src/components/DailyLogsExportModal.jsx`
- `frontend/src/components/DailyLogsPromptModal.jsx`
- `frontend/src/components/DeleteConfirmModal.jsx`
- `frontend/src/components/DependencyWarningModal.jsx`
- `frontend/src/components/EditHabitModal.jsx`
- `frontend/src/components/ErrorScreen.jsx`
- `frontend/src/components/FeedbackButton.jsx`
- `frontend/src/components/FollowListModal.jsx`
- `frontend/src/components/Footer.jsx`
- `frontend/src/components/ForgotPasswordModal.jsx`
- `frontend/src/components/GoalCategoryBanner.jsx`
- `frontend/src/components/GoalDetailsModal.jsx`
- `frontend/src/components/GoalDivisionEditor.jsx`
- `frontend/src/components/GoalHero.jsx`
- `frontend/src/components/GoalPostModal.jsx`
- `frontend/src/components/GoalSuggestions.jsx`
- `frontend/src/components/GoalSuggestionsModal.jsx`
- `frontend/src/components/HabitAnalyticsCard.jsx`
- `frontend/src/components/HabitDetailModal.jsx`
- `frontend/src/components/HabitSuggestions.jsx`
- `frontend/src/components/HabitSuggestionsModal.jsx`
- `frontend/src/components/HabitsPanel.jsx`
- `frontend/src/components/HabitsWorkspace.jsx`
- `frontend/src/components/Header.jsx`
- `frontend/src/components/HomeOverview.jsx`
- `frontend/src/components/MetricInfoModal.jsx`
- `frontend/src/components/MotivationModal.jsx`
- `frontend/src/components/MultiStepSignup.jsx`
- `frontend/src/components/PillTabs.jsx`
- `frontend/src/components/PremiumUpgradeModal.jsx`
- `frontend/src/components/PromotionCard.jsx`
- `frontend/src/components/ReportModal.jsx`
- `frontend/src/components/SettingsModal.jsx`
- `frontend/src/components/ShareSheet.jsx`
- `frontend/src/components/ShareableGoalCard.jsx`
- `frontend/src/components/StartupSkeleton.jsx`
- `frontend/src/components/Timeline.jsx`
- `frontend/src/components/VideoEmbedGrid.jsx`
- `frontend/src/components/WebPushSettings.jsx`
- `frontend/src/components/WhatsNewModal.jsx`
- `frontend/src/components/WishCard.jsx`
- `frontend/src/components/account/AccountMenuSheet.jsx`
- `frontend/src/components/community/CommunityDashboard.jsx`
- `frontend/src/components/community/CommunityItems.jsx`
- `frontend/src/components/community/CommunityMembers.jsx`
- `frontend/src/components/community/CommunitySettings.jsx`
- `frontend/src/components/community/DeleteCommunityModal.jsx`
- `frontend/src/components/community/InterestsMultiSelect.jsx`
- `frontend/src/components/loader/SkeletonCard.jsx`
- `frontend/src/components/loader/SkeletonNotifications.jsx`
- `frontend/src/components/premium/PremiumComponents.jsx`
- `frontend/src/components/settings/AccountSection.jsx`
- `frontend/src/components/settings/BlockedUsersSettings.jsx`
- `frontend/src/components/settings/MaintenanceSettings.jsx`
- `frontend/src/components/settings/NotificationsSection.jsx`
- `frontend/src/components/settings/PersonalInfoSection.jsx`
- `frontend/src/components/settings/PrivacySettings.jsx`
- `frontend/src/components/settings/SecuritySection.jsx`
- `frontend/src/components/settings/ThemeSettings.jsx`
- `frontend/src/components/weeklyTrail.css`
- `frontend/src/index.css`
- `frontend/src/main.jsx`
- `frontend/src/pages/AuthPage.jsx`
- `frontend/src/pages/CommunitiesPage.jsx`
- `frontend/src/pages/CommunityDetailPage.jsx`
- `frontend/src/pages/CommunityGuidelines.jsx`
- `frontend/src/pages/CopyrightPolicy.jsx`
- `frontend/src/pages/DashboardPage.jsx`
- `frontend/src/pages/DiscoverPage.jsx`
- `frontend/src/pages/FeedPage.jsx`
- `frontend/src/pages/GoalAnalyticsPage.jsx`
- `frontend/src/pages/HabitAnalyticsPage.jsx`
- `frontend/src/pages/HomePage.css`
- `frontend/src/pages/InspirationPage.jsx`
- `frontend/src/pages/LeaderboardPage.css`
- `frontend/src/pages/MaintenancePage.jsx`
- `frontend/src/pages/NotFoundPage.jsx`
- `frontend/src/pages/NotificationsPage.jsx`
- `frontend/src/pages/PrivacyPolicy.jsx`
- `frontend/src/pages/ProfilePage.jsx`
- `frontend/src/pages/ResetPasswordPage.jsx`
- `frontend/src/pages/SettingsPage.jsx`
- `frontend/src/pages/SupportPage.jsx`
- `frontend/src/pages/TermsOfService.jsx`
- `frontend/src/pages/WhatsNewPage.jsx`
- `frontend/src/store/apiStore.js`
- `frontend/tailwind.config.js`
- `frontend/src/utils/theme.js`
- `frontend/tests/theme.test.mjs`
