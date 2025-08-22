import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Tag, Lightbulb, RefreshCw } from 'lucide-react'

const INTEREST_TO_GOALS = {
    fitness: [
      { title: 'Run 5 km without stopping', category: 'Health & Fitness', description: 'Build endurance with a consistent running plan 3x per week.', priority: 'medium', duration: 'short-term' },
      { title: 'Complete 30-day home workout', category: 'Health & Fitness', description: 'Follow a guided 30-day strength and mobility challenge.', priority: 'high', duration: 'short-term' },
      { title: 'Join a local fitness class', category: 'Health & Fitness', description: 'Try yoga, pilates or HIIT 2x a week for a month.', priority: 'low', duration: 'short-term' },
      { title: 'Do 50 push-ups in one go', category: 'Health & Fitness', description: 'Gradually increase daily reps to hit 50 without stopping.', priority: 'medium', duration: 'short-term' },
      { title: 'Reach 10,000 steps daily for a month', category: 'Health & Fitness', description: 'Use a step tracker to monitor and maintain activity.', priority: 'low', duration: 'short-term' },
      { title: 'Master 10 yoga poses', category: 'Health & Fitness', description: 'Learn and practice foundational yoga poses.', priority: 'medium', duration: 'short-term' },
      { title: 'Reduce body fat by 5%', category: 'Health & Fitness', description: 'Track nutrition and training to achieve healthy fat loss.', priority: 'high', duration: 'medium-term' },
      { title: 'Hold a 3-minute plank', category: 'Health & Fitness', description: 'Increase core strength with daily plank practice.', priority: 'medium', duration: 'short-term' },
      { title: 'Participate in a charity run', category: 'Health & Fitness', description: 'Sign up for a 5K or 10K event to support a cause.', priority: 'low', duration: 'short-term' },
      { title: 'Cycle 50 km in a single ride', category: 'Health & Fitness', description: 'Train weekly to improve cycling distance and stamina.', priority: 'medium', duration: 'medium-term' },
      { title: 'Improve mile time by 30 seconds', category: 'Health & Fitness', description: 'Use interval training to boost running speed.', priority: 'medium', duration: 'short-term' },
      { title: 'Do a pull-up', category: 'Health & Fitness', description: 'Train upper body strength to complete at least one strict pull-up.', priority: 'medium', duration: 'short-term' },
      { title: 'Swim 1 km non-stop', category: 'Health & Fitness', description: 'Increase stamina in the pool with gradual distance builds.', priority: 'low', duration: 'medium-term' },
      { title: 'Hike a challenging trail', category: 'Health & Fitness', description: 'Prepare for and complete a day-long hike.', priority: 'low', duration: 'short-term' },
      { title: 'Maintain a workout streak for 60 days', category: 'Health & Fitness', description: 'Exercise daily without missing a single day.', priority: 'high', duration: 'medium-term' },
      { title: 'Reach target BMI', category: 'Health & Fitness', description: 'Combine healthy eating and exercise to achieve a healthy weight.', priority: 'high', duration: 'long-term' },
      { title: 'Master handstand for 30 seconds', category: 'Health & Fitness', description: 'Practice balance and strength daily to hold a handstand.', priority: 'medium', duration: 'medium-term' },
      { title: 'Join a recreational sports league', category: 'Health & Fitness', description: 'Play team sports like football, basketball or badminton weekly.', priority: 'low', duration: 'short-term' },
      { title: 'Track macros for 30 days', category: 'Health & Fitness', description: 'Log meals to understand nutritional balance.', priority: 'medium', duration: 'short-term' },
      { title: 'Do 100 squats daily for 30 days', category: 'Health & Fitness', description: 'Boost lower body strength with a daily squat challenge.', priority: 'medium', duration: 'short-term' },
      { title: 'Learn proper deadlift form', category: 'Health & Fitness', description: 'Master technique to lift safely and efficiently.', priority: 'high', duration: 'short-term' },
      { title: 'Stretch daily for a month', category: 'Health & Fitness', description: 'Improve flexibility with consistent stretching.', priority: 'low', duration: 'short-term' },
      { title: 'Row 5 km on a rowing machine', category: 'Health & Fitness', description: 'Build stamina and strength using rowing workouts.', priority: 'medium', duration: 'short-term' },
      { title: 'Complete a fitness bootcamp', category: 'Health & Fitness', description: 'Join an intensive 1-week or 2-week program.', priority: 'high', duration: 'short-term' },
      { title: 'Hit a personal record in weightlifting', category: 'Health & Fitness', description: 'Track and improve your strength training performance.', priority: 'high', duration: 'medium-term' },
    ],
  
    health: [
      { title: 'Sleep 8 hours daily for 14 days', category: 'Health & Fitness', description: 'Improve sleep quality by maintaining a consistent routine.', priority: 'medium', duration: 'short-term' },
      { title: 'Drink 2L of water daily for 21 days', category: 'Health & Fitness', description: 'Stay hydrated and track your daily water intake.', priority: 'low', duration: 'short-term' },
      { title: 'Reduce sugar intake for a month', category: 'Health & Fitness', description: 'Avoid added sugars and sugary drinks.', priority: 'high', duration: 'short-term' },
      { title: 'Eat 5 servings of fruits and veggies daily', category: 'Health & Fitness', description: 'Incorporate more plant-based nutrients in meals.', priority: 'medium', duration: 'short-term' },
      { title: 'Walk after every meal', category: 'Health & Fitness', description: 'Boost digestion and regulate blood sugar.', priority: 'low', duration: 'short-term' },
      { title: 'Schedule a full health check-up', category: 'Health & Fitness', description: 'Stay proactive about your health with yearly screenings.', priority: 'high', duration: 'short-term' },
      { title: 'Limit caffeine to 1 cup daily', category: 'Health & Fitness', description: 'Reduce dependency and improve sleep quality.', priority: 'low', duration: 'short-term' },
      { title: 'Practice 10 minutes of deep breathing daily', category: 'Health & Fitness', description: 'Reduce stress and improve lung capacity.', priority: 'medium', duration: 'short-term' },
      { title: 'Maintain healthy cholesterol levels', category: 'Health & Fitness', description: 'Adopt a heart-friendly diet and regular exercise.', priority: 'high', duration: 'long-term' },
      { title: 'Cut out processed food for 30 days', category: 'Health & Fitness', description: 'Eat whole, unprocessed meals to improve gut health.', priority: 'medium', duration: 'short-term' },
      { title: 'Track daily mood for a month', category: 'Health & Fitness', description: 'Identify patterns and triggers for better mental health.', priority: 'low', duration: 'short-term' },
      { title: 'Get 20 minutes of sunlight daily', category: 'Health & Fitness', description: 'Boost vitamin D and regulate circadian rhythm.', priority: 'low', duration: 'short-term' },
      { title: 'Limit screen time to 2 hours after work', category: 'Health & Fitness', description: 'Reduce digital eye strain and improve focus.', priority: 'medium', duration: 'short-term' },
      { title: 'Avoid alcohol for 30 days', category: 'Health & Fitness', description: 'Improve liver health and overall wellness.', priority: 'high', duration: 'short-term' },
      { title: 'Maintain a healthy weight', category: 'Health & Fitness', description: 'Stay within a recommended weight range for your height.', priority: 'high', duration: 'long-term' },
      { title: 'Do a daily 5-minute stretching routine', category: 'Health & Fitness', description: 'Relieve muscle stiffness and improve flexibility.', priority: 'low', duration: 'short-term' },
      { title: 'Limit salt intake for 30 days', category: 'Health & Fitness', description: 'Reduce sodium consumption for better heart health.', priority: 'medium', duration: 'short-term' },
      { title: 'Maintain normal blood pressure', category: 'Health & Fitness', description: 'Monitor and manage healthy blood pressure levels.', priority: 'high', duration: 'long-term' },
      { title: 'Have a consistent meal schedule', category: 'Health & Fitness', description: 'Eat meals at the same time daily for better digestion.', priority: 'low', duration: 'short-term' },
      { title: 'Practice gratitude journaling', category: 'Health & Fitness', description: 'Boost mental well-being through daily reflections.', priority: 'medium', duration: 'short-term' },
      { title: 'Limit fried food for a month', category: 'Health & Fitness', description: 'Opt for grilled or steamed alternatives.', priority: 'medium', duration: 'short-term' },
      { title: 'Improve posture in 30 days', category: 'Health & Fitness', description: 'Incorporate posture exercises and ergonomic setups.', priority: 'high', duration: 'short-term' },
      { title: 'Take a daily multivitamin', category: 'Health & Fitness', description: 'Fill nutritional gaps with supplements.', priority: 'low', duration: 'short-term' },
      { title: 'Cook healthy meals at home', category: 'Health & Fitness', description: 'Prepare home-cooked meals to control ingredients.', priority: 'medium', duration: 'short-term' },
      { title: 'Get 1,000 minutes of exercise this month', category: 'Health & Fitness', description: 'Track and accumulate activity over a month.', priority: 'medium', duration: 'short-term' },
    ],
  
    travel: [
        { title: 'Plan a weekend getaway', category: 'Travel & Adventure', description: 'Pick a nearby destination and plan a budget-friendly trip.', priority: 'medium', duration: 'short-term' },
        { title: 'Create a 6-month travel savings plan', category: 'Travel & Adventure', description: 'Set a monthly saving target to fund your next trip.', priority: 'high', duration: 'medium-term' },
        { title: 'Visit a UNESCO heritage site', category: 'Travel & Adventure', description: 'Explore a culturally significant location.', priority: 'low', duration: 'medium-term' },
        { title: 'Take a solo trip', category: 'Travel & Adventure', description: 'Plan and execute a solo travel adventure.', priority: 'high', duration: 'medium-term' },
        { title: 'Go on a camping trip', category: 'Travel & Adventure', description: 'Experience the outdoors with overnight camping.', priority: 'medium', duration: 'short-term' },
        { title: 'Travel to a new country', category: 'Travel & Adventure', description: 'Explore a completely new culture and destination.', priority: 'high', duration: 'long-term' },
        { title: 'Book a last-minute trip', category: 'Travel & Adventure', description: 'Embrace spontaneity and travel on short notice.', priority: 'low', duration: 'short-term' },
        { title: 'Plan a cross-country road trip', category: 'Travel & Adventure', description: 'Drive through multiple cities or states.', priority: 'medium', duration: 'medium-term' },
        { title: 'Stay in a unique Airbnb', category: 'Travel & Adventure', description: 'Book an unusual stay like a treehouse or houseboat.', priority: 'low', duration: 'short-term' },
        { title: 'Attend a cultural festival abroad', category: 'Travel & Adventure', description: 'Immerse yourself in another country\'s celebrations.', priority: 'high', duration: 'long-term' },
        { title: 'Take a train journey through scenic routes', category: 'Travel & Adventure', description: 'Enjoy landscapes from a train window.', priority: 'low', duration: 'short-term' },
        { title: 'Plan a hiking expedition', category: 'Travel & Adventure', description: 'Research and complete a multi-day hike.', priority: 'medium', duration: 'medium-term' },
        { title: 'Travel to a coastal city', category: 'Travel & Adventure', description: 'Spend a weekend exploring beaches and seafood spots.', priority: 'low', duration: 'short-term' },
        { title: 'Collect souvenirs from 5 countries', category: 'Travel & Adventure', description: 'Create a small keepsake collection.', priority: 'medium', duration: 'long-term' },
        { title: 'Book a luxury hotel stay', category: 'Travel & Adventure', description: 'Experience a high-end hotel for a night or weekend.', priority: 'low', duration: 'short-term' },
        { title: 'Go on a cruise', category: 'Travel & Adventure', description: 'Spend several days at sea visiting different ports.', priority: 'medium', duration: 'long-term' },
        { title: 'Try a food tour in a new city', category: 'Travel & Adventure', description: 'Sample local cuisine through guided tours.', priority: 'medium', duration: 'short-term' },
        { title: 'Visit a national park', category: 'Travel & Adventure', description: 'Explore natural beauty and wildlife.', priority: 'low', duration: 'short-term' },
        { title: 'Travel with friends to a new place', category: 'Travel & Adventure', description: 'Plan a group trip to create shared memories.', priority: 'medium', duration: 'medium-term' },
        { title: 'Learn basic phrases in the local language', category: 'Travel & Adventure', description: 'Enhance your travel experience by speaking locally.', priority: 'low', duration: 'short-term' },
        { title: 'Go backpacking for a week', category: 'Travel & Adventure', description: 'Travel light and explore multiple spots.', priority: 'high', duration: 'medium-term' },
        { title: 'Visit a mountain village', category: 'Travel & Adventure', description: 'Stay in a remote and scenic location.', priority: 'low', duration: 'short-term' },
        { title: 'Document a trip through vlogs', category: 'Travel & Adventure', description: 'Record and edit a travel video series.', priority: 'medium', duration: 'short-term' },
        { title: 'Visit all states in your country', category: 'Travel & Adventure', description: 'Make a checklist and track progress.', priority: 'high', duration: 'long-term' },
        { title: 'Plan a surprise trip for someone', category: 'Travel & Adventure', description: 'Organize a hidden itinerary for a loved one.', priority: 'medium', duration: 'short-term' },
      ],
    
      education: [
        { title: 'Complete an online course', category: 'Education & Learning', description: 'Pick a topic of interest and finish a course in 30 days.', priority: 'medium', duration: 'short-term' },
        { title: 'Read 12 books this year', category: 'Education & Learning', description: 'Set a monthly reading target and track progress.', priority: 'low', duration: 'long-term' },
        { title: 'Learn a new language to conversational level', category: 'Education & Learning', description: 'Study consistently to hold conversations.', priority: 'high', duration: 'long-term' },
        { title: 'Earn a professional certification', category: 'Education & Learning', description: 'Get certified in a relevant industry skill.', priority: 'high', duration: 'medium-term' },
        { title: 'Attend a workshop or seminar', category: 'Education & Learning', description: 'Gain practical knowledge from experts.', priority: 'medium', duration: 'short-term' },
        { title: 'Write a research paper', category: 'Education & Learning', description: 'Publish or submit work to a journal.', priority: 'high', duration: 'long-term' },
        { title: 'Watch 10 educational documentaries', category: 'Education & Learning', description: 'Learn visually through in-depth documentaries.', priority: 'low', duration: 'short-term' },
        { title: 'Complete a coding bootcamp', category: 'Education & Learning', description: 'Gain hands-on tech skills in weeks.', priority: 'high', duration: 'medium-term' },
        { title: 'Join a study group', category: 'Education & Learning', description: 'Collaborate with peers to enhance learning.', priority: 'low', duration: 'short-term' },
        { title: 'Learn basic sign language', category: 'Education & Learning', description: 'Communicate inclusively with hearing-impaired individuals.', priority: 'medium', duration: 'short-term' },
        { title: 'Read 5 biographies', category: 'Education & Learning', description: 'Learn from the life stories of inspiring people.', priority: 'low', duration: 'medium-term' },
        { title: 'Learn public speaking skills', category: 'Education & Learning', description: 'Join a club like Toastmasters.', priority: 'medium', duration: 'short-term' },
        { title: 'Master Microsoft Excel', category: 'Education & Learning', description: 'Learn advanced formulas and pivot tables.', priority: 'medium', duration: 'short-term' },
        { title: 'Write a blog on a learned topic', category: 'Education & Learning', description: 'Share insights and teach others.', priority: 'low', duration: 'short-term' },
        { title: 'Take a short course in personal finance', category: 'Education & Learning', description: 'Understand budgeting and investments.', priority: 'medium', duration: 'short-term' },
        { title: 'Read academic journals weekly for a month', category: 'Education & Learning', description: 'Stay updated with latest research.', priority: 'low', duration: 'short-term' },
        { title: 'Learn how to speed read', category: 'Education & Learning', description: 'Improve reading efficiency.', priority: 'medium', duration: 'short-term' },
        { title: 'Complete a daily learning challenge', category: 'Education & Learning', description: 'Dedicate 15 minutes to learning each day.', priority: 'low', duration: 'short-term' },
        { title: 'Create a personal learning plan', category: 'Education & Learning', description: 'Outline goals and resources for self-study.', priority: 'medium', duration: 'short-term' },
        { title: 'Take an art history course', category: 'Education & Learning', description: 'Understand the evolution of art styles.', priority: 'low', duration: 'medium-term' },
        { title: 'Master a musical instrument', category: 'Education & Learning', description: 'Practice regularly to play fluently.', priority: 'high', duration: 'long-term' },
        { title: 'Complete a beginner\'s psychology course', category: 'Education & Learning', description: 'Learn the basics of human behavior.', priority: 'medium', duration: 'short-term' },
        { title: 'Attend a free online university lecture', category: 'Education & Learning', description: 'Access open courses from top institutions.', priority: 'low', duration: 'short-term' },
        { title: 'Improve academic writing skills', category: 'Education & Learning', description: 'Learn structure, clarity, and citations.', priority: 'medium', duration: 'short-term' },
        { title: 'Memorize 100 new vocabulary words', category: 'Education & Learning', description: 'Enhance language skills through daily learning.', priority: 'low', duration: 'short-term' },
      ],
    
      career: [
        { title: 'Update resume and LinkedIn', category: 'Career & Business', description: 'Refresh your profile and showcase recent achievements.', priority: 'high', duration: 'short-term' },
        { title: 'Apply to 10 relevant roles', category: 'Career & Business', description: 'Shortlist roles and submit tailored applications.', priority: 'medium', duration: 'short-term' },
        { title: 'Attend an industry networking event', category: 'Career & Business', description: 'Meet professionals and expand your network.', priority: 'medium', duration: 'short-term' },
        { title: 'Negotiate a salary raise', category: 'Career & Business', description: 'Prepare data and confidently request a raise.', priority: 'high', duration: 'short-term' },
        { title: 'Start a side hustle', category: 'Career & Business', description: 'Build additional income through a personal project.', priority: 'high', duration: 'long-term' },
        { title: 'Find a career mentor', category: 'Career & Business', description: 'Seek guidance from an experienced professional.', priority: 'medium', duration: 'medium-term' },
        { title: 'Complete a leadership course', category: 'Career & Business', description: 'Improve management and team-leading skills.', priority: 'high', duration: 'medium-term' },
        { title: 'Improve presentation skills', category: 'Career & Business', description: 'Take a workshop to enhance public speaking.', priority: 'medium', duration: 'short-term' },
        { title: 'Get a promotion', category: 'Career & Business', description: 'Work strategically to advance your role.', priority: 'high', duration: 'long-term' },
        { title: 'Build a personal brand website', category: 'Career & Business', description: 'Showcase your expertise and portfolio.', priority: 'medium', duration: 'medium-term' },
        { title: 'Publish an industry-related article', category: 'Career & Business', description: 'Share insights and grow professional credibility.', priority: 'low', duration: 'short-term' },
        { title: 'Join a professional association', category: 'Career & Business', description: 'Access resources and networking opportunities.', priority: 'low', duration: 'medium-term' },
        { title: 'Learn a new job-relevant skill', category: 'Career & Business', description: 'Take a course to improve your qualifications.', priority: 'medium', duration: 'short-term' },
        { title: 'Shadow a colleague in another department', category: 'Career & Business', description: 'Gain insight into other roles.', priority: 'low', duration: 'short-term' },
        { title: 'Launch a work-related project', category: 'Career & Business', description: 'Propose and implement a new initiative.', priority: 'high', duration: 'medium-term' },
        { title: 'Improve time management skills', category: 'Career & Business', description: 'Use tools and methods to be more productive.', priority: 'medium', duration: 'short-term' },
        { title: 'Attend an international conference', category: 'Career & Business', description: 'Learn and connect with global peers.', priority: 'high', duration: 'long-term' },
        { title: 'Obtain a higher academic degree', category: 'Career & Business', description: 'Pursue a master\'s or doctorate program.', priority: 'high', duration: 'long-term' },
        { title: 'Contribute to an open-source project', category: 'Career & Business', description: 'Showcase skills through public collaboration.', priority: 'medium', duration: 'short-term' },
        { title: 'Lead a team project', category: 'Career & Business', description: 'Take charge of a major work deliverable.', priority: 'high', duration: 'medium-term' },
        { title: 'Improve work-life balance', category: 'Career & Business', description: 'Set boundaries for personal and professional life.', priority: 'medium', duration: 'long-term' },
        { title: 'Write a professional e-book', category: 'Career & Business', description: 'Compile your expertise into a digital book.', priority: 'low', duration: 'long-term' },
        { title: 'Complete 3 case studies in your field', category: 'Career & Business', description: 'Demonstrate expertise with practical examples.', priority: 'medium', duration: 'short-term' },
        { title: 'Attend company-sponsored training', category: 'Career & Business', description: 'Utilize internal opportunities for growth.', priority: 'low', duration: 'short-term' },
        { title: 'Mentor a junior colleague', category: 'Career & Business', description: 'Guide and help develop others professionally.', priority: 'medium', duration: 'short-term' },
      ],
    
      finance: [
        { title: 'Build a 3-month emergency fund', category: 'Financial Goals', description: 'Automate monthly savings to reach your safety net.', priority: 'high', duration: 'long-term' },
        { title: 'Track expenses for 30 days', category: 'Financial Goals', description: 'Categorize spending and identify saving opportunities.', priority: 'medium', duration: 'short-term' },
        { title: 'Pay off credit card debt', category: 'Financial Goals', description: 'Focus on clearing high-interest debt.', priority: 'high', duration: 'medium-term' },
        { title: 'Start an investment portfolio', category: 'Financial Goals', description: 'Open an account and invest regularly.', priority: 'high', duration: 'long-term' },
        { title: 'Save for a major purchase', category: 'Financial Goals', description: 'Set a savings target for a big expense.', priority: 'medium', duration: 'medium-term' },
        { title: 'Create a monthly budget', category: 'Financial Goals', description: 'Allocate spending and stick to limits.', priority: 'medium', duration: 'short-term' },
        { title: 'Learn about stock market investing', category: 'Financial Goals', description: 'Take an introductory investment course.', priority: 'medium', duration: 'short-term' },
        { title: 'Build a retirement plan', category: 'Financial Goals', description: 'Estimate needs and start contributions.', priority: 'high', duration: 'long-term' },
        { title: 'Open a high-yield savings account', category: 'Financial Goals', description: 'Earn better returns on idle cash.', priority: 'low', duration: 'short-term' },
        { title: 'Avoid eating out for a month', category: 'Financial Goals', description: 'Save by preparing meals at home.', priority: 'low', duration: 'short-term' },
        { title: 'Sell unused items for extra income', category: 'Financial Goals', description: 'Declutter and earn from unwanted things.', priority: 'medium', duration: 'short-term' },
        { title: 'Automate all bill payments', category: 'Financial Goals', description: 'Avoid late fees and improve credit score.', priority: 'low', duration: 'short-term' },
        { title: 'Review and reduce subscriptions', category: 'Financial Goals', description: 'Cut unnecessary recurring expenses.', priority: 'medium', duration: 'short-term' },
        { title: 'Save 20% of income for 6 months', category: 'Financial Goals', description: 'Build disciplined savings habit.', priority: 'high', duration: 'medium-term' },
        { title: 'Set up an emergency medical fund', category: 'Financial Goals', description: 'Prepare for unexpected healthcare expenses.', priority: 'high', duration: 'long-term' },
        { title: 'Learn about tax-saving investments', category: 'Financial Goals', description: 'Explore legal ways to reduce tax liability.', priority: 'medium', duration: 'short-term' },
        { title: 'Plan for a home down payment', category: 'Financial Goals', description: 'Save consistently towards buying a home.', priority: 'high', duration: 'long-term' },
        { title: 'Switch to a cheaper insurance plan', category: 'Financial Goals', description: 'Compare policies and cut costs.', priority: 'low', duration: 'short-term' },
        { title: 'Track net worth quarterly', category: 'Financial Goals', description: 'Monitor financial growth regularly.', priority: 'medium', duration: 'long-term' },
        { title: 'Invest in mutual funds', category: 'Financial Goals', description: 'Diversify with professionally managed funds.', priority: 'medium', duration: 'long-term' },
        { title: 'Start a passive income stream', category: 'Financial Goals', description: 'Generate extra money without active work.', priority: 'high', duration: 'long-term' },
        { title: 'Reduce utility bills by 10%', category: 'Financial Goals', description: 'Adopt energy-saving habits.', priority: 'low', duration: 'short-term' },
        { title: 'Save all bonus income', category: 'Financial Goals', description: 'Direct bonuses into savings/investments.', priority: 'medium', duration: 'short-term' }
      ],
      hobbies: [
        { title: 'Learn to play the guitar', category: 'Hobbies', description: 'Dedicate 30 minutes a day to guitar practice and learn at least 5 complete songs.', priority: 'medium' },
        { title: 'Master chess strategies', category: 'Hobbies', description: 'Study chess openings and tactics weekly to improve competitive play.', priority: 'high' },
        { title: 'Complete a 1000-piece puzzle', category: 'Hobbies', description: 'Challenge patience and focus by completing a large, detailed jigsaw puzzle.', priority: 'low' },
        { title: 'Start a coin collection', category: 'Hobbies', description: 'Collect coins from different countries and eras to learn history.', priority: 'low' },
        { title: 'Join a local book club', category: 'Hobbies', description: 'Read and discuss one book per month with fellow enthusiasts.', priority: 'medium' },
        { title: 'Learn baking', category: 'Hobbies', description: 'Master baking bread, cookies, and cakes through weekly practice.', priority: 'medium' },
        { title: 'Build a model train set', category: 'Hobbies', description: 'Assemble and customize a complete miniature railway system.', priority: 'low' },
        { title: 'Go birdwatching', category: 'Hobbies', description: 'Identify and record sightings of at least 20 bird species.', priority: 'low' },
        { title: 'Take photography walks', category: 'Hobbies', description: 'Capture unique shots of nature, people, and architecture weekly.', priority: 'medium' },
        { title: 'Grow a bonsai tree', category: 'Hobbies', description: 'Learn the art of cultivating and shaping a bonsai tree over time.', priority: 'low' },
        { title: 'Learn origami', category: 'Hobbies', description: 'Fold and master at least 20 complex origami designs.', priority: 'low' },
        { title: 'Practice calligraphy', category: 'Hobbies', description: 'Develop beautiful handwriting styles with daily calligraphy exercises.', priority: 'medium' },
        { title: 'Explore astronomy', category: 'Hobbies', description: 'Observe planets, stars, and constellations with a telescope.', priority: 'low' },
        { title: 'Create a YouTube hobby channel', category: 'Hobbies', description: 'Share hobby-related tips and tutorials regularly.', priority: 'high' },
        { title: 'Learn knitting or crocheting', category: 'Hobbies', description: 'Create scarves, hats, or blankets by learning patterns.', priority: 'low' },
        { title: 'Join a theater workshop', category: 'Hobbies', description: 'Participate in acting and drama sessions for creativity.', priority: 'medium' },
        { title: 'Play board games weekly', category: 'Hobbies', description: 'Organize game nights with friends or family regularly.', priority: 'low' },
        { title: 'Start a nature journal', category: 'Hobbies', description: 'Document observations, sketches, and reflections from outdoor experiences.', priority: 'low' },
        { title: 'Try pottery making', category: 'Hobbies', description: 'Learn pottery techniques and create functional art pieces.', priority: 'medium' },
        { title: 'Volunteer for hobby workshops', category: 'Hobbies', description: 'Share skills by teaching hobby classes locally.', priority: 'medium' },
        { title: 'Paint a full art series', category: 'Hobbies', description: 'Complete a collection of at least 10 paintings with a theme.', priority: 'high' },
        { title: 'Join a local hiking club', category: 'Hobbies', description: 'Explore new trails every month with fellow hikers.', priority: 'medium' },
        { title: 'Make handmade jewelry', category: 'Hobbies', description: 'Design and craft unique pieces for personal use or sale.', priority: 'low' },
        { title: 'Restore vintage items', category: 'Hobbies', description: 'Repair and refurbish old furniture, tools, or decor.', priority: 'medium' },
        { title: 'Host a themed dinner night', category: 'Hobbies', description: 'Cook and serve dishes from a specific cuisine for friends.', priority: 'low' }
      ],
      relationships: [
        { title: 'Plan monthly date nights', category: 'Relationships', description: 'Dedicate quality time for special evenings with your partner.', priority: 'high' },
        { title: 'Reconnect with old friends', category: 'Relationships', description: 'Reach out to one friend per month to rebuild connections.', priority: 'medium' },
        { title: 'Start a family game night', category: 'Relationships', description: 'Bring family together with weekly board or card games.', priority: 'low' },
        { title: 'Celebrate loved ones\' milestones', category: 'Relationships', description: 'Remember and plan surprises for birthdays and anniversaries.', priority: 'medium' },
        { title: 'Host a neighborhood gathering', category: 'Relationships', description: 'Build stronger bonds by organizing a casual get-together.', priority: 'low' },
        { title: 'Write handwritten letters', category: 'Relationships', description: 'Send thoughtful letters to friends or family quarterly.', priority: 'low' },
        { title: 'Take a couples workshop', category: 'Relationships', description: 'Enhance communication and understanding with guided sessions.', priority: 'medium' },
        { title: 'Volunteer together', category: 'Relationships', description: 'Participate in community service with friends or family.', priority: 'low' },
        { title: 'Create a relationship scrapbook', category: 'Relationships', description: 'Compile memories, photos, and milestones in a creative book.', priority: 'low' },
        { title: 'Practice active listening', category: 'Relationships', description: 'Dedicate time to truly hear and understand others daily.', priority: 'high' },
        { title: 'Join a couples fitness program', category: 'Relationships', description: 'Stay fit and bond by exercising together regularly.', priority: 'medium' },
        { title: 'Plan a surprise trip', category: 'Relationships', description: 'Organize a short getaway for a loved one without them knowing.', priority: 'high' },
        { title: 'Have tech-free dinners', category: 'Relationships', description: 'Ensure distraction-free mealtimes with loved ones.', priority: 'high' },
        { title: 'Attend friends\' big events', category: 'Relationships', description: 'Be present for weddings, graduations, and important occasions.', priority: 'medium' },
        { title: 'Learn conflict resolution', category: 'Relationships', description: 'Practice techniques for resolving disagreements constructively.', priority: 'medium' },
        { title: 'Cook meals together', category: 'Relationships', description: 'Strengthen bonds by preparing meals with family or friends.', priority: 'low' },
        { title: 'Share hobbies with loved ones', category: 'Relationships', description: 'Introduce others to your passions for shared enjoyment.', priority: 'low' },
        { title: 'Organize group trips', category: 'Relationships', description: 'Plan vacations with friends or extended family yearly.', priority: 'medium' },
        { title: 'Build a family tradition', category: 'Relationships', description: 'Start an activity or ritual to repeat every year together.', priority: 'low' },
        { title: 'Practice gratitude in relationships', category: 'Relationships', description: 'Express appreciation to loved ones regularly.', priority: 'high' },
        { title: 'Support each other\'s goals', category: 'Relationships', description: 'Encourage and assist loved ones in achieving personal milestones.', priority: 'medium' },
        { title: 'Take family portraits yearly', category: 'Relationships', description: 'Capture moments together with professional photography.', priority: 'low' },
        { title: 'Attend couples counseling proactively', category: 'Relationships', description: 'Seek guidance to maintain a healthy relationship.', priority: 'medium' },
        { title: 'Join a social club', category: 'Relationships', description: 'Expand your circle by participating in community activities.', priority: 'low' },
        { title: 'Practice random acts of kindness', category: 'Relationships', description: 'Do thoughtful gestures for loved ones unexpectedly.', priority: 'low' }
      ],
      personal_growth: [
        { title: 'Read 12 books in a year', category: 'Personal Growth', description: 'Expand knowledge by completing one book each month.', priority: 'medium' },
        { title: 'Take an online course', category: 'Personal Growth', description: 'Enroll in a course to learn a new professional skill.', priority: 'high' },
        { title: 'Practice daily journaling', category: 'Personal Growth', description: 'Write reflections and lessons learned each day.', priority: 'medium' },
        { title: 'Wake up at 5 AM', category: 'Personal Growth', description: 'Build a morning routine for productivity and focus.', priority: 'high' },
        { title: 'Meditate for 10 minutes daily', category: 'Personal Growth', description: 'Develop mindfulness through consistent practice.', priority: 'high' },
        { title: 'Attend a personal development seminar', category: 'Personal Growth', description: 'Gain insights from experts and network with like-minded people.', priority: 'medium' },
        { title: 'Learn a new language', category: 'Personal Growth', description: 'Commit to practicing a foreign language daily for fluency.', priority: 'high' },
        { title: 'Set and track monthly goals', category: 'Personal Growth', description: 'Break big ambitions into small achievable milestones.', priority: 'high' },
        { title: 'Build a personal website', category: 'Personal Growth', description: 'Showcase skills, projects, and achievements online.', priority: 'medium' },
        { title: 'Overcome a fear', category: 'Personal Growth', description: 'Face and gradually conquer something that causes anxiety.', priority: 'high' },
        { title: 'Reduce social media usage', category: 'Personal Growth', description: 'Limit daily screen time to focus on real-life activities.', priority: 'medium' },
        { title: 'Start a gratitude journal', category: 'Personal Growth', description: 'List three things you\'re grateful for daily.', priority: 'high' },
        { title: 'Build a strong morning routine', category: 'Personal Growth', description: 'Incorporate exercise, learning, and planning each morning.', priority: 'high' },
        { title: 'Improve public speaking skills', category: 'Personal Growth', description: 'Join a club or practice presentations regularly.', priority: 'medium' },
        { title: 'Develop financial literacy', category: 'Personal Growth', description: 'Understand budgeting, investing, and debt management.', priority: 'high' },
        { title: 'Learn time management', category: 'Personal Growth', description: 'Master planning tools to use time effectively.', priority: 'high' },
        { title: 'Keep a habit tracker', category: 'Personal Growth', description: 'Track positive habits daily to ensure consistency.', priority: 'medium' },
        { title: 'Take personality assessments', category: 'Personal Growth', description: 'Understand strengths and areas for improvement.', priority: 'low' },
        { title: 'Complete a 30-day challenge', category: 'Personal Growth', description: 'Focus on one self-improvement goal for 30 consecutive days.', priority: 'medium' },
        { title: 'Read a biography of a role model', category: 'Personal Growth', description: 'Gain inspiration from the life journey of someone you admire.', priority: 'low' },
        { title: 'Practice daily affirmations', category: 'Personal Growth', description: 'Repeat positive statements to reinforce confidence.', priority: 'medium' },
        { title: 'Seek mentorship', category: 'Personal Growth', description: 'Find a mentor to guide personal and career growth.', priority: 'high' },
        { title: 'Declutter your space', category: 'Personal Growth', description: 'Organize and simplify your environment for mental clarity.', priority: 'low' },
        { title: 'Build resilience', category: 'Personal Growth', description: 'Develop mental toughness by facing challenges head-on.', priority: 'high' },
        { title: 'Learn critical thinking', category: 'Personal Growth', description: 'Analyze information objectively for better decisions.', priority: 'high' }
      ],
      creativity: [
        { title: 'Write a short story', category: 'Creativity', description: 'Create and complete an original short fiction piece.', priority: 'medium' },
        { title: 'Design a personal logo', category: 'Creativity', description: 'Create a unique symbol that represents your identity.', priority: 'medium' },
        { title: 'Start a daily sketchbook', category: 'Creativity', description: 'Draw something new each day to improve artistic skills.', priority: 'high' },
        { title: 'Learn digital illustration', category: 'Creativity', description: 'Master software like Procreate or Illustrator.', priority: 'high' },
        { title: 'Compose a song', category: 'Creativity', description: 'Write and record an original piece of music.', priority: 'medium' },
        { title: 'Make a short film', category: 'Creativity', description: 'Plan, shoot, and edit a video project.', priority: 'high' },
        { title: 'Create a personal blog', category: 'Creativity', description: 'Write and share creative ideas and experiences online.', priority: 'medium' },
        { title: 'Experiment with abstract painting', category: 'Creativity', description: 'Use colors and textures to create expressive works.', priority: 'low' },
        { title: 'Participate in a 30-day art challenge', category: 'Creativity', description: 'Complete a creative task daily for a month.', priority: 'medium' },
        { title: 'Learn hand lettering', category: 'Creativity', description: 'Develop decorative writing styles for design projects.', priority: 'low' },
        { title: 'Build a photo portfolio', category: 'Creativity', description: 'Curate your best photography work into a cohesive set.', priority: 'medium' },
        { title: 'Write a stage play', category: 'Creativity', description: 'Create dialogue and scenes for a theatrical performance.', priority: 'high' },
        { title: 'Create an art installation', category: 'Creativity', description: 'Design and build a space-transforming artwork.', priority: 'high' },
        { title: 'Design your own fashion collection', category: 'Creativity', description: 'Sketch, sew, and showcase unique clothing designs.', priority: 'high' },
        { title: 'Learn animation basics', category: 'Creativity', description: 'Create simple animations using digital tools.', priority: 'medium' },
        { title: 'Produce a podcast', category: 'Creativity', description: 'Plan, record, and publish a series of themed episodes.', priority: 'medium' },
        { title: 'Make a DIY home decor project', category: 'Creativity', description: 'Design and craft decorative items for your living space.', priority: 'low' },
        { title: 'Enter a creative competition', category: 'Creativity', description: 'Submit your work to art, writing, or design contests.', priority: 'medium' },
        { title: 'Collaborate on a creative project', category: 'Creativity', description: 'Work with others to bring a shared vision to life.', priority: 'high' },
        { title: 'Illustrate a children\'s book', category: 'Creativity', description: 'Draw and design visuals for a story aimed at kids.', priority: 'medium' },
        { title: 'Make a scrapbook', category: 'Creativity', description: 'Combine photos, memorabilia, and art into a themed book.', priority: 'low' },
        { title: 'Learn pottery glazing techniques', category: 'Creativity', description: 'Experiment with colors and finishes on pottery.', priority: 'low' },
        { title: 'Write poetry regularly', category: 'Creativity', description: 'Compose poems weekly to develop literary expression.', priority: 'medium' },
        { title: 'Design a board game', category: 'Creativity', description: 'Create rules, themes, and visuals for an original game.', priority: 'high' },
        { title: 'Paint a self-portrait', category: 'Creativity', description: 'Capture your own likeness in an artistic medium.', priority: 'medium' }
      ],
      technology: [
        { title: 'Learn a new programming language', category: 'Technology', description: 'Expand your skillset by learning a language like Python, Rust, or Go.' },
        { title: 'Build a mobile app', category: 'Technology', description: 'Develop and publish a fully functional mobile application.' },
        { title: 'Set up a smart home system', category: 'Technology', description: 'Automate your home with IoT devices and voice assistants.' },
        { title: 'Create a personal website', category: 'Technology', description: 'Showcase your skills and projects with a custom-built portfolio.' },
        { title: 'Contribute to open-source projects', category: 'Technology', description: 'Collaborate with global developers on GitHub or GitLab.' },
        { title: 'Build a custom PC', category: 'Technology', description: 'Assemble a desktop computer tailored to your needs.' },
        { title: 'Learn ethical hacking basics', category: 'Technology', description: 'Understand cybersecurity principles and penetration testing.' },
        { title: 'Master Excel and data analysis', category: 'Technology', description: 'Use advanced formulas, pivot tables, and data visualization tools.' },
        { title: 'Explore artificial intelligence tools', category: 'Technology', description: 'Experiment with AI-powered applications and APIs.' },
        { title: 'Create a chatbot', category: 'Technology', description: 'Build and deploy an interactive chatbot for fun or business.' },
        { title: 'Learn video editing', category: 'Technology', description: 'Edit and produce professional-quality videos using tools like Premiere Pro.' },
        { title: 'Host your own server', category: 'Technology', description: 'Run a website, game, or media server from your home.' },
        { title: 'Try 3D printing', category: 'Technology', description: 'Design and print objects using a 3D printer.' },
        { title: 'Take a cybersecurity course', category: 'Technology', description: 'Gain certifications in digital security and threat prevention.' },
        { title: 'Automate repetitive tasks', category: 'Technology', description: 'Use scripts or tools like Zapier to save time.' },
        { title: 'Learn cloud computing', category: 'Technology', description: 'Understand AWS, Azure, or Google Cloud platforms.' },
        { title: 'Create a YouTube tech channel', category: 'Technology', description: 'Share tutorials, reviews, or tech tips with an audience.' },
        { title: 'Experiment with AR/VR', category: 'Technology', description: 'Develop or use augmented and virtual reality experiences.' },
        { title: 'Learn to code games', category: 'Technology', description: 'Build small games using Unity, Unreal, or Godot.' },
        { title: 'Take a robotics workshop', category: 'Technology', description: 'Build and program robots for fun or competition.' },
        { title: 'Set up a home lab', category: 'Technology', description: 'Experiment with networking, virtual machines, and servers.' },
        { title: 'Create a mobile game', category: 'Technology', description: 'Develop and publish your own game on app stores.' },
        { title: 'Learn blockchain basics', category: 'Technology', description: 'Understand cryptocurrency, smart contracts, and NFTs.' },
        { title: 'Build a personal AI assistant', category: 'Technology', description: 'Use AI models to automate and assist daily tasks.' },
        { title: 'Take a UI/UX design course', category: 'Technology', description: 'Learn how to create beautiful and user-friendly interfaces.' },
      ],
    
      business: [
        { title: 'Start a side hustle', category: 'Business', description: 'Launch a small project or service to earn extra income.' },
        { title: 'Write a business plan', category: 'Business', description: 'Plan and outline the strategy for a new business idea.' },
        { title: 'Invest in the stock market', category: 'Business', description: 'Start with small investments to understand market trends.' },
        { title: 'Read 5 entrepreneurship books', category: 'Business', description: 'Learn from the success stories of experienced entrepreneurs.' },
        { title: 'Attend a networking event', category: 'Business', description: 'Meet like-minded professionals to grow your network.' },
        { title: 'Create a personal brand', category: 'Business', description: 'Build a consistent identity across your social profiles.' },
        { title: 'Start a blog on business topics', category: 'Business', description: 'Share insights and strategies to attract an audience.' },
        { title: 'Take a marketing course', category: 'Business', description: 'Learn digital marketing, SEO, and social media advertising.' },
        { title: 'Launch an online store', category: 'Business', description: 'Sell products through Shopify, Etsy, or Amazon.' },
        { title: 'Create an email newsletter', category: 'Business', description: 'Share tips, news, or deals with your subscribers.' },
        { title: 'Learn negotiation skills', category: 'Business', description: 'Improve your ability to close deals and win agreements.' },
        { title: 'Host a webinar', category: 'Business', description: 'Share knowledge and connect with a virtual audience.' },
        { title: 'Learn financial management', category: 'Business', description: 'Understand budgeting, investments, and profit margins.' },
        { title: 'Collaborate on a joint venture', category: 'Business', description: 'Partner with another business for mutual growth.' },
        { title: 'Create a sales pitch', category: 'Business', description: 'Craft and practice a compelling offer for potential clients.' },
        { title: 'Start a consulting service', category: 'Business', description: 'Offer expertise to help other businesses grow.' },
        { title: 'Develop a passive income stream', category: 'Business', description: 'Earn income with minimal ongoing effort.' },
        { title: 'Learn project management', category: 'Business', description: 'Use tools like Trello or Asana to organize work.' },
        { title: 'Pitch to an investor', category: 'Business', description: 'Present your business idea for funding opportunities.' },
        { title: 'Read daily business news', category: 'Business', description: 'Stay updated with market and industry trends.' },
        { title: 'Join a business mastermind group', category: 'Business', description: 'Collaborate and grow with like-minded professionals.' },
        { title: 'Optimize your LinkedIn profile', category: 'Business', description: 'Improve your professional visibility and networking.' },
        { title: 'Launch a crowdfunding campaign', category: 'Business', description: 'Raise funds for a creative or business idea.' },
        { title: 'Develop leadership skills', category: 'Business', description: 'Learn to inspire and manage a team effectively.' },
        { title: 'Write a case study', category: 'Business', description: 'Document and share a real-world business success story.' },
      ],
    
      lifestyle: [
        { title: 'Create a morning routine', category: 'Lifestyle', description: 'Start your day with healthy and productive habits.' },
        { title: 'Declutter your home', category: 'Lifestyle', description: 'Simplify your space by removing unnecessary items.' },
        { title: 'Plan a monthly outing', category: 'Lifestyle', description: 'Make time for exploration and fun experiences.' },
        { title: 'Try a new recipe every week', category: 'Lifestyle', description: 'Expand your cooking skills with diverse cuisines.' },
        { title: 'Practice daily journaling', category: 'Lifestyle', description: 'Reflect and record your thoughts and goals.' },
        { title: 'Start a skincare routine', category: 'Lifestyle', description: 'Take care of your skin with a regular regimen.' },
        { title: 'Explore minimalism', category: 'Lifestyle', description: 'Live with less for a simpler, more intentional life.' },
        { title: 'Switch to eco-friendly products', category: 'Lifestyle', description: 'Make sustainable choices for daily living.' },
        { title: 'Host a dinner party', category: 'Lifestyle', description: 'Invite friends or family for a special meal.' },
        { title: 'Redesign your living space', category: 'Lifestyle', description: 'Refresh your home décor for comfort and style.' },
        { title: 'Take a digital detox', category: 'Lifestyle', description: 'Spend a day without screens to recharge mentally.' },
        { title: 'Grow indoor plants', category: 'Lifestyle', description: 'Add greenery to your home for better air and mood.' },
        { title: 'Learn basic sewing', category: 'Lifestyle', description: 'Mend or customize clothes yourself.' },
        { title: 'Plan a self-care day', category: 'Lifestyle', description: 'Dedicate a day to relaxation and wellness.' },
        { title: 'Join a local club', category: 'Lifestyle', description: 'Participate in activities that match your interests.' },
        { title: 'Improve your posture', category: 'Lifestyle', description: 'Incorporate exercises and reminders to stand tall.' },
        { title: 'Switch to healthy snacks', category: 'Lifestyle', description: 'Replace junk food with nutritious options.' },
        { title: 'Host a game night', category: 'Lifestyle', description: 'Enjoy board or video games with friends.' },
        { title: 'Experiment with fashion styles', category: 'Lifestyle', description: 'Try outfits outside your usual comfort zone.' },
        { title: 'Take a solo day trip', category: 'Lifestyle', description: 'Spend a day exploring somewhere new alone.' },
        { title: 'Create a home spa', category: 'Lifestyle', description: 'Pamper yourself with a relaxing at-home spa setup.' },
        { title: 'Join a dance class', category: 'Lifestyle', description: 'Learn a new dance style while staying active.' },
        { title: 'Organize your finances', category: 'Lifestyle', description: 'Track expenses and budget for your goals.' },
        { title: 'Adopt a pet', category: 'Lifestyle', description: 'Bring home a furry friend for companionship.' },
        { title: 'Make a vision board', category: 'Lifestyle', description: 'Visualize your dreams and aspirations.' },
      ],
    
      spirituality: [
        { title: 'Practice daily meditation', category: 'Spirituality', description: 'Spend time in mindfulness or quiet reflection.' },
        { title: 'Read a spiritual book', category: 'Spirituality', description: 'Explore texts on philosophy, religion, or self-discovery.' },
        { title: 'Try breathwork exercises', category: 'Spirituality', description: 'Enhance mental clarity and calm through breathing techniques.' },
        { title: 'Attend a spiritual retreat', category: 'Spirituality', description: 'Spend time in a peaceful, focused environment.' },
        { title: 'Start a gratitude journal', category: 'Spirituality', description: 'Write down daily blessings and positive moments.' },
        { title: 'Practice yoga regularly', category: 'Spirituality', description: 'Combine physical movement with mental focus.' },
        { title: 'Learn about different religions', category: 'Spirituality', description: 'Gain knowledge and respect for various beliefs.' },
        { title: 'Spend time in nature', category: 'Spirituality', description: 'Reconnect with the earth through outdoor activities.' },
        { title: 'Volunteer for a cause', category: 'Spirituality', description: 'Serve others and experience fulfillment.' },
        { title: 'Practice daily affirmations', category: 'Spirituality', description: 'Reinforce positivity through spoken intentions.' },
        { title: 'Create a sacred space', category: 'Spirituality', description: 'Dedicate an area for reflection and prayer.' },
        { title: 'Attend a mindfulness workshop', category: 'Spirituality', description: 'Learn techniques to stay present and aware.' },
        { title: 'Practice compassion daily', category: 'Spirituality', description: 'Show kindness in small, consistent ways.' },
        { title: 'Listen to spiritual podcasts', category: 'Spirituality', description: 'Gain insights and inspiration from experts.' },
        { title: 'Explore crystal healing', category: 'Spirituality', description: 'Learn about the energies of different stones.' },
        { title: 'Try journaling after meditation', category: 'Spirituality', description: 'Record thoughts and clarity from sessions.' },
        { title: 'Read sacred texts', category: 'Spirituality', description: 'Study scriptures or writings from spiritual leaders.' },
        { title: 'Join a prayer group', category: 'Spirituality', description: 'Connect with others in shared faith practices.' },
        { title: 'Practice fasting', category: 'Spirituality', description: 'Experience discipline and mindfulness through fasting.' },
        { title: 'Attend a cultural festival', category: 'Spirituality', description: 'Celebrate traditions and rituals from around the world.' },
        { title: 'Engage in sound healing', category: 'Spirituality', description: 'Experience relaxation through sound therapy.' },
        { title: 'Create a vision mantra', category: 'Spirituality', description: 'Craft a personal statement to guide your path.' },
        { title: 'Practice forgiveness', category: 'Spirituality', description: 'Let go of grudges to find peace.' },
        { title: 'Spend a day in silence', category: 'Spirituality', description: 'Disconnect from noise to listen inwardly.' },
        { title: 'Write your spiritual journey', category: 'Spirituality', description: 'Document your path of growth and understanding.' },
      ],
    
      sports: [
        { title: 'Run a marathon', category: 'Sports', description: 'Train to complete a full or half marathon.' },
        { title: 'Join a local sports team', category: 'Sports', description: 'Play regularly with a community group.' },
        { title: 'Learn swimming', category: 'Sports', description: 'Build endurance and technique in the water.' },
        { title: 'Try rock climbing', category: 'Sports', description: 'Challenge your strength and agility on climbing walls.' },
        { title: 'Play tennis regularly', category: 'Sports', description: 'Improve skills through consistent practice.' },
        { title: 'Learn martial arts', category: 'Sports', description: 'Train in karate, judo, or another discipline.' },
        { title: 'Go hiking monthly', category: 'Sports', description: 'Explore trails and enjoy nature.' },
        { title: 'Learn golf', category: 'Sports', description: 'Develop skills for both leisure and competition.' },
        { title: 'Try surfing', category: 'Sports', description: 'Ride the waves and improve balance.' },
        { title: 'Play basketball weekly', category: 'Sports', description: 'Join games to stay fit and competitive.' },
        { title: 'Participate in a cycling event', category: 'Sports', description: 'Join a race or long-distance cycling challenge.' },
        { title: 'Take a fencing class', category: 'Sports', description: 'Learn the art of sword fighting.' },
        { title: 'Try archery', category: 'Sports', description: 'Improve focus and precision with a bow and arrow.' },
        { title: 'Go kayaking', category: 'Sports', description: 'Paddle through lakes, rivers, or oceans.' },
        { title: 'Learn skateboarding', category: 'Sports', description: 'Master tricks and balance on a board.' },
        { title: 'Play cricket in a local league', category: 'Sports', description: 'Compete in matches for fun or skill.' },
        { title: 'Try scuba diving', category: 'Sports', description: 'Explore underwater life and reefs.' },
        { title: 'Practice yoga for flexibility', category: 'Sports', description: 'Improve movement and prevent injuries.' },
        { title: 'Join a running club', category: 'Sports', description: 'Train and run with a supportive group.' },
        { title: 'Learn snowboarding', category: 'Sports', description: 'Hit the slopes and master the sport.' },
        { title: 'Do regular home workouts', category: 'Sports', description: 'Stay fit with bodyweight or minimal equipment.' },
        { title: 'Take a boxing class', category: 'Sports', description: 'Boost strength and endurance with boxing.' },
        { title: 'Participate in a triathlon', category: 'Sports', description: 'Compete in swimming, cycling, and running.' },
        { title: 'Play badminton weekly', category: 'Sports', description: 'Stay active with regular matches.' },
        { title: 'Learn parkour', category: 'Sports', description: 'Navigate obstacles with speed and efficiency.' },
      ],
      music: [
        { title: 'Learn to play guitar', category: 'Music', description: 'Master basic chords and a few songs within 3 months.', priority: 'medium' },
        { title: 'Write an original song', category: 'Music', description: 'Compose lyrics and melody for your own track.', priority: 'high' },
        { title: 'Join a local band', category: 'Music', description: 'Collaborate with other musicians to perform live.', priority: 'medium' },
        { title: 'Perform at an open mic', category: 'Music', description: 'Play in front of a small audience to build confidence.', priority: 'high' },
        { title: 'Learn music theory basics', category: 'Music', description: 'Understand scales, chords, and rhythm fundamentals.', priority: 'medium' },
        { title: 'Create a home recording setup', category: 'Music', description: 'Set up equipment to record songs at home.', priority: 'low' },
        { title: 'Learn a new instrument', category: 'Music', description: 'Pick up a new instrument like piano, violin, or drums.', priority: 'medium' },
        { title: 'Attend a music festival', category: 'Music', description: 'Experience live performances from multiple artists.', priority: 'low' },
        { title: 'Curate a personal playlist', category: 'Music', description: 'Create a playlist that reflects your mood and style.', priority: 'low' },
        { title: 'Understand music production', category: 'Music', description: 'Learn to use DAWs like Ableton or FL Studio.', priority: 'medium' },
        { title: 'Reach 100K streams on a track', category: 'Music', description: 'Promote and distribute your music online.', priority: 'high' },
        { title: 'Learn to DJ', category: 'Music', description: 'Understand beat matching and mixing basics.', priority: 'low' },
        { title: 'Transcribe a song by ear', category: 'Music', description: 'Write down the notes of a favorite song.', priority: 'medium' },
        { title: 'Take vocal training lessons', category: 'Music', description: 'Improve pitch, tone, and breathing technique.', priority: 'high' },
        { title: 'Record a cover song', category: 'Music', description: 'Reinterpret a favorite song in your style.', priority: 'low' },
        { title: 'Learn sight-reading', category: 'Music', description: 'Quickly read and play written music.', priority: 'medium' },
        { title: 'Collaborate with an artist online', category: 'Music', description: 'Make a track with someone remotely.', priority: 'low' },
        { title: 'Perform in a public space', category: 'Music', description: 'Busk in a park or street corner.', priority: 'low' },
        { title: 'Understand world music styles', category: 'Music', description: 'Explore genres like reggae, jazz, blues, and EDM.', priority: 'low' },
        { title: 'Write an EP', category: 'Music', description: 'Create a short collection of original music.', priority: 'high' },
        { title: 'Learn improvisation', category: 'Music', description: 'Play spontaneously without sheet music.', priority: 'medium' },
        { title: 'Digitally release your music', category: 'Music', description: 'Publish your work on platforms like Spotify.', priority: 'high' },
        { title: 'Build a personal brand as a musician', category: 'Music', description: 'Create a unique identity for your music career.', priority: 'medium' },
        { title: 'Understand audio mixing and mastering', category: 'Music', description: 'Learn final polishing techniques for music.', priority: 'medium' },
        { title: 'Organize a charity concert', category: 'Music', description: 'Host an event to raise funds for a cause.', priority: 'high' }
      ],
    
      art: [
        { title: 'Complete a daily sketch challenge', category: 'Art & Creativity', description: 'Draw something every day for 30 days.', priority: 'medium' },
        { title: 'Learn watercolor painting', category: 'Art & Creativity', description: 'Explore brush techniques and color blending.', priority: 'low' },
        { title: 'Create a digital illustration', category: 'Art & Creativity', description: 'Use tools like Procreate or Photoshop.', priority: 'medium' },
        { title: 'Host an art exhibition', category: 'Art & Creativity', description: 'Showcase your artwork to the public.', priority: 'high' },
        { title: 'Learn figure drawing', category: 'Art & Creativity', description: 'Understand human anatomy and proportions.', priority: 'medium' },
        { title: 'Paint a mural', category: 'Art & Creativity', description: 'Create a large-scale wall painting.', priority: 'high' },
        { title: 'Sell your artwork online', category: 'Art & Creativity', description: 'Open an Etsy shop or similar store.', priority: 'medium' },
        { title: 'Try clay sculpting', category: 'Art & Creativity', description: 'Learn hand-building and pottery basics.', priority: 'low' },
        { title: 'Create an art portfolio', category: 'Art & Creativity', description: 'Compile your best works for presentation.', priority: 'high' },
        { title: 'Join an art class', category: 'Art & Creativity', description: 'Learn from professionals and peers.', priority: 'low' },
        { title: 'Recreate a famous painting', category: 'Art & Creativity', description: 'Learn techniques from renowned artists.', priority: 'medium' },
        { title: 'Illustrate a children\'s book', category: 'Art & Creativity', description: 'Create visuals for a storybook.', priority: 'high' },
        { title: 'Experiment with abstract art', category: 'Art & Creativity', description: 'Play with shapes and colors without rules.', priority: 'low' },
        { title: 'Design your own comic strip', category: 'Art & Creativity', description: 'Create characters and tell a short story.', priority: 'medium' },
        { title: 'Join an art competition', category: 'Art & Creativity', description: 'Test your skills against others.', priority: 'medium' },
        { title: 'Learn calligraphy', category: 'Art & Creativity', description: 'Master decorative handwriting techniques.', priority: 'low' },
        { title: 'Make an art vlog', category: 'Art & Creativity', description: 'Share your creative process on social media.', priority: 'low' },
        { title: 'Try 3D modeling', category: 'Art & Creativity', description: 'Learn Blender or Maya basics.', priority: 'medium' },
        { title: 'Paint outdoors', category: 'Art & Creativity', description: 'Do plein-air painting in a scenic location.', priority: 'low' },
        { title: 'Collaborate on a community art project', category: 'Art & Creativity', description: 'Work with others on a public artwork.', priority: 'medium' },
        { title: 'Learn perspective drawing', category: 'Art & Creativity', description: 'Master one-point and two-point perspective.', priority: 'medium' },
        { title: 'Create a self-portrait', category: 'Art & Creativity', description: 'Capture your likeness through art.', priority: 'low' },
        { title: 'Experiment with mixed media', category: 'Art & Creativity', description: 'Combine paints, collage, and textures.', priority: 'medium' },
        { title: 'Build a following on Instagram for art', category: 'Art & Creativity', description: 'Post art consistently to gain visibility.', priority: 'medium' },
        { title: 'Teach an art workshop', category: 'Art & Creativity', description: 'Share your skills with aspiring artists.', priority: 'high' }
      ],
      reading: [
        { title: 'Read 20 books in a year', category: 'Reading', description: 'Set a reading target and track progress.', priority: 'high' },
        { title: 'Join a local book club', category: 'Reading', description: 'Discuss literature with like-minded people.', priority: 'medium' },
        { title: 'Read a classic novel', category: 'Reading', description: 'Explore timeless literary works.', priority: 'low' },
        { title: 'Explore different genres', category: 'Reading', description: 'Read books from at least 5 different genres.', priority: 'medium' },
        { title: 'Read for 30 minutes daily', category: 'Reading', description: 'Build a consistent reading habit.', priority: 'high' },
        { title: 'Write a book review', category: 'Reading', description: 'Summarize and share your thoughts.', priority: 'low' },
        { title: 'Listen to audiobooks', category: 'Reading', description: 'Enjoy stories while multitasking.', priority: 'low' },
        { title: 'Follow a famous author\'s works', category: 'Reading', description: 'Read all major works by one author.', priority: 'medium' },
        { title: 'Organize a home library', category: 'Reading', description: 'Arrange and maintain your book collection.', priority: 'low' },
        { title: 'Read a book in a foreign language', category: 'Reading', description: 'Improve language skills through literature.', priority: 'medium' },
        { title: 'Attend a book signing event', category: 'Reading', description: 'Meet your favorite authors in person.', priority: 'low' },
        { title: 'Re-read your favorite childhood book', category: 'Reading', description: 'Relive nostalgic moments.', priority: 'low' },
        { title: 'Read 10 non-fiction books', category: 'Reading', description: 'Gain knowledge on various topics.', priority: 'medium' },
        { title: 'Start a reading journal', category: 'Reading', description: 'Note key takeaways from each book.', priority: 'low' },
        { title: 'Gift a book to a friend', category: 'Reading', description: 'Share your love of reading.', priority: 'low' },
        { title: 'Read a poetry collection', category: 'Reading', description: 'Appreciate rhythm and verse.', priority: 'low' },
        { title: 'Participate in a reading challenge', category: 'Reading', description: 'Push yourself to meet a target.', priority: 'medium' },
        { title: 'Read a self-improvement book', category: 'Reading', description: 'Apply lessons to your life.', priority: 'high' },
        { title: 'Read under the stars', category: 'Reading', description: 'Create a magical reading experience.', priority: 'low' },
        { title: 'Share book recommendations online', category: 'Reading', description: 'Help others discover great reads.', priority: 'low' },
        { title: 'Read a banned or controversial book', category: 'Reading', description: 'Understand diverse perspectives.', priority: 'medium' },
        { title: 'Read a biography', category: 'Reading', description: 'Learn from the lives of influential people.', priority: 'medium' },
        { title: 'Read a book in one sitting', category: 'Reading', description: 'Challenge your focus and stamina.', priority: 'medium' },
        { title: 'Attend a literary festival', category: 'Reading', description: 'Immerse yourself in book culture.', priority: 'low' },
        { title: 'Write your own short story', category: 'Reading', description: 'Experiment with storytelling.', priority: 'high' }
      ],
    
      cooking: [
        { title: 'Master 10 new recipes', category: 'Cooking', description: 'Expand your cooking skills.', priority: 'high' },
        { title: 'Bake your own bread', category: 'Cooking', description: 'Learn bread-making from scratch.', priority: 'medium' },
        { title: 'Host a dinner party', category: 'Cooking', description: 'Cook for family and friends.', priority: 'high' },
        { title: 'Learn to cook international dishes', category: 'Cooking', description: 'Explore cuisines from around the world.', priority: 'medium' },
        { title: 'Perfect your knife skills', category: 'Cooking', description: 'Chop, dice, and slice like a pro.', priority: 'medium' },
        { title: 'Make homemade pasta', category: 'Cooking', description: 'Create fresh pasta from scratch.', priority: 'low' },
        { title: 'Create a signature dish', category: 'Cooking', description: 'Be known for one special recipe.', priority: 'medium' },
        { title: 'Cook a 3-course meal', category: 'Cooking', description: 'Plan and execute a complete menu.', priority: 'high' },
        { title: 'Experiment with plant-based meals', category: 'Cooking', description: 'Cook vegetarian or vegan dishes.', priority: 'medium' },
        { title: 'Learn food plating techniques', category: 'Cooking', description: 'Present dishes beautifully.', priority: 'low' },
        { title: 'Make your own sauces', category: 'Cooking', description: 'Master base sauces like béchamel.', priority: 'medium' },
        { title: 'Ferment your own food', category: 'Cooking', description: 'Make kimchi, kombucha, or pickles.', priority: 'low' },
        { title: 'Cook with seasonal produce', category: 'Cooking', description: 'Use fresh, in-season ingredients.', priority: 'medium' },
        { title: 'Create a weekly meal plan', category: 'Cooking', description: 'Organize and prepare in advance.', priority: 'low' },
        { title: 'Bake a layered cake', category: 'Cooking', description: 'Practice cake decoration.', priority: 'medium' },
        { title: 'Cook over a campfire', category: 'Cooking', description: 'Learn outdoor cooking techniques.', priority: 'low' },
        { title: 'Try molecular gastronomy', category: 'Cooking', description: 'Experiment with modernist cuisine.', priority: 'low' },
        { title: 'Make homemade ice cream', category: 'Cooking', description: 'Try unique flavors and textures.', priority: 'medium' },
        { title: 'Recreate a dish from a restaurant', category: 'Cooking', description: 'Reverse engineer your favorite meal.', priority: 'medium' },
        { title: 'Take a cooking class', category: 'Cooking', description: 'Learn from professional chefs.', priority: 'high' },
        { title: 'Prepare food for charity', category: 'Cooking', description: 'Cook for community events.', priority: 'low' },
        { title: 'Grow your own herbs', category: 'Cooking', description: 'Use homegrown herbs in cooking.', priority: 'low' },
        { title: 'Make sushi at home', category: 'Cooking', description: 'Learn rolling and cutting techniques.', priority: 'medium' },
        { title: 'Cook a recipe from a famous chef', category: 'Cooking', description: 'Test your skills with expert recipes.', priority: 'medium' },
        { title: 'Document your recipes', category: 'Cooking', description: 'Create your own recipe book.', priority: 'medium' }
      ],
    
      gaming: [
        { title: 'Complete a 100% run of a game', category: 'Gaming', description: 'Unlock all achievements or trophies.', priority: 'medium' },
        { title: 'Participate in an online gaming tournament', category: 'Gaming', description: 'Test your skills against others.', priority: 'high' },
        { title: 'Build your own gaming PC', category: 'Gaming', description: 'Assemble a custom setup.', priority: 'medium' },
        { title: 'Stream games online', category: 'Gaming', description: 'Share your gameplay on Twitch or YouTube.', priority: 'low' },
        { title: 'Join an esports team', category: 'Gaming', description: 'Compete professionally in your favorite game.', priority: 'high' },
        { title: 'Finish a classic retro game', category: 'Gaming', description: 'Explore gaming history.', priority: 'low' },
        { title: 'Host a LAN party', category: 'Gaming', description: 'Invite friends for in-person gaming.', priority: 'low' },
        { title: 'Learn game development', category: 'Gaming', description: 'Create a basic game from scratch.', priority: 'medium' },
        { title: 'Set a personal speedrun record', category: 'Gaming', description: 'Beat a game as fast as possible.', priority: 'medium' },
        { title: 'Explore VR gaming', category: 'Gaming', description: 'Experience immersive virtual reality worlds.', priority: 'medium' },
        { title: 'Play a new genre', category: 'Gaming', description: 'Try something different from your usual style.', priority: 'low' },
        { title: 'Collect gaming merchandise', category: 'Gaming', description: 'Build a collection of themed items.', priority: 'low' },
        { title: 'Create a YouTube gaming series', category: 'Gaming', description: 'Upload regular episodes of gameplay.', priority: 'medium' },
        { title: 'Participate in a game jam', category: 'Gaming', description: 'Collaborate to create a game in limited time.', priority: 'high' },
        { title: 'Master a competitive game', category: 'Gaming', description: 'Reach top ranks in online play.', priority: 'high' },
        { title: 'Try mobile gaming marathons', category: 'Gaming', description: 'Play for extended hours on mobile.', priority: 'low' },
        { title: 'Replay a childhood favorite game', category: 'Gaming', description: 'Enjoy nostalgia with old classics.', priority: 'low' },
        { title: 'Test gaming accessories', category: 'Gaming', description: 'Try new controllers, VR headsets, etc.', priority: 'medium' },
        { title: 'Build a gaming community', category: 'Gaming', description: 'Engage with like-minded gamers.', priority: 'medium' },
        { title: 'Play a cooperative story game', category: 'Gaming', description: 'Experience teamwork in gaming.', priority: 'low' },
        { title: 'Review games online', category: 'Gaming', description: 'Share opinions and feedback.', priority: 'low' },
        { title: 'Attend a gaming convention', category: 'Gaming', description: 'Explore new tech and games.', priority: 'medium' },
        { title: 'Cosplay a game character', category: 'Gaming', description: 'Bring your favorite character to life.', priority: 'low' },
        { title: 'Finish a game in hardcore mode', category: 'Gaming', description: 'Complete high difficulty settings.', priority: 'high' },
        { title: 'Create gaming fan art', category: 'Gaming', description: 'Express your passion creatively.', priority: 'low' }
      ],
      nature: [
        { title: 'Plant 10 new trees', category: 'Nature', description: 'Contribute to reforestation by planting native trees in your community.', priority: 'high' },
        { title: 'Start a home garden', category: 'Nature', description: 'Grow your own vegetables, herbs, or flowers at home.', priority: 'medium' },
        { title: 'Visit 5 national parks', category: 'Nature', description: 'Explore natural beauty by visiting and appreciating 5 different national parks.', priority: 'medium' },
        { title: 'Go on monthly hikes', category: 'Nature', description: 'Stay connected to nature by hiking at least once a month.', priority: 'low' },
        { title: 'Build a birdhouse', category: 'Nature', description: 'Create a bird-friendly space in your backyard or balcony.', priority: 'low' },
        { title: 'Organize a beach clean-up', category: 'Nature', description: 'Help preserve marine life by cleaning up trash at the shore.', priority: 'high' },
        { title: 'Learn about native plants', category: 'Nature', description: 'Study and identify the plants native to your local area.', priority: 'medium' },
        { title: 'Go camping in the wild', category: 'Nature', description: 'Experience nature fully by camping under the stars.', priority: 'low' },
        { title: 'Build a compost bin', category: 'Nature', description: 'Recycle food waste into compost for a healthier environment.', priority: 'medium' },
        { title: 'Support a wildlife sanctuary', category: 'Nature', description: 'Donate time or resources to protect endangered species.', priority: 'high' },
        { title: 'Start rainwater harvesting', category: 'Nature', description: 'Set up a rainwater collection system to conserve water.', priority: 'high' },
        { title: 'Document nature photography', category: 'Nature', description: 'Capture the beauty of nature through photography.', priority: 'low' },
        { title: 'Volunteer at a botanical garden', category: 'Nature', description: 'Help maintain gardens and educate visitors.', priority: 'medium' },
        { title: 'Reduce single-use plastics', category: 'Nature', description: 'Commit to minimizing plastic waste in daily life.', priority: 'high' },
        { title: 'Join a local nature club', category: 'Nature', description: 'Meet like-minded people and explore nature together.', priority: 'low' },
        { title: 'Create a pollinator garden', category: 'Nature', description: 'Grow plants that attract bees, butterflies, and birds.', priority: 'medium' },
        { title: 'Track local wildlife', category: 'Nature', description: 'Observe and log wildlife sightings in your area.', priority: 'low' },
        { title: 'Learn foraging basics', category: 'Nature', description: 'Understand which wild plants are safe to eat and use.', priority: 'medium' },
        { title: 'Participate in Earth Day events', category: 'Nature', description: 'Join activities that promote environmental protection.', priority: 'high' },
        { title: 'Switch to eco-friendly products', category: 'Nature', description: 'Replace harmful products with sustainable alternatives.', priority: 'high' }
      ],
      volunteering: [
        { title: 'Volunteer at a local shelter', category: 'Volunteering', description: 'Assist in caring for homeless people or animals.', priority: 'high' },
        { title: 'Teach underprivileged kids', category: 'Volunteering', description: 'Share your knowledge by teaching children in need.', priority: 'high' },
        { title: 'Organize a food drive', category: 'Volunteering', description: 'Collect and distribute food to those in need.', priority: 'high' },
        { title: 'Help in disaster relief', category: 'Volunteering', description: 'Assist communities affected by natural disasters.', priority: 'high' },
        { title: 'Join a blood donation camp', category: 'Volunteering', description: 'Donate blood to save lives.', priority: 'high' },
        { title: 'Mentor someone in your field', category: 'Volunteering', description: 'Guide and support someone starting in your profession.', priority: 'medium' },
        { title: 'Volunteer at a senior center', category: 'Volunteering', description: 'Spend time with and assist elderly individuals.', priority: 'medium' },
        { title: 'Clean up a public park', category: 'Volunteering', description: 'Help keep community parks clean and safe.', priority: 'medium' },
        { title: 'Support a local charity', category: 'Volunteering', description: 'Contribute your time or skills to a charitable cause.', priority: 'medium' },
        { title: 'Deliver meals to the needy', category: 'Volunteering', description: 'Participate in programs that bring food to those who cannot leave their homes.', priority: 'high' },
        { title: 'Volunteer at a hospital', category: 'Volunteering', description: 'Assist patients and staff in non-medical ways.', priority: 'medium' },
        { title: 'Organize a clothes donation drive', category: 'Volunteering', description: 'Collect clothes and give them to people in need.', priority: 'high' },
        { title: 'Participate in animal rescue', category: 'Volunteering', description: 'Help save and care for injured or stray animals.', priority: 'high' },
        { title: 'Assist in community events', category: 'Volunteering', description: 'Help organize and run local cultural or social events.', priority: 'low' },
        { title: 'Raise funds for a cause', category: 'Volunteering', description: 'Organize fundraising activities for important causes.', priority: 'high' },
        { title: 'Volunteer in environmental projects', category: 'Volunteering', description: 'Participate in tree planting, clean-ups, and other green initiatives.', priority: 'high' },
        { title: 'Help at a library', category: 'Volunteering', description: 'Assist in organizing and running local libraries.', priority: 'low' },
        { title: 'Offer pro bono professional services', category: 'Volunteering', description: 'Provide your skills for free to help communities.', priority: 'medium' },
        { title: 'Participate in global volunteering programs', category: 'Volunteering', description: 'Travel to help communities around the world.', priority: 'high' },
        { title: 'Create care packages', category: 'Volunteering', description: 'Prepare and distribute essential supplies to those in need.', priority: 'high' }
      ]
  };
  

