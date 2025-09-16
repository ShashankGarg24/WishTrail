export const INTEREST_TO_HABITS = {
  fitness: [
    { name: 'Morning jog', description: 'Run for 20 minutes right after waking up.', frequency: 'daily' },
    { name: 'Push-up set', description: 'Complete 3 sets of push-ups (choose your reps).', frequency: 'daily' },
    { name: 'Stretch routine', description: 'Do a 10-minute mobility and stretching session.', frequency: 'daily' },
    { name: 'Strength circuit', description: 'Full-body strength routine 3 times per week.', frequency: 'weekly', daysOfWeek: [1,3,5] },
    { name: 'Evening walk', description: 'Walk 30 minutes after dinner.', frequency: 'daily' },
    { name: 'Core workout', description: '10 minutes of core exercises (planks, dead bugs, etc.).', frequency: 'weekly', daysOfWeek: [2,4,6] },
    { name: 'Bike ride', description: 'Cycle outdoors or on a trainer 2x per week.', frequency: 'weekly', daysOfWeek: [3,6] },
    { name: 'Yoga flow', description: 'Follow a 15-minute beginner yoga sequence.', frequency: 'weekly', daysOfWeek: [1,4,6] },
    { name: 'Stairs instead of elevator', description: 'Choose stairs whenever possible to increase NEAT.', frequency: 'daily' },
    { name: '10k steps', description: 'Reach a minimum step count target each day.', frequency: 'daily' }
  ],
  health: [
    { name: 'Hydration check', description: 'Drink a glass of water every morning and afternoon.', frequency: 'daily' },
    { name: 'Sleep by 11', description: 'Lights out by a fixed bedtime.', frequency: 'daily' },
    { name: 'No sugar after lunch', description: 'Skip sweets and sugary drinks post-lunch.', frequency: 'daily' },
    { name: 'Fruit and veg', description: 'Include at least 2 servings of produce.', frequency: 'daily' },
    { name: 'Sunlight break', description: 'Get 10 minutes of outdoor daylight.', frequency: 'daily' },
    { name: 'Limit caffeine', description: 'Cap coffee/tea intake to a set number of cups.', frequency: 'daily' },
    { name: 'Home-cooked meal', description: 'Cook at least one meal at home.', frequency: 'weekly', daysOfWeek: [1,3,5] },
    { name: 'Meal prep', description: 'Prep 2–3 meals/snacks ahead of time.', frequency: 'weekly', daysOfWeek: [0] },
    { name: 'Stretch before bed', description: '5-minute wind-down stretch for better sleep.', frequency: 'daily' },
    { name: 'Daily multivitamin', description: 'Take your vitamin or supplement consistently.', frequency: 'daily' }
  ],
  productivity: [
    { name: 'Daily planning', description: 'Review priorities and write a top-3 list.', frequency: 'daily' },
    { name: 'Inbox zero block', description: 'Spend 10 minutes clearing inbox once a day.', frequency: 'daily' },
    { name: 'Focus sprint', description: 'One 25-minute distraction-free Pomodoro.', frequency: 'daily' },
    { name: 'Deep work block', description: 'Schedule a 60-minute deep work session 3x/week.', frequency: 'weekly', daysOfWeek: [1,3,5] },
    { name: 'Evening shutdown', description: '5-minute end-of-day review and plan tomorrow.', frequency: 'daily' },
    { name: 'Declutter desk', description: 'Reset your workspace at day end.', frequency: 'daily' }
  ],
  mindfulness: [
    { name: 'Meditation 10', description: 'Sit quietly and meditate for 10 minutes.', frequency: 'daily' },
    { name: 'Breathing break', description: 'Box-breathe for 2 minutes mid-day.', frequency: 'daily' },
    { name: 'Gratitude 3', description: 'Write three things you are grateful for.', frequency: 'daily' },
    { name: 'Digital sunset', description: 'No screens 30 minutes before bed.', frequency: 'daily' },
    { name: 'Nature walk', description: 'Mindful 15-minute walk once or twice weekly.', frequency: 'weekly', daysOfWeek: [6] }
  ],
  learning: [
    { name: 'Read 10 pages', description: 'Read at least 10 pages of a book.', frequency: 'daily' },
    { name: 'Language practice', description: 'Practice vocabulary for 10 minutes.', frequency: 'daily' },
    { name: 'Course module', description: 'Finish one lesson from a course.', frequency: 'weekly', daysOfWeek: [2,4] },
    { name: 'Note review', description: 'Summarize one key concept learned today.', frequency: 'daily' }
  ],
  nutrition: [
    { name: 'Protein with every meal', description: 'Ensure a protein source at each meal.', frequency: 'daily' },
    { name: 'Veg-first plate', description: 'Start meals with vegetables.', frequency: 'daily' },
    { name: 'No late-night snacks', description: 'Set a kitchen-closed time.', frequency: 'daily' },
    { name: 'Sugar-free day', description: 'Choose one day per week with no added sugar.', frequency: 'weekly', daysOfWeek: [2] }
  ],
  finance: [
    { name: 'Expense log', description: 'Record all spending once a day.', frequency: 'daily' },
    { name: 'Savings transfer', description: 'Auto-transfer a small amount to savings.', frequency: 'weekly', daysOfWeek: [5] },
    { name: 'Subscription audit', description: 'Review subscriptions once a month.', frequency: 'weekly', daysOfWeek: [0] }
  ],
  relationships: [
    { name: 'Check-in text', description: 'Send a thoughtful message to someone.', frequency: 'daily' },
    { name: 'Quality time', description: '30 minutes of undistracted time with partner/family.', frequency: 'weekly', daysOfWeek: [6] },
    { name: 'Call a friend', description: 'Catch up with one friend each week.', frequency: 'weekly', daysOfWeek: [0] }
  ],
  career: [
    { name: 'Skill drill', description: 'Practice one job-relevant skill for 15 minutes.', frequency: 'daily' },
    { name: 'Network nudge', description: 'Engage with one colleague or mentor.', frequency: 'weekly', daysOfWeek: [3] },
    { name: 'Portfolio update', description: 'Add one bullet/accomplishment this week.', frequency: 'weekly', daysOfWeek: [5] }
  ],
  creativity: [
    { name: 'Sketch daily', description: 'Draw for 10 minutes.', frequency: 'daily' },
    { name: 'Write 100 words', description: 'Free-write or journal 100 words.', frequency: 'daily' },
    { name: 'Practice instrument', description: 'Play for 15 minutes.', frequency: 'daily' }
  ],
  wellness: [
    { name: 'Posture check', description: 'Do a 2-minute posture reset every afternoon.', frequency: 'daily' },
    { name: 'Step outside', description: 'Go outdoors for fresh air for 5 minutes.', frequency: 'daily' },
    { name: 'Weekend sport', description: 'Play a sport or active game.', frequency: 'weekly', daysOfWeek: [6] }
  ],
}

