import { motion, useReducedMotion } from 'framer-motion'
import { useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  BarChart3,
  CalendarDays,
  Check,
  CheckCircle2,
  Crown,
  Flame,
  Heart,
  Home,
  MessageCircle,
  Play,
  Route,
  Share2,
  Target,
  Trophy,
  Users,
  Zap,
} from 'lucide-react'
import useApiStore from '../store/apiStore'
import { HomePageSEO } from '../components/SEO'
import { TrailLandscape, TrailStats, WeekDots } from '../components/WeeklyTrail'
import GoalSharePreview from '../components/GoalSharePreview'
import { scrollToSection } from '../utils/sectionScroll'
import './HomePage.css'

// Explicitly illustrative fixtures, never substituted for a visitor's product data.
const sampleRecap = {
  startLocalDate: '2026-10-12',
  activeDays: 4,
  habitCompletions: 12,
  goalsProgressed: 3,
  habitConsistency: 75,
  activeDateKeys: ['2026-10-12', '2026-10-13', '2026-10-15', '2026-10-17'],
}
const journey = [
  {
    date: 'Apr 12',
    title: 'Goal created',
    detail: 'Run My First 10K',
    icon: Target,
  },
  {
    date: 'Apr 28',
    title: 'First progress update',
    detail: 'Finding my running rhythm',
    icon: Route,
  },
  {
    date: 'May 16',
    title: 'Progress reached 50%',
    detail: 'One step closer to the finish',
    icon: Check,
  },
  {
    date: 'Jun 28',
    title: 'Goal completed',
    detail: 'My first 10K. My own pace.',
    icon: Trophy,
  },
]
const shareBase = {
  title: 'Run My First 10K',
  category: 'Fitness',
  shareType: 'COMPLETION',
  progress: 100,
  journeyDuration: 77,
  progressUpdateCount: 12,
  completionDate: '2026-06-28',
}
const productFeatures = [
  [Target, 'Goals', 'Turn ambitions into achievable steps with clear targets and timelines.', 'blue', '#how-it-works'],
  [Zap, 'Habits', 'Build daily or weekly routines and track your consistency.', 'mint', '#how-it-works'],
  [BarChart3, 'Your Trail', 'See the progress and meaningful moments behind each journey.', 'lavender', '#your-journey'],
  [Users, 'Community', 'Share progress, discover others, and stay motivated together.', 'peach', '#community'],
  [BarChart3, 'Progress Insights', 'Understand completion rates, streaks, active days, and weekly patterns.', 'mint', '#insights'],
  [CalendarDays, 'Weekly Trail', 'Reflect on the goals, habits, and active days that shaped your week.', 'blue', '#weekly-trail'],
  [Share2, 'Goal Sharing', 'Celebrate a start, progress moment, milestone, or completed journey.', 'lavender', '#goal-sharing'],
  [Trophy, 'Leaderboard', 'Find extra motivation by celebrating goals completed across WishTrail.', 'peach', '#leaderboard-showcase'],
]

