import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useNavigate, useSearchParams } from "react-router-dom";
import toast from "react-hot-toast";
import {
  BookOpen,
  Clock3,
  Compass,
  Home,
  LayoutGrid,
  Search,
  Settings,
  SlidersHorizontal,
  Target,
  TrendingUp,
  Trophy,
  User,
  Users,
  X,
  Zap,
} from "lucide-react";
import useApiStore from "../store/apiStore";
import { GOAL_CATEGORIES } from "../constants/goalCategories";
import CategoryIcon from "../components/CategoryIcon";
import GoalCategoryBanner from "../components/GoalCategoryBanner";
import { getCategoryLabel } from "../utils/categoryIcons";

const GoalPostModal = lazy(() => import("../components/GoalPostModal"));
const navItems = [
  ["Home", Home, "/home"],
  ["Explore", Compass, "/discover"],
  ["Feed", LayoutGrid, "/feed"],
  ["Goals", Target, "/home?tab=goals"],
  ["Habits", Zap, "/home?tab=habits"],
  ["Journal", BookOpen, "journal"],
  ["Leaderboard", Trophy, "/leaderboard"],
];
const categories = [{ id: "all", label: "All" }, ...GOAL_CATEGORIES];
const idOf = (item) => item?._id || item?.id;
const normalizedCategory = (value) =>
  String(value || "OTHER")
    .toUpperCase()
    .replace(/[^A-Z]+/g, "_");
const categoryLabel = getCategoryLabel;
const createdDate = (goal) => {
  const value = goal?.createdAt || goal?.created_at;
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(date);
};
const goalImage = (goal) =>
  goal?.coverImage ||
  goal?.image ||
  goal?.attachmentUrl || null;
const progressOf = (goal) =>
  Math.max(
    0,
    Math.min(
      100,
      Number(
        goal?.progressPercentage ??
          goal?.progress ??
          goal?.completionPercentage ??
          0,
      ),
    ),
  );
const ownerOf = (goal) => goal?.user || goal?.owner || goal?.createdBy || {};
const avatar = (person) =>
  person?.avatar || person?.profilePicture || person?.photoURL || "";
function Avatar({ person, size = "h-10 w-10" }) {
  const src = avatar(person);
  return (
    <span
      className={`${size} grid shrink-0 place-items-center overflow-hidden rounded-full bg-gradient-to-br from-blue-100 to-indigo-100 text-xs font-extrabold text-blue-700 ring-1 ring-white`}
    >
      {src ? (
        <img src={src} alt="" className="h-full w-full object-cover" />
      ) : (
        (person?.name?.[0] || person?.username?.[0] || "W").toUpperCase()
      )}
    </span>
  );
}
function CategoryPill({ category, active, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`shrink-0 rounded-lg border px-3 py-1.5 text-[10px] font-semibold transition ${active ? "border-blue-500 bg-[#0784f8] text-white shadow-sm" : "border-slate-200 bg-white text-slate-600 hover:border-blue-300 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"}`}
    >
      {category.label}
    </button>
  );
}
function SectionTitle({ icon: Icon, title, subtitle, onSeeAll }) {
  return (
    <div className="mb-3 flex items-start justify-between gap-3">
      <div className="flex gap-2.5">
        <Icon className="mt-0.5 h-5 w-5 text-[#0784f8]" />
        <div>
          <h2 className="text-base font-extrabold text-[#0d1740] dark:text-white">
            {title}
          </h2>
          {subtitle && <p className="text-[11px] text-slate-500">{subtitle}</p>}
        </div>
      </div>
      {onSeeAll && (
        <button
          onClick={onSeeAll}
          className="shrink-0 pt-1 text-[11px] font-bold text-[#0784f8]"
        >
          See all
        </button>
      )}
    </div>
  );
}