const ALL_CATEGORIES = Object.keys(INTEREST_TO_GOALS)

function shuffleArray(source) {
  const arr = [...source]
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

function uniqueByTitle(items) {
  const seen = new Set()
  return items.filter((it) => {
    const key = it.title.trim().toLowerCase()
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function pickMixedSuggestions(interests, size = 6) {
  const normalized = Array.isArray(interests) ? interests.filter(Boolean) : []
  let chosenCategories = normalized.filter((c) => ALL_CATEGORIES.includes(c))

  // Ensure at least 3 categories; if none provided, pick 3 random
  if (chosenCategories.length < 3) {
    const remainingForMin = ALL_CATEGORIES.filter((c) => !chosenCategories.includes(c))
    const needed = Math.min(3 - chosenCategories.length, remainingForMin.length)
    chosenCategories = [...chosenCategories, ...shuffleArray(remainingForMin).slice(0, needed)]
  }

  // Always add 1–2 random categories for exploration (even if user has many interests)
  const remaining = ALL_CATEGORIES.filter((c) => !chosenCategories.includes(c))
  const extraCount = Math.min(remaining.length, Math.floor(Math.random() * 2) + 1) // 1 or 2
  if (extraCount > 0) {
    chosenCategories = [...chosenCategories, ...shuffleArray(remaining).slice(0, extraCount)]
  }

  // Build a round-robin pool across chosen categories to maintain variety
  const categoryPools = chosenCategories.map((cat) => shuffleArray(INTEREST_TO_GOALS[cat] || []))

  const picked = []
  let index = 0
  while (picked.length < size && categoryPools.some((pool) => pool.length > 0)) {
    const pool = categoryPools[index % categoryPools.length]
    if (pool.length > 0) {
      const item = pool.shift()
      picked.push(item)
    }
    index++
  }

  // If still not enough, pull from remaining categories
  if (picked.length < size) {
    const remainingCategories = ALL_CATEGORIES.filter((c) => !chosenCategories.includes(c))
    const remainingPool = shuffleArray(remainingCategories.flatMap((c) => INTEREST_TO_GOALS[c] || []))
    picked.push(...remainingPool)
  }

  // Finalize: unique by title, shuffled, exact size
  return shuffleArray(uniqueByTitle(picked)).slice(0, size)
}

// variant: 'empty' | 'inline'
// - empty: used when user has no active goals; shows suggestions by default
// - inline: used when user has goals; collapsed by default with CTA to expand
const GoalSuggestions = ({ interests = [], onSelect, variant = 'inline', limit = 6, forceExpanded = false, showHeader = true, titleOverride, containerClassName = 'mt-10', innerContainerClassName = 'max-w-5xl mx-auto' }) => {
  const [expanded, setExpanded] = useState(forceExpanded || variant === 'empty')
  const [suggestions, setSuggestions] = useState([])

  const regenerate = () => {
    setSuggestions(pickMixedSuggestions(interests, limit))
  }

  useEffect(() => {
    regenerate()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [JSON.stringify(interests), limit])

  if (!forceExpanded && variant === 'inline' && !expanded) {
    return (
      <div id="suggested-goals" className={containerClassName}>
        <div className="glass-card-hover border border-gray-200 dark:border-gray-700 rounded-2xl p-6 flex items-center justify-between">
          <div className="flex items-start space-x-3">
            <div className="bg-primary-500/10 text-primary-600 dark:text-primary-400 rounded-full p-2 mt-1">
              <Lightbulb className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <Sparkles className="h-4 w-4 text-primary-500" />
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white">Discover goal ideas</h4>
              </div>
              <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">
                Get mixed suggestions {interests?.length ? 'in your favorite areas' : 'across popular categories'} to kickstart your progress.
              </p>
            </div>
          </div>
          <button onClick={() => setExpanded(true)} className="btn-primary px-4 py-2 text-sm">Explore Suggestions</button>
        </div>
      </div>
    )
  }

  return (
    <div id="suggested-goals" className={containerClassName}>
      <div className={innerContainerClassName}>
      {showHeader && (
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center">
            <Sparkles className="h-5 w-5 text-primary-500 mr-2" />
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
              {titleOverride || (variant === 'empty' ? 'Suggested Goals to Get You Started' : 'Goal Suggestions')}
            </h3>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={regenerate} className="text-sm text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 inline-flex items-center gap-1">
              <RefreshCw className="h-4 w-4" /> Shuffle
            </button>
            {!forceExpanded && variant === 'inline' && (
              <button onClick={() => setExpanded(false)} className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200">
                Hide
              </button>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2 gap-4">
        <AnimatePresence initial={false}>
          {suggestions.map((g, idx) => (
            <motion.div
              key={`${g.title}-${idx}`}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25, delay: Math.min(idx * 0.04, 0.25) }}
              className="glass-card-hover p-4 rounded-xl border border-gray-200 dark:border-gray-700"
            >
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-1 flex items-center">
                <Tag className="h-3 w-3 mr-1" /> {g.category}
              </div>
              <div className="font-semibold text-gray-900 dark:text-white">{g.title}</div>
              <div className="text-sm text-gray-600 dark:text-gray-400 mt-1 line-clamp-2">{g.description}</div>
              <div className="mt-3">
                <button onClick={() => onSelect?.(g)} className="btn-primary text-sm px-3 py-1">Use this goal</button>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {variant === 'empty' && (
        <div className="mt-6 text-sm text-gray-600 dark:text-gray-400">
          Not sure where to start? Pick any idea and customize it. You can always edit or add more goals later.
        </div>
      )}
    </div>
  </div>
  )
}

export default GoalSuggestions