function Reveal({ children, className = '' }) {
  const reduced = useReducedMotion()
  return (
    <motion.div
      className={className}
      initial={reduced ? false : { opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.12 }}
      transition={{ duration: reduced ? 0 : 0.45 }}
    >
      {children}
    </motion.div>
  )
}
function Eyebrow({ children }) {
  return <span className="landing-eyebrow">{children}</span>
}
function Action({ to, children, secondary = false }) {
  return (
    <Link className={`landing-button${secondary ? ' secondary' : ''}`} to={to}>
      {children}
      <ArrowRight size={17} aria-hidden="true" />
    </Link>
  )
}
function SectionLink({ sectionId, className, children }) {
  return (
    <a
      className={className}
      href={`#${sectionId}`}
      onClick={(event) => scrollToSection(event, sectionId)}
    >
      {children}
    </a>
  )
}
function FeatureRail() {
  const railRef = useRef(null)
  const [activeDot, setActiveDot] = useState(0)
  const reduced = useReducedMotion()

  const updateDots = (event) => {
    const rail = event.currentTarget
    const maxScroll = rail.scrollWidth - rail.clientWidth
    const progress = maxScroll > 0 ? rail.scrollLeft / maxScroll : 0
    setActiveDot(Math.round(progress * (productFeatures.length - 1)))
  }

  const goToFeature = (index) => {
    const rail = railRef.current
    if (!rail) return
    const maxScroll = rail.scrollWidth - rail.clientWidth
    rail.scrollTo({
      left: (maxScroll * index) / (productFeatures.length - 1),
      behavior: reduced ? 'auto' : 'smooth',
    })
  }

  return (
    <>
      <div
        ref={railRef}
        className="landing-pillar-grid"
        role="region"
        aria-label="WishTrail features"
        tabIndex={0}
        onScroll={updateDots}
      >
        {productFeatures.map(([icon, title, copy, tone, href]) => (
          <Reveal key={title}>
            <SectionLink
              className="landing-pillar landing-card"
              sectionId={href.slice(1)}
            >
              <Tile icon={icon} tone={tone} />
              <h3>{title}</h3>
              <p>{copy}</p>
              <span className="landing-circle-arrow">
                <ArrowRight size={15} aria-hidden="true" />
              </span>
            </SectionLink>
          </Reveal>
        ))}
      </div>
      <div className="landing-pillar-dots" aria-label="Feature carousel pages">
        {productFeatures.map(([, title], index) => (
          <button
            type="button"
            key={title}
            className={index === activeDot ? 'active' : ''}
            style={{
              opacity: Math.max(0.2, 0.7 - Math.abs(activeDot - index) * 0.14),
            }}
            aria-label={`Show ${title}`}
            aria-pressed={index === activeDot}
            onClick={() => goToFeature(index)}
          />
        ))}
      </div>
    </>
  )
}
function Tile({ icon: Icon, tone = 'blue' }) {
  return (
    <span className={`landing-icon ${tone}`}>
      <Icon size={22} aria-hidden="true" />
    </span>
  )
}
function Sample({ children = 'Illustrative product preview' }) {
  return <span className="landing-sample">{children}</span>
}
function Progress({ value }) {
  return (
    <div className="landing-progress-row">
      <div className="landing-progress">
        <span style={{ '--progress': `${value}%` }} />
      </div>
      <b>{value}%</b>
    </div>
  )
}
function Habits({ creative = false }) {
  const rows = creative
    ? [
        ['Practice daily', '18 day streak', 5],
        ['Watch a tutorial', '3 of 4 this week', 3],
        ['Try a new technique', 'Weekly habit', 2],
      ]
    : [
        ['Morning run', '12 day streak', 5],
        ['Strength training', '3 of 4 this week', 3],
        ['Evening stretch', '5 day streak', 5],
      ]
  return (
    <div className="landing-habits">
      {rows.map(([title, note, count], index) => (
        <div className="landing-habit" key={title}>
          <Tile
            icon={index === 0 ? Flame : index === 1 ? Target : CheckCircle2}
            tone={['peach', 'mint', 'blue'][index]}
          />
          <div className="landing-habit-name">
            <strong>{title}</strong>
            <small>{note}</small>
          </div>
          <div
            className="landing-checks"
            aria-label={`${title}: ${count} completed days in this example`}
          >
            {['M', 'T', 'W', 'T', 'F', 'S', 'S'].map((day, i) => (
              <span key={i}>
                <small>{day}</small>
                <i className={i < count ? 'done' : ''}>
                  {i < count && <Check size={10} aria-hidden="true" />}
                </i>
              </span>
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
function GoalPreview({ creative = false }) {
  return (
    <div className="landing-dashboard landing-card">
      <aside aria-hidden="true">
        <Home />
        <Target className="selected" />
        <CalendarDays />
        <BarChart3 />
        <Users />
      </aside>
      <div className="landing-dashboard-main">
        <div className="landing-preview-heading">
          <strong>{creative ? 'Your workspace' : 'My Goals'}</strong>
          <Sample>Sample</Sample>
        </div>
        <div className="landing-tabs">
          <span>{creative ? 'Goals' : 'Active (3)'}</span>
          <span>{creative ? 'Habits' : 'Completed (12)'}</span>
        </div>
        <div className="landing-goal">
          <div className="landing-goal-title">
            <Tile
              icon={creative ? Share2 : Target}
              tone={creative ? 'lavender' : 'blue'}
            />
            <div>
              <h3>{creative ? 'Learn Photography' : 'Run My First 10K'}</h3>
              <p>
                {creative
                  ? 'Creativity · Target: Dec 31, 2026'
                  : 'Fitness · Target: Dec 20, 2026'}
              </p>
            </div>
          </div>
          <div className="landing-health">
            <span>Goal Health</span>
            <b>On Track</b>
          </div>
          <Progress value={creative ? 62 : 68} />
        </div>
        <h3 className="landing-habits-heading">Your habits</h3>
        <Habits creative={creative} />
      </div>
    </div>
  )
}
function WeeklyPreview({ compact = false }) {
  return (
    <div className={`landing-week landing-card${compact ? ' compact' : ''}`}>
      <div className="landing-week-landscape">
        <TrailLandscape />
      </div>
      <div className="landing-week-content">
        <Sample>Sample recap</Sample>
        <h3>Your Weekly Trail</h3>
        <p>Oct 12 – Oct 18, 2026</p>
        <TrailStats recap={sampleRecap} />
        <WeekDots recap={sampleRecap} />
        <strong className="landing-week-story">A week of showing up.</strong>
      </div>
    </div>
  )
}
function SectionCopy({ eyebrow, title, children }) {
  return (
    <div className="landing-copy">
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2>{title}</h2>
      {children}
    </div>
  )
}

export default function HomePage() {
  const authenticated = useApiStore((state) => state.isAuthenticated)
  const start = authenticated ? '/home' : '/auth'
  const startLabel = authenticated ? 'Continue Your Trail' : 'Start Your Trail'
  return (
    <>
      <HomePageSEO />
      <div className="wt-landing">
        <section className="landing-hero">
          <svg className="landing-mobile-trail" viewBox="0 0 400 1000" preserveAspectRatio="none" fill="none" aria-hidden="true">
            <path d="M420 20C80 70 10 200 240 310S430 490 160 590 50 800 250 880 320 970 210 1020" stroke="#e2f0ff" strokeWidth="78" />
            <path d="M420 20C80 70 10 200 240 310S430 490 160 590 50 800 250 880 320 970 210 1020" stroke="#a9d2fa" strokeWidth="2" strokeDasharray="7 10" />
          </svg>
          <svg
            className="landing-hero-trail"
            viewBox="0 0 1400 650"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M620 650C460 380 1030 550 1100 290S720 30 1400 90"
              stroke="#d9eaff"
              strokeWidth="115"
            />
            <path
              className="landing-drawn-path"
              d="M620 650C460 380 1030 550 1100 290S720 30 1400 90"
              stroke="#b4d5f7"
              strokeWidth="2"
              pathLength="1"
            />
          </svg>
          <div className="landing-shell landing-hero-grid">
            <Reveal className="landing-hero-copy">
              <Eyebrow>A brighter you, one trail at a time</Eyebrow>
              <h1>
                Turn your goals into <span>journeys</span> worth completing.
              </h1>
              <p>
                Set meaningful goals, build consistent habits, see
                your progress take shape, and share the journey with a
                supportive community.
              </p>
              <div className="landing-actions">
                <Action to={start}>{startLabel}</Action>
                <SectionLink
                  className="landing-button secondary"
                  sectionId="how-it-works"
                >
                  <Play size={16} aria-hidden="true" />
                  See How It Works
                </SectionLink>
              </div>
              <div className="landing-hero-notes">
                <span>
                  <Target />
                  Meaningful goals
                </span>
                <span>
                  <BarChart3 />
                  Visible progress
                </span>
                <span>
                  <Users />
                  Shared journeys
                </span>
              </div>
            </Reveal>
            <Reveal className="landing-hero-product">
              <GoalPreview />
              <div className="landing-hero-week">
                <WeeklyPreview compact />
              </div>
              <p className="landing-handnote">
                Small steps.
                <br />
                Bigger tomorrows.
              </p>
            </Reveal>
          </div>
        </section>

        <section
          className="landing-section landing-pillars"
          aria-labelledby="pillars-title"
        >
          <div className="landing-shell">
            <Reveal className="landing-section-heading">
              <Eyebrow>Everything you need</Eyebrow>
              <h2 id="pillars-title">Built for real progress</h2>
              <p>
                Everything that turns an intention into steady action, a story
                you can see, and progress worth sharing.
              </p>
            </Reveal>
            <FeatureRail />
          </div>
        </section>

        <section className="landing-section landing-tint" id="how-it-works">
          <div className="landing-shell landing-split">
            <Reveal>
              <SectionCopy
                eyebrow="Set goals. Build habits."
                title="Make it happen, step by step"
              >
                <p>
                  Give your big dreams a place to begin. Track your goals,
                  build daily routines, and see your progress over time.
                </p>
                <ul className="landing-benefits">
                  {[
                    [
                      Target,
                      'Set meaningful goals',
                      'Choose a target date and track your progress.',
                    ],
                    [
                      Zap,
                      'Build consistent habits',
                      'Create daily or weekly routines and track your consistency.',
                    ],
                    [
                      BarChart3,
                      'Track with clarity',
                      'See progress, streaks, and Goal Health in one place.',
                    ],
                  ].map(([icon, title, copy]) => (
                    <li key={title}>
                      <Tile icon={icon} />
                      <div>
                        <h3>{title}</h3>
                        <p>{copy}</p>
                      </div>
                    </li>
                  ))}
                </ul>
                <Action to={start}>Explore Goals</Action>
              </SectionCopy>
            </Reveal>
            <Reveal className="landing-detail-preview">
              <GoalPreview creative />
              <span className="landing-preview-caption">
                Your goals and daily routines, in one workspace.
              </span>
            </Reveal>
          </div>
        </section>

        <section
          className="landing-section landing-journey-section"
          id="your-journey"
        >
          <div className="landing-shell landing-split">
            <Reveal>
              <div className="landing-timeline landing-card">
                <div className="landing-preview-heading">
                  <h3>Goal Journey</h3>
                  <Sample>Sample journey</Sample>
                </div>
                <ol>
                  {journey.map(({ date, title, detail, icon: Icon }, index) => (
                    <li key={date}>
                      <span
                        className={`landing-event ${index === 3 ? 'finish' : ''}`}
                      >
                        <Icon size={16} aria-hidden="true" />
                      </span>
                      <div>
                        <small>{date}, 2026</small>
                        <h4>{title}</h4>
                        <p>{detail}</p>
                      </div>
                      {index === 3 && (
                        <span className="landing-completed">You did it!</span>
                      )}
                    </li>
                  ))}
                </ol>
              </div>
            </Reveal>
            <Reveal>
              <SectionCopy
                eyebrow="See the bigger picture"
                title="Every goal has a story"
              >
                <p>
                  WishTrail remembers more than the finish line. See when you
                  started, the progress you made, and the moments that mattered
                  along the way.
                </p>
                <div className="landing-journey-stats">
                  <div>
                    <Route />
                    <b>12</b>
                    <small>Progress updates</small>
                  </div>
                  <div>
                    <CalendarDays />
                    <b>77</b>
                    <small>Days on the journey</small>
                  </div>
                  <div>
                    <Trophy />
                    <b>1</b>
                    <small>Goal completed</small>
                  </div>
                </div>
                <Sample>Metrics from the sample journey</Sample>
                <div className="landing-actions">
                  <Action to={start} secondary>
                    {authenticated
                      ? 'Explore Your Goals'
                      : 'Begin Your Journey'}
                  </Action>
                </div>
              </SectionCopy>
            </Reveal>
          </div>
        </section>

        <section className="landing-section" id="insights">
          <div className="landing-shell landing-split">
            <Reveal>
              <SectionCopy
                eyebrow="Understand your progress"
                title="Insights that keep you moving"
              >
                <p>
                  Notice the routines that stick. Understand your habits and
                  consistency, then make your next step a little more
                  intentional.
                </p>
                <div className="landing-metrics">
                  {[
                    [CheckCircle2, '75%', 'Habit completion rate', 'mint'],
                    [Flame, '12', 'Current streak · days', 'peach'],
                    [CalendarDays, '4', 'Active days · this week', 'blue'],
                    [
                      BarChart3,
                      '12',
                      'Habit completions · this week',
                      'lavender',
                    ],
                  ].map(([icon, value, label, tone]) => (
                    <div className="landing-card" key={label}>
                      <Tile icon={icon} tone={tone} />
                      <div>
                        <strong>{value}</strong>
                        <small>{label}</small>
                      </div>
                    </div>
                  ))}
                </div>
                <Sample>Illustrative habit and weekly recap metrics</Sample>
              </SectionCopy>
            </Reveal>
            <Reveal>
              <div className="landing-chart landing-card">
                <div className="landing-preview-heading">
                  <h3>Habit consistency</h3>
                  <span>Sample week</span>
                </div>
                <p>12 of 16 scheduled habit completions</p>
                <div
                  className="landing-chart-bars"
                  role="img"
                  aria-label="Sample daily habit completions: Monday 3, Tuesday 3, Wednesday 0, Thursday 3, Friday 0, Saturday 3, Sunday 0."
                >
                  {[3, 3, 0, 3, 0, 3, 0].map((value, index) => (
                    <div key={index}>
                      <b>{value}</b>
                      <span
                        style={{
                          '--bar-height': `${Math.max(value * 28, 2)}%`,
                        }}
                      />
                      <small>
                        {
                          ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'][
                            index
                          ]
                        }
                      </small>
                    </div>
                  ))}
                </div>
                <div className="landing-chart-note">
                  <Tile icon={Zap} tone="mint" />
                  <div>
                    <strong>Small wins add up.</strong>
                    <p>Every completed habit is a step forward.</p>
                  </div>
                </div>
              </div>
            </Reveal>
          </div>
        </section>

        <section className="landing-section landing-tint" id="weekly-trail">
          <div className="landing-shell landing-split">
            <Reveal>
              <WeeklyPreview />
            </Reveal>
            <Reveal>
              <SectionCopy
                eyebrow="A moment to reflect"
                title="Your week. Your trail."
              >
                <p>
                  A little perspective on a meaningful week. Revisit the goals
                  you moved forward, the habits you showed up for, and the
                  rhythm you’re finding.
                </p>
                <p>
                  Your Weekly Trail is a timely recap of the week just lived,
                  ready when your reflection is available.
                </p>
                <Action to={authenticated ? '/weekly-trail' : '/auth'}>
                  {authenticated
                    ? 'View Your Weekly Trail'
                    : 'Start Your Trail'}
                </Action>
              </SectionCopy>
            </Reveal>
          </div>
        </section>

        <section className="landing-section" id="community">
          <div className="landing-shell">
            <Reveal className="landing-community-heading">
              <SectionCopy
                eyebrow="Progress feels better together"
                title="Get inspired by others"
              >
                <p>
                  Share a small win. Cheer on a new beginning. Find
                  encouragement in a community making progress, one day at a
                  time.
                </p>
              </SectionCopy>
              <Action to="/feed">Explore Feed</Action>
            </Reveal>
            <Sample>Illustrative community posts · not live activity</Sample>
            <div className="landing-feed-grid">
              {[
                [
                  'A',
                  'Alex',
                  'Completed a goal',
                  'Run My First 10K',
                  'Crossed the finish line. Proud of every small step that got me here.',
                  100,
                  'Fitness',
                  'mint',
                ],
                [
                  'M',
                  'Morgan',
                  'Shared a progress update',
                  'Cook 30 new recipes',
                  'Another recipe, a little more confidence in the kitchen.',
                  60,
                  'Personal Development',
                  'peach',
                ],
                [
                  'P',
                  'Priya',
                  'Started a goal',
                  'Read 24 books',
                  'Making a little room for reading, every day.',
                  0,
                  'Education',
                  'lavender',
                ],
              ].map(
                ([
                  initial,
                  name,
                  action,
                  title,
                  text,
                  progress,
                  category,
                  tone,
                ]) => (
                  <Reveal key={name}>
                    <article className="landing-feed-card landing-card">
                      <header>
                        <span className={`landing-avatar ${tone}`}>
                          {initial}
                        </span>
                        <div>
                          <h3>{name}</h3>
                          <small>{action}</small>
                        </div>
                      </header>
                      <div className={`landing-feed-cover ${tone}`}>
                        <Tile
                          icon={
                            progress === 100 ? Trophy : progress ? Zap : Target
                          }
                          tone={tone}
                        />
                        <span>{category}</span>
                        <h4>{title}</h4>
                        <Progress value={progress} />
                      </div>
                      <p>{text}</p>
                      <footer>
                        <Heart size={15} aria-hidden="true" />
                        <span>Encourage</span>
                        <MessageCircle size={15} aria-hidden="true" />
                        <span>Connect</span>
                      </footer>
                    </article>
                  </Reveal>
                ),
              )}
            </div>
          </div>
        </section>

        <section className="landing-section landing-tint" id="goal-sharing">
          <div className="landing-shell landing-split">
            <Reveal>
              <SectionCopy
                eyebrow="Celebrate the journey"
                title="Some moments deserve to be shared."
              >
                <p>
                  A new goal. A little progress. A finish line you worked for.
                  Turn your journey into a WishTrail card and share the moment
                  in your own way.
                </p>
                <div className="landing-template-tags">
                  <span>Minimal</span>
                  <span>Progress</span>
                  <span>Journey</span>
                </div>
                <p className="landing-format-note">
                  Made for your story, or a square worth keeping.
                </p>
                <Action to={start} secondary>
                  {authenticated ? 'Explore Your Goals' : 'Start Your Trail'}
                </Action>
              </SectionCopy>
            </Reveal>
            <Reveal>
              <div className="landing-share-previews">
                <figure>
                  <GoalSharePreview
                    snapshot={{
                      ...shareBase,
                      template: 'MINIMAL',
                      format: 'STORY_9_16',
                    }}
                    maxWidth={180}
                  />
                  <figcaption>Story · 9:16</figcaption>
                </figure>
                <figure>
                  <GoalSharePreview
                    snapshot={{
                      ...shareBase,
                      template: 'PROGRESS',
                      format: 'SQUARE_1_1',
                    }}
                    maxWidth={245}
                  />
                  <figcaption>Square · 1:1</figcaption>
                </figure>
              </div>
              <div className="landing-share-label">
                <Sample>Sample cards · actual WishTrail templates</Sample>
              </div>
            </Reveal>
          </div>
        </section>

        <section
          className="landing-section landing-leaderboard"
          id="leaderboard-showcase"
        >
          <div className="landing-shell landing-split">
            <Reveal>
              <SectionCopy
                eyebrow="A little competition. A lot of motivation."
                title="Climb the leaderboard"
              >
                <p>
                  Celebrate completed goals and find a little extra motivation
                  in the achievements around you.
                </p>
                <Action to="/leaderboard">View Leaderboard</Action>
              </SectionCopy>
            </Reveal>
            <Reveal>
              <Sample>Illustrative rankings · goals completed</Sample>
              <div className="landing-podium">
                {[
                  [2, 'Maya', 56],
                  [1, 'Aarav', 64],
                  [3, 'Rohan', 49],
                ].map(([rank, name, score]) => (
                  <div
                    className={`landing-card landing-place place-${rank}`}
                    key={rank}
                  >
                    {rank === 1 && (
                      <Crown className="landing-crown" aria-hidden="true" />
                    )}
                    <span className="landing-rank">#{rank}</span>
                    <span className="landing-avatar">{name[0]}</span>
                    <h3>{name}</h3>
                    <strong>{score}</strong>
                    <small>Goals completed</small>
                  </div>
                ))}
              </div>
              <div className="landing-your-rank">
                <Trophy size={19} />
                <strong>Your next chapter</strong>
                <Link to="/leaderboard">
                  Find your place <ArrowRight size={15} />
                </Link>
              </div>
            </Reveal>
          </div>
        </section>

        <section className="landing-final">
          <TrailLandscape />
          <svg className="landing-finale-scene" viewBox="0 0 400 280" fill="none" preserveAspectRatio="xMidYMax slice" aria-hidden="true">
            <circle className="landing-finale-sun" cx="316" cy="68" r="40" fill="#fff0c9" />
            <circle cx="316" cy="68" r="25" fill="#ffe3a0" />
            <path d="M0 155 75 97 142 124 218 62 309 114 400 80V280H0Z" fill="#d9ecff" />
            <path d="M0 198 86 140 163 178 276 108 400 153V280H0Z" fill="#b1d7fa" />
            <path d="M0 229 103 187 179 219 300 167 400 194V280H0Z" fill="#80b9df" />
            <path d="M0 266 84 229 179 254 283 221 400 239V280H0Z" fill="#73afac" />
            <path d="M218 285C280 253 129 236 168 209S300 178 250 151 225 128 253 112" stroke="#f8fcff" strokeWidth="17" strokeLinecap="round" />
            <path className="landing-finale-route" pathLength="1" d="M218 285C280 253 129 236 168 209S300 178 250 151 225 128 253 112" stroke="#4697ed" strokeWidth="3" strokeLinecap="round" />
            <g fill="#458889">
              <path d="m32 181-19 45h12l-17 28h49l-17-28h12Z" />
              <path d="m356 159-23 54h14l-20 35h58l-20-35h14Z" />
              <path d="m389 207-18 39h10l-15 27h44l-15-27h10Z" />
            </g>
            <circle className="landing-finale-marker" cx="253" cy="112" r="7" fill="#3289ec" stroke="white" strokeWidth="3" />
          </svg>
          <Reveal className="landing-final-content">
            <Eyebrow>One small step starts it all</Eyebrow>
            <h2>Ready to Start Your Trail?</h2>
            <p>Your next goal doesn’t need to stay a someday.</p>
            <Action to={start}>{startLabel}</Action>
            <small>
              {authenticated
                ? 'Pick up where you left off.'
                : 'Free to get started'}
            </small>
          </Reveal>
        </section>
        <section className="landing-mobile-faq landing-section" aria-labelledby="landing-faq-title">
          <div className="landing-shell">
            <h2 id="landing-faq-title">Frequently Asked Questions</h2>
            {[
              ['How do I get started?', 'Create an account, then add your first goal or habit. You can start with something small and record your progress as you go.'],
              ['What is the difference between a goal and a habit?', 'A goal is an outcome with a finish line, like reading 12 books. A habit is a recurring routine, like reading each evening. You can track each independently in WishTrail.'],
              ['Can I track habits without creating a goal?', 'Yes. Create habits on their own, choose a daily or weekly routine, and track your completions and consistency.'],
              ['How can I see the progress I have made?', 'Your goal journey records progress updates and milestones. Progress insights show your habit consistency, streaks, and completions, while your Weekly Trail brings the week together.'],
              ['What is my Weekly Trail?', 'Your Weekly Trail is a recap of your recent activity, including goals progressed, habits completed, and active days. Open it when your weekly recap is available to reflect on your week.'],
              ['What can I share with others?', 'Share a new goal, a progress update, or a completed journey. WishTrail also creates share cards for the moments you want to celebrate outside the app.'],
              ['Where can I find inspiration?', 'Explore Inspiration for ideas, Discover to find goals and people, or the Feed to see progress shared by the community.'],
              ['How do I contact support?', 'Use the Support link in the footer to email support@wishtrail.in. Include what you were trying to do and any error message so we can help.'],
            ].map(([question, answer]) => (
              <details className="landing-card" key={question}>
                <summary>{question}</summary>
                <p>{answer}</p>
              </details>
            ))}
          </div>
        </section>
      </div>
    </>
  )
}