function DiscoverHero({
  title,
  subtitle,
  placeholder,
  query,
  setQuery,
  searchRef,
  category,
  setCategory,
  showCategories = false,
  onFilters,
  activeFilters = 0,
}) {
  return (
    <div className="relative mx-3 mt-3 hidden min-h-[165px] overflow-hidden rounded-xl bg-gradient-to-br from-[#397fbd] to-[#4c99e6] px-5 py-6 text-white md:block">
      <div className="absolute -right-10 -top-20 h-56 w-56 rounded-full border border-white/20" /><div className="absolute bottom-5 left-1/3 h-px w-2/3 -rotate-6 bg-white/20" />
      <div className="relative flex h-full items-center justify-between gap-8">
        <div className="max-w-sm">
          <h1 className="text-2xl font-extrabold">{title}</h1>
          <p className="mt-1 text-sm text-white/90">{subtitle}</p>
        </div>
        <div className="hidden w-[48%] lg:block">
          <div className="flex items-stretch gap-2">
            <div className="flex min-w-0 flex-1 overflow-hidden rounded-xl bg-white shadow-lg">
              <input
                ref={searchRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={placeholder}
                className="min-w-0 flex-1 px-4 py-3 text-xs text-slate-900 outline-none"
              />
              <button type="button" onClick={() => searchRef.current?.focus()} className="m-1 grid w-10 place-items-center rounded-lg bg-[#0784f8]" aria-label="Search">
                <Search className="h-4 w-4" />
              </button>
            </div>
            <button type="button" onClick={onFilters} className="flex shrink-0 items-center gap-1.5 rounded-xl bg-white px-3 text-[10px] font-bold text-[#0784f8] shadow-lg">
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Filters{activeFilters ? ` (${activeFilters})` : ""}
            </button>
          </div>
          {showCategories && (
            <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1 scrollbar-hide">
              {categories.map((item) => (
                <CategoryPill
                  key={item.id}
                  category={item}
                  active={category === item.id}
                  onClick={() => setCategory(item.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function GoalCard({ goal, featured = false, onOpen }) {
  const owner = ownerOf(goal),
    progress = progressOf(goal),
    date = createdDate(goal);
  return (
    <button
      type="button"
      onClick={onOpen}
      className={`group flex h-[230px] flex-col overflow-hidden rounded-xl border border-slate-200 bg-white text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-gray-700 dark:bg-gray-800 md:h-[245px] ${featured ? "w-[250px] min-w-[250px] md:w-auto md:min-w-0" : "w-full"}`}
    >
      <div
        className={`${featured ? "h-28 md:h-32" : "h-24"} relative overflow-hidden bg-slate-100`}
      >
        {goalImage(goal) ? <img src={goalImage(goal)} alt="" className="h-full w-full object-cover transition duration-500 group-hover:scale-105" /> : <GoalCategoryBanner category={goal.category} variant="compact" className="h-full rounded-none" />}
      </div>
      <div className="flex min-h-0 flex-1 flex-col px-3 pb-3 pt-3">
        <h3 className="truncate text-sm font-extrabold">
          {goal.title || "Untitled goal"}
        </h3>
        <div className="mt-2 flex items-center gap-2">
          <Avatar person={owner} size="h-6 w-6" />
          <span className="max-w-[90px] truncate text-[10px] font-semibold text-slate-600 dark:text-gray-300">
            {owner.name || owner.username || "WishTrail member"}
          </span>
          <span className="ml-auto rounded-md bg-blue-50 px-2 py-1 text-[9px] font-semibold text-blue-600">
            {categoryLabel(goal.category)}
          </span>
        </div>
        <div className="mt-auto pt-3">
          <div className="mb-1.5 flex items-center justify-between text-[10px]">
            <span className="font-semibold text-slate-500">Progress</span>
            <span className="font-extrabold text-emerald-600 dark:text-emerald-400">{progress}%</span>
          </div>
          <span className="block h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-gray-700">
            <span
              className="block h-full rounded-full bg-emerald-400 transition-[width]"
              style={{ width: `${progress}%` }}
            />
          </span>
          {date && <p className="mt-2 text-[10px] text-slate-500">Created {date}</p>}
        </div>
      </div>
    </button>
  );
}
function GoalResult({ goal, onOpen }) {
  const progress = progressOf(goal),
    date = createdDate(goal);
  return (
    <button
      type="button"
      onClick={onOpen}
      className="flex w-full gap-3 border-b border-slate-100 bg-white px-4 py-3 text-left last:border-0 dark:border-gray-700 dark:bg-gray-900"
    >
      {goalImage(goal) ? <div className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-xl bg-blue-50"><img src={goalImage(goal)} alt="" className="h-full w-full object-cover" /></div> : <CategoryIcon category={goal.category} size="lg" />}
      <div className="min-w-0 flex-1">
        <h3 className="truncate text-sm font-extrabold">
          {goal.title || "Untitled goal"}
        </h3>
        <p className="mt-0.5 text-[10px] text-slate-500">
          {goal.followersCount ?? goal.userCount ?? 0} users ·{" "}
          {categoryLabel(goal.category)}
          {date ? ` · Created ${date}` : ""}
        </p>
        {goal.description && (
          <p className="mt-1 line-clamp-1 text-[11px] text-slate-500">
            {goal.description}
          </p>
        )}
        <div className="mt-1.5 flex items-center gap-2">
          <span className="h-1.5 flex-1 rounded-full bg-slate-100">
            <span
              className="block h-full rounded-full bg-emerald-400"
              style={{ width: `${progress}%` }}
            />
          </span>
          <span className="text-[10px] font-bold">{progress}%</span>
        </div>
      </div>
    </button>
  );
}
function PersonRow({ person, onFollow, onProfile }) {
  const following = Boolean(person.following || person.isFollowing);
  return (
    <div className="flex items-center gap-3 border-b border-slate-100 bg-white px-4 py-3 last:border-0 dark:border-gray-700 dark:bg-gray-900">
      <button type="button" onClick={onProfile}>
        <Avatar person={person} size="h-11 w-11" />
      </button>
      <button
        type="button"
        onClick={onProfile}
        className="min-w-0 flex-1 text-left"
      >
        <p className="truncate text-sm font-extrabold">
          {person.name || "WishTrail member"}
        </p>
        <p className="truncate text-[10px] text-slate-500">
          @{String(person.username || "member").replace(/^@/, "")}
        </p>
        <p className="mt-0.5 truncate text-[10px] text-slate-500">
          {(person.interests || []).slice(0, 3).join(" · ") ||
            `${person.totalGoals || person.stats?.goals || 0} goals · ${person.followersCount || 0} followers`}
        </p>
      </button>
      <button
        type="button"
        onClick={onFollow}
        className="rounded-lg bg-[#eaf5ff] px-4 py-2 text-[11px] font-bold text-[#0784f8]"
      >
        {following ? "Following" : "Follow"}
      </button>
    </div>
  );
}
function Filters({ open, onClose, value, onApply }) {
  const [draft, setDraft] = useState(value);
  useEffect(() => {
    if (open) setDraft(value);
  }, [open, value]);
  const options = [
    [
      "Category",
      "category",
      ["All", ...GOAL_CATEGORIES.map((category) => category.label)],
    ],
    [
      "Timeframe",
      "timeframe",
      ["All", "3 months", "6 months", "This year"],
    ],
  ];
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[120] bg-black/35 md:flex md:items-center md:justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
            className="absolute inset-x-0 bottom-0 max-h-[92vh] overflow-y-auto rounded-t-3xl bg-white px-5 pb-[calc(22px+env(safe-area-inset-bottom))] pt-4 md:static md:w-[440px] md:rounded-2xl dark:bg-gray-900"
          >
            <div className="mb-5 flex items-center justify-between">
              <button onClick={onClose}>
                <X className="h-5 w-5" />
              </button>
              <h2 className="text-sm font-extrabold">Filter Goals</h2>
              <button
                onClick={() =>
                  setDraft({
                    category: "All",
                    timeframe: "All",
                  })
                }
                className="text-xs font-semibold text-[#0784f8]"
              >
                Reset
              </button>
            </div>
            {options.map(([label, key, choices]) => (
              <fieldset key={key} className="mb-5">
                <legend className="mb-2 text-xs font-extrabold">{label}</legend>
                <div className="flex flex-wrap gap-2">
                  {choices.map((choice) => (
                    <button
                      type="button"
                      key={choice}
                      onClick={() => setDraft((d) => ({ ...d, [key]: choice }))}
                      className={`rounded-lg border px-3 py-2 text-[10px] font-semibold ${draft[key] === choice ? "border-[#0784f8] bg-[#0784f8] text-white" : "border-slate-200 bg-slate-50 text-slate-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300"}`}
                    >
                      {choice}
                    </button>
                  ))}
                </div>
              </fieldset>
            ))}
            <button
              onClick={() => {
                onApply(draft);
                onClose();
              }}
              className="w-full rounded-xl bg-[#0784f8] py-3 text-sm font-bold text-white"
            >
              Apply Filters
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export default function DiscoverPage() {
  const navigate = useNavigate(),
    [searchParams, setSearchParams] = useSearchParams();
  const {
    user,
    getTrendingGoals,
    searchPublicGoals,
    searchUsers,
    followUser,
    unfollowUser,
  } = useApiStore();
  const tab = searchParams.get("tab") === "people" ? "people" : "goals";
  const [query, setQuery] = useState(searchParams.get("q") || ""),
    [debounced, setDebounced] = useState(query),
    [category, setCategory] = useState("all");
  const [goals, setGoals] = useState([]),
    [people, setPeople] = useState([]),
    [loading, setLoading] = useState(true),
    [goalId, setGoalId] = useState(null),
    [filtersOpen, setFiltersOpen] = useState(false);
  const [filters, setFilters] = useState({
      category: "All",
      timeframe: "All",
    }),
    searchRef = useRef(null);
  const trimmedQuery = query.trim();
  const isSearching = trimmedQuery.length >= 2;
  const isShortQuery = trimmedQuery.length === 1;
  useEffect(() => {
    if (trimmedQuery.length < 2) {
      setDebounced("");
      return undefined;
    }
    const timer = setTimeout(() => setDebounced(trimmedQuery), 350);
    return () => clearTimeout(timer);
  }, [trimmedQuery]);
  useEffect(() => {
    const interest = searchParams.get("interest");
    if (interest) {
      const matched = GOAL_CATEGORIES.find(item => item.label.toLowerCase() === interest.toLowerCase() || item.id === normalizedCategory(interest));
      setCategory(matched?.id || normalizedCategory(interest));
    } else if (category !== "all" && !searchParams.get("category")) {
      setCategory("all");
    }
  }, [searchParams]);
  useEffect(() => {
    setSearchParams(
      (p) => {
        const next = new URLSearchParams(p);
        if (trimmedQuery.length >= 2) next.set("q", trimmedQuery);
        else next.delete("q");
        return next;
      },
      { replace: true },
    );
  }, [trimmedQuery, setSearchParams]);
  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      if (isShortQuery) {
        if (tab === "goals") setGoals([]);
        else setPeople([]);
        setLoading(false);
        return;
      }
      if (isSearching && debounced !== trimmedQuery) {
        setLoading(true);
        return;
      }
      setLoading(true);
      try {
        if (tab === "goals") {
          const filterCategories = Object.fromEntries(
            GOAL_CATEGORIES.map((item) => [item.label, item.id]),
          );
          const selected =
            category !== "all" ? category : filterCategories[filters.category];
          const result =
            debounced || selected
              ? await searchPublicGoals({
                  ...(debounced ? { q: debounced } : {}),
                  ...(selected ? { category: selected } : {}),
                  limit: 40,
                })
              : await getTrendingGoals({
                  page: 1,
                  limit: 30,
                  strategy: user?.interests?.length ? "personalized" : "global",
                });
          if (!cancelled) setGoals(result?.goals || []);
        } else if (tab === "people") {
          const result = await searchUsers({
            ...(debounced ? { search: debounced } : {}),
            limit: 40,
          });
          if (!cancelled)
            setPeople(
              (result?.users || []).map((x) => ({
                ...x,
                following: Boolean(x.isFollowing),
              })),
            );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => {
      cancelled = true;
    };
  }, [
    tab,
    debounced,
    trimmedQuery,
    isSearching,
    isShortQuery,
    category,
    filters.category,
    getTrendingGoals,
    searchPublicGoals,
    searchUsers,
    user?.interests,
  ]);
  const shownGoals = useMemo(() => {
    let list = [...goals];
    const now = new Date(),
      deadline =
        filters.timeframe === "3 months"
          ? new Date(now.getFullYear(), now.getMonth() + 3, now.getDate())
          : filters.timeframe === "6 months"
            ? new Date(now.getFullYear(), now.getMonth() + 6, now.getDate())
            : filters.timeframe === "This year"
              ? new Date(now.getFullYear(), 11, 31, 23, 59, 59)
              : null;
    if (deadline)
      list = list.filter(
        (x) =>
          x.targetDate &&
          new Date(x.targetDate) >= now &&
          new Date(x.targetDate) <= deadline,
      );
    return list;
  }, [goals, filters]);
  const follow = async (person) => {
    const id = idOf(person);
    if (!id) return;
    const was = Boolean(person.following || person.isFollowing),
      update = (list) =>
        list.map((x) =>
          idOf(x) === id ? { ...x, following: !was, isFollowing: !was } : x,
        ),
      rollback = (list) =>
        list.map((x) =>
          idOf(x) === id ? { ...x, following: was, isFollowing: was } : x,
        );
    setPeople(update);
    const result = was ? await unfollowUser(id) : await followUser(id);
    if (!result?.success) {
      setPeople(rollback);
      toast.error(result?.error || "Could not update follow");
    }
  };
  const profile = (person) =>
    person?.username &&
    navigate(`/profile/@${String(person.username).replace(/^@/, "")}`);
  const changeTab = (next) => {
    setSearchParams((current) => {
      const params = new URLSearchParams(current);
      params.set("tab", next);
      return params;
    });
  };
  const activeFilters = Object.entries(filters).filter(
    ([, value]) => value !== "All",
  ).length;
  return (
    <div className="min-h-screen bg-[#f7f9fc] text-[#0d1740] dark:bg-gray-900 dark:text-white">
      <div className="mx-auto flex max-w-[1536px]">
        <aside className="wt-legacy-sidebar sticky top-16 hidden h-[calc(100vh-64px)] w-[190px] shrink-0 flex-col border-r border-slate-200 bg-white px-3 py-5 lg:flex dark:border-gray-800 dark:bg-gray-900">
          <nav className="space-y-1">
            {navItems.map(([label, Icon, href]) => (
              <button
                key={label}
                onClick={() =>
                  href === "journal"
                    ? navigate(`/profile/@${user?.username || ""}?tab=journal`)
                    : navigate(href)
                }
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-semibold ${label === "Explore" ? "bg-blue-50 text-[#0784f8]" : "text-slate-600 hover:bg-slate-50 dark:text-gray-300 dark:hover:bg-gray-800"}`}
              >
                <Icon className="h-[17px] w-[17px]" />
                {label}
              </button>
            ))}
          </nav>
          <div className="mt-auto space-y-1 border-t border-slate-100 pt-4">
            <button
              onClick={() => navigate(`/profile/@${user?.username || ""}`)}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-semibold text-slate-600"
            >
              <User className="h-[17px] w-[17px]" />
              Profile
            </button>
            <button
              onClick={() => navigate("/settings")}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-xs font-semibold text-slate-600"
            >
              <Settings className="h-[17px] w-[17px]" />
              Settings
            </button>
          </div>
        </aside>
        <main className="min-w-0 flex-1">
          <div className="sticky top-14 z-30 border-b border-slate-200 bg-white/95 px-4 py-3 backdrop-blur md:hidden dark:border-gray-700 dark:bg-gray-900/95">
            <div className="mx-auto flex max-w-3xl items-center gap-2">
              <div className="relative min-w-0 flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  ref={searchRef}
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search goals, people or keywords..."
                  className="w-full rounded-xl border border-slate-200 bg-[#f5f8fc] py-2.5 pl-10 pr-9 text-xs outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100 dark:border-gray-700 dark:bg-gray-800"
                />
                {query && (
                  <button
                    onClick={() => setQuery("")}
                    className="absolute right-3 top-1/2 -translate-y-1/2"
                  >
                    <X className="h-4 w-4 text-slate-500" />
                  </button>
                )}
              </div>
              <button
                type="button"
                onClick={() => setFiltersOpen(true)}
                className="relative grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-blue-200 bg-blue-50 text-[#0784f8] md:hidden"
                aria-label="Open filters"
              >
                <SlidersHorizontal className="h-4 w-4" />
                {activeFilters > 0 && <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-[#0784f8] px-1 text-[9px] font-bold text-white">{activeFilters}</span>}
              </button>
            </div>
          </div>
          <div className="mx-auto grid max-w-[1340px] grid-cols-1 gap-4 md:px-5 md:pb-8">
            <section className="min-h-[720px] min-w-0">
              <div className="border-b border-slate-200 bg-white px-4 dark:border-gray-700 dark:bg-gray-900 md:hidden">
                <div className="grid grid-cols-2">
                  {[
                    ["goals", Target, "Goals"],
                    ["people", Users, "People"],
                  ].map(([key, Icon, label]) => (
                    <button
                      key={key}
                      onClick={() => changeTab(key)}
                      className={`flex items-center justify-center gap-2 border-b-2 py-3 text-xs font-bold ${tab === key ? "border-[#0784f8] text-[#0784f8]" : "border-transparent text-slate-500"}`}
                    >
                      <Icon className="h-4 w-4" />
                      {label}
                    </button>
                  ))}
                </div>
              </div>
              {tab === "goals" && (
                <>
                  <div className="border-b border-slate-100 bg-white px-4 py-3 md:hidden dark:border-gray-700 dark:bg-gray-900">
                    <div className="mb-2 flex items-center gap-2">
                      <LayoutGrid className="h-4 w-4 text-[#0784f8]" />
                      <h2 className="text-sm font-extrabold">Goals by Category</h2>
                    </div>
                    <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                    <button onClick={() => setCategory("all")} className={`w-[82px] shrink-0 rounded-xl border px-2 py-2.5 text-center ${category === "all" ? "border-blue-500 bg-blue-50" : "border-slate-100 bg-white dark:border-gray-700 dark:bg-gray-800"}`}>
                      <span className="mx-auto grid h-8 w-8 place-items-center rounded-lg bg-slate-100 text-slate-600 dark:bg-gray-700 dark:text-slate-200"><LayoutGrid className="h-4 w-4" /></span>
                      <span className="mt-1 block truncate text-[9px] font-bold">All</span>
                    </button>
                    {GOAL_CATEGORIES.map(({ id, label }) => (
                      <button key={id} onClick={() => setCategory(id)} className={`w-[82px] shrink-0 rounded-xl border px-2 py-2.5 text-center ${category === id ? "border-blue-500 bg-blue-50" : "border-slate-100 bg-white dark:border-gray-700 dark:bg-gray-800"}`}>
                        <CategoryIcon category={id} size="sm" className="mx-auto" />
                        <span className="mt-1 block truncate text-[9px] font-bold">{label}</span>
                      </button>
                    ))}
                    </div>
                  </div>
                  <DiscoverHero
                    title="Discover Goals"
                    subtitle="Find inspiring goals, track real progress and connect with people who keep moving forward."
                    placeholder="Search goals..."
                    query={query}
                    setQuery={setQuery}
                    searchRef={searchRef}
                    category={category}
                    setCategory={setCategory}
                    showCategories
                    onFilters={() => setFiltersOpen(true)}
                    activeFilters={activeFilters}
                  />
                  {isShortQuery ? null : isSearching ? (
                    <div className="md:mt-3 md:overflow-hidden md:rounded-xl md:border md:border-slate-200">
                      <div className="bg-white px-4 py-3 text-[10px] text-slate-500 dark:bg-gray-900">
                        <span>{shownGoals.length} goals found</span>
                      </div>
                      {loading ? (
                        <Loading />
                      ) : shownGoals.length ? (
                        <>
                          <div className="md:hidden">
                            {shownGoals.map((goal) => (
                              <GoalResult
                                key={idOf(goal)}
                                goal={goal}
                                onOpen={() => setGoalId(idOf(goal))}
                              />
                            ))}
                          </div>
                          <div className="hidden gap-3 bg-[#f7f9fc] p-3 md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 dark:bg-gray-900">
                            {shownGoals.map((goal) => (
                              <GoalCard
                                key={idOf(goal)}
                                goal={goal}
                                onOpen={() => setGoalId(idOf(goal))}
                              />
                            ))}
                          </div>
                        </>
                      ) : (
                        <Empty label="No goals match your search." />
                      )}
                    </div>
                  ) : (
                    <>
                      <div className="hidden px-4 pt-4 md:block md:px-3">
                        <SectionTitle
                          icon={LayoutGrid}
                          title="Goals by Category"
                          subtitle="Explore goals across different areas."
                        />
                        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
                          <button onClick={() => setCategory("all")} className={`w-[82px] shrink-0 rounded-xl border px-2 py-2.5 text-center ${category === "all" ? "border-blue-500 bg-blue-50" : "border-slate-100 bg-white dark:border-gray-700 dark:bg-gray-800"}`}>
                            <span className="mx-auto grid h-8 w-8 place-items-center rounded-lg bg-slate-100 text-slate-600 dark:bg-gray-700 dark:text-slate-200"><LayoutGrid className="h-4 w-4" /></span>
                            <span className="mt-1 block truncate text-[9px] font-bold">All</span>
                          </button>
                          {GOAL_CATEGORIES.map(({ id, label }) => (
                            <button key={id} onClick={() => setCategory(id)} className={`w-[82px] shrink-0 rounded-xl border px-2 py-2.5 text-center ${category === id ? "border-blue-500 bg-blue-50" : "border-slate-100 bg-white dark:border-gray-700 dark:bg-gray-800"}`}>
                              <CategoryIcon category={id} size="sm" className="mx-auto" />
                              <span className="mt-1 block truncate text-[9px] font-bold">{label}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                      {loading ? (
                        <div className="p-4 md:px-3"><Loading /></div>
                      ) : shownGoals.length ? (
                        <>
                          <div className="p-4 md:px-3">
                            <SectionTitle
                              icon={TrendingUp}
                              title="Trending Goals"
                              subtitle="Popular goals people are working on right now."
                            />
                            <div className="flex gap-3 overflow-x-auto pb-2 md:grid md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                              {shownGoals.slice(0, 4).map((goal) => (
                                <GoalCard
                                  key={idOf(goal)}
                                  goal={goal}
                                  featured
                                  onOpen={() => setGoalId(idOf(goal))}
                                />
                              ))}
                            </div>
                          </div>
                          {shownGoals.length > 4 && (
                            <div className="px-4 pb-5 md:px-3">
                              <SectionTitle
                                icon={Clock3}
                                title="Latest Goals"
                                subtitle="New goals shared by people on WishTrail."
                              />
                              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                                {shownGoals.slice(4, 8).map((goal) => (
                                  <GoalCard
                                    key={idOf(goal)}
                                    goal={goal}
                                    onOpen={() => setGoalId(idOf(goal))}
                                  />
                                ))}
                              </div>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="p-4 md:px-3">
                          <Empty
                            label="Find a goal that inspires you"
                            hint="Search by title or explore a category to get started."
                          />
                        </div>
                      )}
                    </>
                  )}
                </>
              )}
              {tab === "people" && (
                <>
                  <DiscoverHero
                    title="Discover People"
                    subtitle="Find inspiring people, connect with like-minded achievers and grow together."
                    placeholder="Search people..."
                    query={query}
                    setQuery={setQuery}
                    searchRef={searchRef}
                    category={category}
                    setCategory={setCategory}
                    showCategories
                    onFilters={() => setFiltersOpen(true)}
                    activeFilters={activeFilters}
                  />
                  {!isShortQuery && <div className="md:mt-3 md:overflow-hidden md:rounded-xl md:border md:border-slate-200">
                    <div className="bg-white px-4 py-3 text-[10px] text-slate-500 dark:bg-gray-900">
                      {people.length} people found
                    </div>
                    {loading ? (
                      <Loading />
                    ) : people.length ? (
                      people.map((person) => (
                        <PersonRow
                          key={idOf(person)}
                          person={person}
                          onProfile={() => profile(person)}
                          onFollow={() => follow(person)}
                        />
                      ))
                    ) : (
                      <Empty
                        label={
                          isSearching
                            ? "No people match your search."
                            : "Find people to follow"
                        }
                        hint={
                          isSearching
                            ? "Try another name or username."
                            : "Search by name or username to discover people on WishTrail."
                        }
                      />
                    )}
                  </div>}
                </>
              )}
            </section>
          </div>
        </main>
      </div>
      <Filters
        open={filtersOpen}
        onClose={() => setFiltersOpen(false)}
        value={filters}
        onApply={setFilters}
      />
      <Suspense fallback={null}>
        {goalId && (
          <GoalPostModal
            isOpen
            goalId={goalId}
            onClose={() => setGoalId(null)}
            openWithComments={false}
          />
        )}
      </Suspense>
    </div>
  );
}
function Loading() {
  return (
    <div className="col-span-full grid min-h-40 w-full place-items-center bg-white dark:bg-gray-900">
      <span className="h-8 w-8 animate-spin rounded-full border-2 border-blue-100 border-t-[#0784f8]" />
    </div>
  );
}
function Empty({ label, hint = "Try another keyword or category." }) {
  return (
    <div className="grid min-h-56 place-items-center bg-white px-6 text-center dark:bg-gray-900">
      <div>
        <Search className="mx-auto mb-3 h-9 w-9 text-blue-300" />
        <p className="text-sm font-bold">{label}</p>
        <p className="mt-1 text-xs text-slate-500">{hint}</p>
      </div>
    </div>
  );
}