export const ALL_HABIT_CATEGORIES = Object.keys(INTEREST_TO_HABITS)

function shuffleArray(source) {
  const arr = [...source]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

function uniqueByName(items) {
  const seen = new Set()
  return items.filter((it) => {
    const key = (it.name || '').trim().toLowerCase()
    if (!key) return false
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export function discoverHabitIdeas(interests = [], limit = 6) {
  const normalized = Array.isArray(interests) ? interests.filter(Boolean) : []
  let chosen = normalized.filter((c) => ALL_HABIT_CATEGORIES.includes(c))

  if (chosen.length < 3) {
    const remain = ALL_HABIT_CATEGORIES.filter((c) => !chosen.includes(c))
    const needed = Math.min(3 - chosen.length, remain.length)
    chosen = [...chosen, ...shuffleArray(remain).slice(0, needed)]
  }

  const remaining = ALL_HABIT_CATEGORIES.filter((c) => !chosen.includes(c))
  const extraCount = Math.min(remaining.length, Math.floor(Math.random() * 2) + 1)
  if (extraCount > 0) {
    chosen = [...chosen, ...shuffleArray(remaining).slice(0, extraCount)]
  }

  const pools = chosen.map((cat) => shuffleArray(INTEREST_TO_HABITS[cat] || []))
  const picked = []
  let index = 0
  while (picked.length < limit && pools.some((p) => p.length > 0)) {
    const pool = pools[index % pools.length]
    if (pool.length > 0) picked.push(pool.shift())
    index++
  }

  if (picked.length < limit) {
    const remainCats = ALL_HABIT_CATEGORIES.filter((c) => !chosen.includes(c))
    const remainPool = shuffleArray(remainCats.flatMap((c) => INTEREST_TO_HABITS[c] || []))
    picked.push(...remainPool)
  }

  return shuffleArray(uniqueByName(picked)).slice(0, limit)
}
