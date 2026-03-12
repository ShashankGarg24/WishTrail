import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Sparkles, Lightbulb, RefreshCw } from 'lucide-react'
import { getCategoryIcon } from '../utils/categoryIcons'

const THEME_COLOR = '#4c99e6'

const INTEREST_TO_GOALS = {
    fitness: [
      { title: 'Run 5 km without stopping', category: 'HEALTH_FITNESS', description: 'Build endurance with a consistent running plan 3x per week.' },
      { title: 'Complete 30-day home workout', category: 'HEALTH_FITNESS', description: 'Follow a guided 30-day strength and mobility challenge.' },
      { title: 'Join a local fitness class', category: 'HEALTH_FITNESS', description: 'Try yoga, pilates or HIIT 2x a week for a month.' },
      { title: 'Do 50 push-ups in one go', category: 'HEALTH_FITNESS', description: 'Gradually increase daily reps to hit 50 without stopping.' },
      { title: 'Reach 10,000 steps daily for a month', category: 'HEALTH_FITNESS', description: 'Use a step tracker to monitor and maintain activity.' },
      { title: 'Master 10 yoga poses', category: 'HEALTH_FITNESS', description: 'Learn and practice foundational yoga poses.' },
      { title: 'Reduce body fat by 5%', category: 'HEALTH_FITNESS', description: 'Track nutrition and training to achieve healthy fat loss.' },
      { title: 'Hold a 3-minute plank', category: 'HEALTH_FITNESS', description: 'Increase core strength with daily plank practice.' },
      { title: 'Participate in a charity run', category: 'HEALTH_FITNESS', description: 'Sign up for a 5K or 10K event to support a cause.' },
      { title: 'Cycle 50 km in a single ride', category: 'HEALTH_FITNESS', description: 'Train weekly to improve cycling distance and stamina.' },
      { title: 'Improve mile time by 30 seconds', category: 'HEALTH_FITNESS', description: 'Use interval training to boost running speed.' },
      { title: 'Do a pull-up', category: 'HEALTH_FITNESS', description: 'Train upper body strength to complete at least one strict pull-up.' },
      { title: 'Swim 1 km non-stop', category: 'HEALTH_FITNESS', description: 'Increase stamina in the pool with gradual distance builds.' },
      { title: 'Hike a challenging trail', category: 'HEALTH_FITNESS', description: 'Prepare for and complete a day-long hike.' },
      { title: 'Maintain a workout streak for 60 days', category: 'HEALTH_FITNESS', description: 'Exercise daily without missing a single day.' },
      { title: 'Reach target BMI', category: 'HEALTH_FITNESS', description: 'Combine healthy eating and exercise to achieve a healthy weight.' },
      { title: 'Master handstand for 30 seconds', category: 'HEALTH_FITNESS', description: 'Practice balance and strength daily to hold a handstand.' },
      { title: 'Join a recreational sports league', category: 'HEALTH_FITNESS', description: 'Play team sports like football, basketball or badminton weekly.' },
      { title: 'Track macros for 30 days', category: 'HEALTH_FITNESS', description: 'Log meals to understand nutritional balance.' },
      { title: 'Do 100 squats daily for 30 days', category: 'HEALTH_FITNESS', description: 'Boost lower body strength with a daily squat challenge.' },
      { title: 'Learn proper deadlift form', category: 'HEALTH_FITNESS', description: 'Master technique to lift safely and efficiently.' },
      { title: 'Stretch daily for a month', category: 'HEALTH_FITNESS', description: 'Improve flexibility with consistent stretching.' },
      { title: 'Row 5 km on a rowing machine', category: 'HEALTH_FITNESS', description: 'Build stamina and strength using rowing workouts.' },
      { title: 'Complete a fitness bootcamp', category: 'HEALTH_FITNESS', description: 'Join an intensive 1-week or 2-week program.' },
      { title: 'Hit a personal record in weightlifting', category: 'HEALTH_FITNESS', description: 'Track and improve your strength training performance.' },
    ],
  
    health: [
      { title: 'Sleep 8 hours daily for 14 days', category: 'HEALTH_FITNESS', description: 'Improve sleep quality by maintaining a consistent routine.' },
      { title: 'Drink 2L of water daily for 21 days', category: 'HEALTH_FITNESS', description: 'Stay hydrated and track your daily water intake.' },
      { title: 'Reduce sugar intake for a month', category: 'HEALTH_FITNESS', description: 'Avoid added sugars and sugary drinks.' },
      { title: 'Eat 5 servings of fruits and veggies daily', category: 'HEALTH_FITNESS', description: 'Incorporate more plant-based nutrients in meals.' },
      { title: 'Walk after every meal', category: 'HEALTH_FITNESS', description: 'Boost digestion and regulate blood sugar.' },
      { title: 'Schedule a full health check-up', category: 'HEALTH_FITNESS', description: 'Stay proactive about your health with yearly screenings.' },
      { title: 'Limit caffeine to 1 cup daily', category: 'HEALTH_FITNESS', description: 'Reduce dependency and improve sleep quality.' },
      { title: 'Practice 10 minutes of deep breathing daily', category: 'HEALTH_FITNESS', description: 'Reduce stress and improve lung capacity.' },
      { title: 'Maintain healthy cholesterol levels', category: 'HEALTH_FITNESS', description: 'Adopt a heart-friendly diet and regular exercise.' },
      { title: 'Cut out processed food for 30 days', category: 'HEALTH_FITNESS', description: 'Eat whole, unprocessed meals to improve gut health.' },
      { title: 'Track daily mood for a month', category: 'HEALTH_FITNESS', description: 'Identify patterns and triggers for better mental health.' },
      { title: 'Get 20 minutes of sunlight daily', category: 'HEALTH_FITNESS', description: 'Boost vitamin D and regulate circadian rhythm.' },
      { title: 'Limit screen time to 2 hours after work', category: 'HEALTH_FITNESS', description: 'Reduce digital eye strain and improve focus.' },
      { title: 'Avoid alcohol for 30 days', category: 'HEALTH_FITNESS', description: 'Improve liver health and overall wellness.' },
      { title: 'Maintain a healthy weight', category: 'HEALTH_FITNESS', description: 'Stay within a recommended weight range for your height.' },
      { title: 'Do a daily 5-minute stretching routine', category: 'HEALTH_FITNESS', description: 'Relieve muscle stiffness and improve flexibility.' },
      { title: 'Limit salt intake for 30 days', category: 'HEALTH_FITNESS', description: 'Reduce sodium consumption for better heart health.' },
      { title: 'Maintain normal blood pressure', category: 'HEALTH_FITNESS', description: 'Monitor and manage healthy blood pressure levels.' },
      { title: 'Have a consistent meal schedule', category: 'HEALTH_FITNESS', description: 'Eat meals at the same time daily for better digestion.' },
      { title: 'Practice gratitude journaling', category: 'HEALTH_FITNESS', description: 'Boost mental well-being through daily reflections.' },
      { title: 'Limit fried food for a month', category: 'HEALTH_FITNESS', description: 'Opt for grilled or steamed alternatives.' },
      { title: 'Improve posture in 30 days', category: 'HEALTH_FITNESS', description: 'Incorporate posture exercises and ergonomic setups.' },
      { title: 'Take a daily multivitamin', category: 'HEALTH_FITNESS', description: 'Fill nutritional gaps with supplements.' },
      { title: 'Cook healthy meals at home', category: 'HEALTH_FITNESS', description: 'Prepare home-cooked meals to control ingredients.' },
      { title: 'Get 1,000 minutes of exercise this month', category: 'HEALTH_FITNESS', description: 'Track and accumulate activity over a month.' },
    ],
  
    travel: [
        { title: 'Plan a weekend getaway', category: 'TRAVEL_EXPERIENCES', description: 'Pick a nearby destination and plan a budget-friendly trip.' },
        { title: 'Create a 6-month travel savings plan', category: 'TRAVEL_EXPERIENCES', description: 'Set a monthly saving target to fund your next trip.' },
        { title: 'Visit a UNESCO heritage site', category: 'TRAVEL_EXPERIENCES', description: 'Explore a culturally significant location.' },
        { title: 'Take a solo trip', category: 'TRAVEL_EXPERIENCES', description: 'Plan and execute a solo travel adventure.' },
        { title: 'Go on a camping trip', category: 'TRAVEL_EXPERIENCES', description: 'Experience the outdoors with overnight camping.' },
        { title: 'Travel to a new country', category: 'TRAVEL_EXPERIENCES', description: 'Explore a completely new culture and destination.' },
        { title: 'Book a last-minute trip', category: 'TRAVEL_EXPERIENCES', description: 'Embrace spontaneity and travel on short notice.' },
        { title: 'Plan a cross-country road trip', category: 'TRAVEL_EXPERIENCES', description: 'Drive through multiple cities or states.' },
        { title: 'Stay in a unique Airbnb', category: 'TRAVEL_EXPERIENCES', description: 'Book an unusual stay like a treehouse or houseboat.' },
        { title: 'Attend a cultural festival abroad', category: 'TRAVEL_EXPERIENCES', description: 'Immerse yourself in another country\'s celebrations.' },
        { title: 'Take a train journey through scenic routes', category: 'TRAVEL_EXPERIENCES', description: 'Enjoy landscapes from a train window.' },
        { title: 'Plan a hiking expedition', category: 'TRAVEL_EXPERIENCES', description: 'Research and complete a multi-day hike.' },
        { title: 'Travel to a coastal city', category: 'TRAVEL_EXPERIENCES', description: 'Spend a weekend exploring beaches and seafood spots.' },
        { title: 'Collect souvenirs from 5 countries', category: 'TRAVEL_EXPERIENCES', description: 'Create a small keepsake collection.' },
        { title: 'Book a luxury hotel stay', category: 'TRAVEL_EXPERIENCES', description: 'Experience a high-end hotel for a night or weekend.' },
        { title: 'Go on a cruise', category: 'TRAVEL_EXPERIENCES', description: 'Spend several days at sea visiting different ports.' },
        { title: 'Try a food tour in a new city', category: 'TRAVEL_EXPERIENCES', description: 'Sample local cuisine through guided tours.' },
        { title: 'Visit a national park', category: 'TRAVEL_EXPERIENCES', description: 'Explore natural beauty and wildlife.' },
        { title: 'Travel with friends to a new place', category: 'TRAVEL_EXPERIENCES', description: 'Plan a group trip to create shared memories.' },
        { title: 'Learn basic phrases in the local language', category: 'TRAVEL_EXPERIENCES', description: 'Enhance your travel experience by speaking locally.' },
        { title: 'Go backpacking for a week', category: 'TRAVEL_EXPERIENCES', description: 'Travel light and explore multiple spots.' },
        { title: 'Visit a mountain village', category: 'TRAVEL_EXPERIENCES', description: 'Stay in a remote and scenic location.' },
        { title: 'Document a trip through vlogs', category: 'TRAVEL_EXPERIENCES', description: 'Record and edit a travel video series.' },
        { title: 'Visit all states in your country', category: 'TRAVEL_EXPERIENCES', description: 'Make a checklist and track progress.' },
        { title: 'Plan a surprise trip for someone', category: 'TRAVEL_EXPERIENCES', description: 'Organize a hidden itinerary for a loved one.' },
      ],
    
      education: [
        { title: 'Complete an online course', category: 'EDUCATION_LEARNING', description: 'Pick a topic of interest and finish a course in 30 days.' },
        { title: 'Read 12 books this year', category: 'EDUCATION_LEARNING', description: 'Set a monthly reading target and track progress.' },
        { title: 'Learn a new language to conversational level', category: 'EDUCATION_LEARNING', description: 'Study consistently to hold conversations.' },
        { title: 'Earn a professional certification', category: 'EDUCATION_LEARNING', description: 'Get certified in a relevant industry skill.' },
        { title: 'Attend a workshop or seminar', category: 'EDUCATION_LEARNING', description: 'Gain practical knowledge from experts.' },
        { title: 'Write a research paper', category: 'EDUCATION_LEARNING', description: 'Publish or submit work to a journal.' },
        { title: 'Watch 10 educational documentaries', category: 'EDUCATION_LEARNING', description: 'Learn visually through in-depth documentaries.' },
        { title: 'Complete a coding bootcamp', category: 'EDUCATION_LEARNING', description: 'Gain hands-on tech skills in weeks.' },
        { title: 'Join a study group', category: 'EDUCATION_LEARNING', description: 'Collaborate with peers to enhance learning.' },
        { title: 'Learn basic sign language', category: 'EDUCATION_LEARNING', description: 'Communicate inclusively with hearing-impaired individuals.' },
        { title: 'Read 5 biographies', category: 'EDUCATION_LEARNING', description: 'Learn from the life stories of inspiring people.' },
        { title: 'Learn public speaking skills', category: 'EDUCATION_LEARNING', description: 'Join a club like Toastmasters.' },
        { title: 'Master Microsoft Excel', category: 'EDUCATION_LEARNING', description: 'Learn advanced formulas and pivot tables.' },
        { title: 'Write a blog on a learned topic', category: 'EDUCATION_LEARNING', description: 'Share insights and teach others.' },
        { title: 'Take a short course in personal finance', category: 'EDUCATION_LEARNING', description: 'Understand budgeting and investments.' },
        { title: 'Read academic journals weekly for a month', category: 'EDUCATION_LEARNING', description: 'Stay updated with latest research.' },
        { title: 'Learn how to speed read', category: 'EDUCATION_LEARNING', description: 'Improve reading efficiency.' },
        { title: 'Complete a daily learning challenge', category: 'EDUCATION_LEARNING', description: 'Dedicate 15 minutes to learning each day.' },
        { title: 'Create a personal learning plan', category: 'EDUCATION_LEARNING', description: 'Outline goals and resources for self-study.' },
        { title: 'Take an art history course', category: 'EDUCATION_LEARNING', description: 'Understand the evolution of art styles.' },
        { title: 'Master a musical instrument', category: 'EDUCATION_LEARNING', description: 'Practice regularly to play fluently.' },
        { title: 'Complete a beginner\'s psychology course', category: 'EDUCATION_LEARNING', description: 'Learn the basics of human behavior.' },
        { title: 'Attend a free online university lecture', category: 'EDUCATION_LEARNING', description: 'Access open courses from top institutions.' },
        { title: 'Improve academic writing skills', category: 'EDUCATION_LEARNING', description: 'Learn structure, clarity, and citations.' },
        { title: 'Memorize 100 new vocabulary words', category: 'EDUCATION_LEARNING', description: 'Enhance language skills through daily learning.' },
      ],
    
      career: [
        { title: 'Update resume and LinkedIn', category: 'CAREER_WORK', description: 'Refresh your profile and showcase recent achievements.' },
        { title: 'Apply to 10 relevant roles', category: 'CAREER_WORK', description: 'Shortlist roles and submit tailored applications.' },
        { title: 'Attend an industry networking event', category: 'CAREER_WORK', description: 'Meet professionals and expand your network.' },
        { title: 'Negotiate a salary raise', category: 'CAREER_WORK', description: 'Prepare data and confidently request a raise.' },
        { title: 'Start a side hustle', category: 'CAREER_WORK', description: 'Build additional income through a personal project.' },
        { title: 'Find a career mentor', category: 'CAREER_WORK', description: 'Seek guidance from an experienced professional.' },
        { title: 'Complete a leadership course', category: 'CAREER_WORK', description: 'Improve management and team-leading skills.' },
        { title: 'Improve presentation skills', category: 'CAREER_WORK', description: 'Take a workshop to enhance public speaking.' },
        { title: 'Get a promotion', category: 'CAREER_WORK', description: 'Work strategically to advance your role.' },
        { title: 'Build a personal brand website', category: 'CAREER_WORK', description: 'Showcase your expertise and portfolio.' },
        { title: 'Publish an industry-related article', category: 'CAREER_WORK', description: 'Share insights and grow professional credibility.' },
        { title: 'Join a professional association', category: 'CAREER_WORK', description: 'Access resources and networking opportunities.' },
        { title: 'Learn a new job-relevant skill', category: 'CAREER_WORK', description: 'Take a course to improve your qualifications.' },
        { title: 'Shadow a colleague in another department', category: 'CAREER_WORK', description: 'Gain insight into other roles.' },
        { title: 'Launch a work-related project', category: 'CAREER_WORK', description: 'Propose and implement a new initiative.' },
        { title: 'Improve time management skills', category: 'CAREER_WORK', description: 'Use tools and methods to be more productive.' },
        { title: 'Attend an international conference', category: 'CAREER_WORK', description: 'Learn and connect with global peers.' },
        { title: 'Obtain a higher academic degree', category: 'CAREER_WORK', description: 'Pursue a master\'s or doctorate program.' },
        { title: 'Contribute to an open-source project', category: 'CAREER_WORK', description: 'Showcase skills through public collaboration.' },
        { title: 'Lead a team project', category: 'CAREER_WORK', description: 'Take charge of a major work deliverable.' },
        { title: 'Improve work-life balance', category: 'CAREER_WORK', description: 'Set boundaries for personal and professional life.' },
        { title: 'Write a professional e-book', category: 'CAREER_WORK', description: 'Compile your expertise into a digital book.' },
        { title: 'Complete 3 case studies in your field', category: 'CAREER_WORK', description: 'Demonstrate expertise with practical examples.' },
        { title: 'Attend company-sponsored training', category: 'CAREER_WORK', description: 'Utilize internal opportunities for growth.' },
        { title: 'Mentor a junior colleague', category: 'CAREER_WORK', description: 'Guide and help develop others professionally.' },
      ],
    
      finance: [
        { title: 'Build a 3-month emergency fund', category: 'FINANCE', description: 'Automate monthly savings to reach your safety net.' },
        { title: 'Track expenses for 30 days', category: 'FINANCE', description: 'Categorize spending and identify saving opportunities.' },
        { title: 'Pay off credit card debt', category: 'FINANCE', description: 'Focus on clearing high-interest debt.' },
        { title: 'Start an investment portfolio', category: 'FINANCE', description: 'Open an account and invest regularly.' },
        { title: 'Save for a major purchase', category: 'FINANCE', description: 'Set a savings target for a big expense.' },
        { title: 'Create a monthly budget', category: 'FINANCE', description: 'Allocate spending and stick to limits.' },
        { title: 'Learn about stock market investing', category: 'FINANCE', description: 'Take an introductory investment course.' },
        { title: 'Build a retirement plan', category: 'FINANCE', description: 'Estimate needs and start contributions.' },
        { title: 'Open a high-yield savings account', category: 'FINANCE', description: 'Earn better returns on idle cash.' },
        { title: 'Avoid eating out for a month', category: 'FINANCE', description: 'Save by preparing meals at home.' },
        { title: 'Sell unused items for extra income', category: 'FINANCE', description: 'Declutter and earn from unwanted things.' },
        { title: 'Automate all bill payments', category: 'FINANCE', description: 'Avoid late fees and improve credit score.' },
        { title: 'Review and reduce subscriptions', category: 'FINANCE', description: 'Cut unnecessary recurring expenses.' },
        { title: 'Save 20% of income for 6 months', category: 'FINANCE', description: 'Build disciplined savings habit.' },
        { title: 'Set up an emergency medical fund', category: 'FINANCE', description: 'Prepare for unexpected healthcare expenses.' },
        { title: 'Learn about tax-saving investments', category: 'FINANCE', description: 'Explore legal ways to reduce tax liability.' },
        { title: 'Plan for a home down payment', category: 'FINANCE', description: 'Save consistently towards buying a home.' },
        { title: 'Switch to a cheaper insurance plan', category: 'FINANCE', description: 'Compare policies and cut costs.' },
        { title: 'Track net worth quarterly', category: 'FINANCE', description: 'Monitor financial growth regularly.' },
        { title: 'Invest in mutual funds', category: 'FINANCE', description: 'Diversify with professionally managed funds.' },
        { title: 'Start a passive income stream', category: 'FINANCE', description: 'Generate extra money without active work.' },
        { title: 'Reduce utility bills by 10%', category: 'FINANCE', description: 'Adopt energy-saving habits.' },
        { title: 'Save all bonus income', category: 'FINANCE', description: 'Direct bonuses into savings/investments.' }
      ],
      hobbies: [
        { title: 'Learn to play the guitar', category: 'CREATIVE', description: 'Dedicate 30 minutes a day to guitar practice and learn at least 5 complete songs.'},
        { title: 'Master chess strategies', category: 'CREATIVE', description: 'Study chess openings and tactics weekly to improve competitive play.'},
        { title: 'Complete a 1000-piece puzzle', category: 'CREATIVE', description: 'Challenge patience and focus by completing a large, detailed jigsaw puzzle.' },
        { title: 'Start a coin collection', category: 'CREATIVE', description: 'Collect coins from different countries and eras to learn history.' },
        { title: 'Join a local book club', category: 'CREATIVE', description: 'Read and discuss one book per month with fellow enthusiasts.'},
        { title: 'Learn baking', category: 'CREATIVE', description: 'Master baking bread, cookies, and cakes through weekly practice.'},
        { title: 'Build a model train set', category: 'CREATIVE', description: 'Assemble and customize a complete miniature railway system.' },
        { title: 'Go birdwatching', category: 'CREATIVE', description: 'Identify and record sightings of at least 20 bird species.' },
        { title: 'Take photography walks', category: 'CREATIVE', description: 'Capture unique shots of nature, people, and architecture weekly.'},
        { title: 'Grow a bonsai tree', category: 'CREATIVE', description: 'Learn the art of cultivating and shaping a bonsai tree over time.' },
        { title: 'Learn origami', category: 'CREATIVE', description: 'Fold and master at least 20 complex origami designs.' },
        { title: 'Practice calligraphy', category: 'CREATIVE', description: 'Develop beautiful handwriting styles with daily calligraphy exercises.'},
        { title: 'Explore astronomy', category: 'CREATIVE', description: 'Observe planets, stars, and constellations with a telescope.' },
        { title: 'Create a YouTube hobby channel', category: 'CREATIVE', description: 'Share hobby-related tips and tutorials regularly.'},
        { title: 'Learn knitting or crocheting', category: 'CREATIVE', description: 'Create scarves, hats, or blankets by learning patterns.' },
        { title: 'Join a theater workshop', category: 'CREATIVE', description: 'Participate in acting and drama sessions for creativity.'},
        { title: 'Play board games weekly', category: 'CREATIVE', description: 'Organize game nights with friends or family regularly.' },
        { title: 'Start a nature journal', category: 'CREATIVE', description: 'Document observations, sketches, and reflections from outdoor experiences.' },
        { title: 'Try pottery making', category: 'CREATIVE', description: 'Learn pottery techniques and create functional art pieces.'},
        { title: 'Volunteer for hobby workshops', category: 'CREATIVE', description: 'Share skills by teaching hobby classes locally.'},
        { title: 'Paint a full art series', category: 'CREATIVE', description: 'Complete a collection of at least 10 paintings with a theme.'},
        { title: 'Join a local hiking club', category: 'CREATIVE', description: 'Explore new trails every month with fellow hikers.'},
        { title: 'Make handmade jewelry', category: 'CREATIVE', description: 'Design and craft unique pieces for personal use or sale.' },
        { title: 'Restore vintage items', category: 'CREATIVE', description: 'Repair and refurbish old furniture, tools, or decor.'},
        { title: 'Host a themed dinner night', category: 'CREATIVE', description: 'Cook and serve dishes from a specific cuisine for friends.' }
      ],
      relationships: [
        { title: 'Plan monthly date nights', category: 'RELATIONSHIPS', description: 'Dedicate quality time for special evenings with your partner.'},
        { title: 'Reconnect with old friends', category: 'RELATIONSHIPS', description: 'Reach out to one friend per month to rebuild connections.'},
        { title: 'Start a family game night', category: 'RELATIONSHIPS', description: 'Bring family together with weekly board or card games.' },
        { title: 'Celebrate loved ones\' milestones', category: 'RELATIONSHIPS', description: 'Remember and plan surprises for birthdays and anniversaries.'},
        { title: 'Host a neighborhood gathering', category: 'RELATIONSHIPS', description: 'Build stronger bonds by organizing a casual get-together.' },
        { title: 'Write handwritten letters', category: 'RELATIONSHIPS', description: 'Send thoughtful letters to friends or family quarterly.' },
        { title: 'Take a couples workshop', category: 'RELATIONSHIPS', description: 'Enhance communication and understanding with guided sessions.'},
        { title: 'Volunteer together', category: 'RELATIONSHIPS', description: 'Participate in community service with friends or family.' },
        { title: 'Create a relationship scrapbook', category: 'RELATIONSHIPS', description: 'Compile memories, photos, and milestones in a creative book.' },
        { title: 'Practice active listening', category: 'RELATIONSHIPS', description: 'Dedicate time to truly hear and understand others daily.'},
        { title: 'Join a couples fitness program', category: 'RELATIONSHIPS', description: 'Stay fit and bond by exercising together regularly.'},
        { title: 'Plan a surprise trip', category: 'RELATIONSHIPS', description: 'Organize a short getaway for a loved one without them knowing.'},
        { title: 'Have tech-free dinners', category: 'RELATIONSHIPS', description: 'Ensure distraction-free mealtimes with loved ones.'},
        { title: 'Attend friends\' big events', category: 'RELATIONSHIPS', description: 'Be present for weddings, graduations, and important occasions.'},
        { title: 'Learn conflict resolution', category: 'RELATIONSHIPS', description: 'Practice techniques for resolving disagreements constructively.'},
        { title: 'Cook meals together', category: 'RELATIONSHIPS', description: 'Strengthen bonds by preparing meals with family or friends.' },
        { title: 'Share hobbies with loved ones', category: 'RELATIONSHIPS', description: 'Introduce others to your passions for shared enjoyment.' },
        { title: 'Organize group trips', category: 'RELATIONSHIPS', description: 'Plan vacations with friends or extended family yearly.'},
        { title: 'Build a family tradition', category: 'RELATIONSHIPS', description: 'Start an activity or ritual to repeat every year together.' },
        { title: 'Practice gratitude in relationships', category: 'RELATIONSHIPS', description: 'Express appreciation to loved ones regularly.'},
        { title: 'Support each other\'s goals', category: 'RELATIONSHIPS', description: 'Encourage and assist loved ones in achieving personal milestones.'},
        { title: 'Take family portraits yearly', category: 'RELATIONSHIPS', description: 'Capture moments together with professional photography.' },
        { title: 'Attend couples counseling proactively', category: 'RELATIONSHIPS', description: 'Seek guidance to maintain a healthy relationship.'},
        { title: 'Join a social club', category: 'RELATIONSHIPS', description: 'Expand your circle by participating in community activities.' },
        { title: 'Practice random acts of kindness', category: 'RELATIONSHIPS', description: 'Do thoughtful gestures for loved ones unexpectedly.' }
      ],
      personal_growth: [
        { title: 'Read 12 books in a year', category: 'PERSONAL_GROWTH', description: 'Expand knowledge by completing one book each month.'},
        { title: 'Take an online course', category: 'PERSONAL_GROWTH', description: 'Enroll in a course to learn a new professional skill.'},
        { title: 'Practice daily journaling', category: 'PERSONAL_GROWTH', description: 'Write reflections and lessons learned each day.'},
        { title: 'Wake up at 5 AM', category: 'PERSONAL_GROWTH', description: 'Build a morning routine for productivity and focus.'},
        { title: 'Meditate for 10 minutes daily', category: 'PERSONAL_GROWTH', description: 'Develop mindfulness through consistent practice.'},
        { title: 'Attend a personal development seminar', category: 'PERSONAL_GROWTH', description: 'Gain insights from experts and network with like-minded people.'},
        { title: 'Learn a new language', category: 'PERSONAL_GROWTH', description: 'Commit to practicing a foreign language daily for fluency.'},
        { title: 'Set and track monthly goals', category: 'PERSONAL_GROWTH', description: 'Break big ambitions into small achievable milestones.'},
        { title: 'Build a personal website', category: 'PERSONAL_GROWTH', description: 'Showcase skills, projects, and achievements online.'},
        { title: 'Overcome a fear', category: 'PERSONAL_GROWTH', description: 'Face and gradually conquer something that causes anxiety.'},
        { title: 'Reduce social media usage', category: 'PERSONAL_GROWTH', description: 'Limit daily screen time to focus on real-life activities.'},
        { title: 'Start a gratitude journal', category: 'PERSONAL_GROWTH', description: 'List three things you\'re grateful for daily.'},
        { title: 'Build a strong morning routine', category: 'PERSONAL_GROWTH', description: 'Incorporate exercise, learning, and planning each morning.'},
        { title: 'Improve public speaking skills', category: 'PERSONAL_GROWTH', description: 'Join a club or practice presentations regularly.'},
        { title: 'Develop financial literacy', category: 'PERSONAL_GROWTH', description: 'Understand budgeting, investing, and debt management.'},
        { title: 'Learn time management', category: 'PERSONAL_GROWTH', description: 'Master planning tools to use time effectively.'},
        { title: 'Keep a habit tracker', category: 'PERSONAL_GROWTH', description: 'Track positive habits daily to ensure consistency.'},
        { title: 'Take personality assessments', category: 'PERSONAL_GROWTH', description: 'Understand strengths and areas for improvement.' },
        { title: 'Complete a 30-day challenge', category: 'PERSONAL_GROWTH', description: 'Focus on one self-improvement goal for 30 consecutive days.'},
        { title: 'Read a biography of a role model', category: 'PERSONAL_GROWTH', description: 'Gain inspiration from the life journey of someone you admire.' },
        { title: 'Practice daily affirmations', category: 'PERSONAL_GROWTH', description: 'Repeat positive statements to reinforce confidence.'},
        { title: 'Seek mentorship', category: 'PERSONAL_GROWTH', description: 'Find a mentor to guide personal and career growth.'},
        { title: 'Declutter your space', category: 'PERSONAL_GROWTH', description: 'Organize and simplify your environment for mental clarity.' },
        { title: 'Build resilience', category: 'PERSONAL_GROWTH', description: 'Develop mental toughness by facing challenges head-on.'},
        { title: 'Learn critical thinking', category: 'PERSONAL_GROWTH', description: 'Analyze information objectively for better decisions.'}
      ],
      creativity: [
        { title: 'Write a short story', category: 'CREATIVE', description: 'Create and complete an original short fiction piece.'},
        { title: 'Design a personal logo', category: 'CREATIVE', description: 'Create a unique symbol that represents your identity.'},
        { title: 'Start a daily sketchbook', category: 'CREATIVE', description: 'Draw something new each day to improve artistic skills.'},
        { title: 'Learn digital illustration', category: 'CREATIVE', description: 'Master software like Procreate or Illustrator.'},
        { title: 'Compose a song', category: 'CREATIVE', description: 'Write and record an original piece of music.'},
        { title: 'Make a short film', category: 'CREATIVE', description: 'Plan, shoot, and edit a video project.'},
        { title: 'Create a personal blog', category: 'CREATIVE', description: 'Write and share creative ideas and experiences online.'},
        { title: 'Experiment with abstract painting', category: 'CREATIVE', description: 'Use colors and textures to create expressive works.' },
        { title: 'Participate in a 30-day art challenge', category: 'CREATIVE', description: 'Complete a creative task daily for a month.'},
        { title: 'Learn hand lettering', category: 'CREATIVE', description: 'Develop decorative writing styles for design projects.' },
        { title: 'Build a photo portfolio', category: 'CREATIVE', description: 'Curate your best photography work into a cohesive set.'},
        { title: 'Write a stage play', category: 'CREATIVE', description: 'Create dialogue and scenes for a theatrical performance.'},
        { title: 'Create an art installation', category: 'CREATIVE', description: 'Design and build a space-transforming artwork.'},
        { title: 'Design your own fashion collection', category: 'CREATIVE', description: 'Sketch, sew, and showcase unique clothing designs.'},
        { title: 'Learn animation basics', category: 'CREATIVE', description: 'Create simple animations using digital tools.'},
        { title: 'Produce a podcast', category: 'CREATIVE', description: 'Plan, record, and publish a series of themed episodes.'},
        { title: 'Make a DIY home decor project', category: 'CREATIVE', description: 'Design and craft decorative items for your living space.' },
        { title: 'Enter a creative competition', category: 'CREATIVE', description: 'Submit your work to art, writing, or design contests.'},
        { title: 'Collaborate on a creative project', category: 'CREATIVE', description: 'Work with others to bring a shared vision to life.'},
        { title: 'Illustrate a children\'s book', category: 'CREATIVE', description: 'Draw and design visuals for a story aimed at kids.'},
        { title: 'Make a scrapbook', category: 'CREATIVE', description: 'Combine photos, memorabilia, and art into a themed book.' },
        { title: 'Learn pottery glazing techniques', category: 'CREATIVE', description: 'Experiment with colors and finishes on pottery.' },
        { title: 'Write poetry regularly', category: 'CREATIVE', description: 'Compose poems weekly to develop literary expression.'},
        { title: 'Design a board game', category: 'CREATIVE', description: 'Create rules, themes, and visuals for an original game.'},
        { title: 'Paint a self-portrait', category: 'CREATIVE', description: 'Capture your own likeness in an artistic medium.'}
      ],
      technology: [
        { title: 'Learn a new programming language', category: 'SIDE_PROJECTS', description: 'Expand your skillset by learning a language like Python, Rust, or Go.' },
        { title: 'Build a mobile app', category: 'SIDE_PROJECTS', description: 'Develop and publish a fully functional mobile application.' },
        { title: 'Set up a smart home system', category: 'SIDE_PROJECTS', description: 'Automate your home with IoT devices and voice assistants.' },
        { title: 'Create a personal website', category: 'SIDE_PROJECTS', description: 'Showcase your skills and projects with a custom-built portfolio.' },
        { title: 'Contribute to open-source projects', category: 'SIDE_PROJECTS', description: 'Collaborate with global developers on GitHub or GitLab.' },
        { title: 'Build a custom PC', category: 'SIDE_PROJECTS', description: 'Assemble a desktop computer tailored to your needs.' },
        { title: 'Learn ethical hacking basics', category: 'SIDE_PROJECTS', description: 'Understand cybersecurity principles and penetration testing.' },
        { title: 'Master Excel and data analysis', category: 'SIDE_PROJECTS', description: 'Use advanced formulas, pivot tables, and data visualization tools.' },
        { title: 'Explore artificial intelligence tools', category: 'SIDE_PROJECTS', description: 'Experiment with AI-powered applications and APIs.' },
        { title: 'Create a chatbot', category: 'SIDE_PROJECTS', description: 'Build and deploy an interactive chatbot for fun or business.' },
        { title: 'Learn video editing', category: 'SIDE_PROJECTS', description: 'Edit and produce professional-quality videos using tools like Premiere Pro.' },
        { title: 'Host your own server', category: 'SIDE_PROJECTS', description: 'Run a website, game, or media server from your home.' },
        { title: 'Try 3D printing', category: 'SIDE_PROJECTS', description: 'Design and print objects using a 3D printer.' },
        { title: 'Take a cybersecurity course', category: 'SIDE_PROJECTS', description: 'Gain certifications in digital security and threat prevention.' },
        { title: 'Automate repetitive tasks', category: 'SIDE_PROJECTS', description: 'Use scripts or tools like Zapier to save time.' },
        { title: 'Learn cloud computing', category: 'SIDE_PROJECTS', description: 'Understand AWS, Azure, or Google Cloud platforms.' },
        { title: 'Create a YouTube tech channel', category: 'SIDE_PROJECTS', description: 'Share tutorials, reviews, or tech tips with an audience.' },
        { title: 'Experiment with AR/VR', category: 'SIDE_PROJECTS', description: 'Develop or use augmented and virtual reality experiences.' },
        { title: 'Learn to code games', category: 'SIDE_PROJECTS', description: 'Build small games using Unity, Unreal, or Godot.' },
        { title: 'Take a robotics workshop', category: 'SIDE_PROJECTS', description: 'Build and program robots for fun or competition.' },
        { title: 'Set up a home lab', category: 'SIDE_PROJECTS', description: 'Experiment with networking, virtual machines, and servers.' },
        { title: 'Create a mobile game', category: 'SIDE_PROJECTS', description: 'Develop and publish your own game on app stores.' },
        { title: 'Learn blockchain basics', category: 'SIDE_PROJECTS', description: 'Understand cryptocurrency, smart contracts, and NFTs.' },
        { title: 'Build a personal AI assistant', category: 'SIDE_PROJECTS', description: 'Use AI models to automate and assist daily tasks.' },
        { title: 'Take a UI/UX design course', category: 'SIDE_PROJECTS', description: 'Learn how to create beautiful and user-friendly interfaces.' },
      ],
    
      business: [
        { title: 'Start a side hustle', category: 'CAREER_WORK', description: 'Launch a small project or service to earn extra income.' },
        { title: 'Write a business plan', category: 'CAREER_WORK', description: 'Plan and outline the strategy for a new business idea.' },
        { title: 'Invest in the stock market', category: 'CAREER_WORK', description: 'Start with small investments to understand market trends.' },
        { title: 'Read 5 entrepreneurship books', category: 'CAREER_WORK', description: 'Learn from the success stories of experienced entrepreneurs.' },
        { title: 'Attend a networking event', category: 'CAREER_WORK', description: 'Meet like-minded professionals to grow your network.' },
        { title: 'Create a personal brand', category: 'CAREER_WORK', description: 'Build a consistent identity across your social profiles.' },
        { title: 'Start a blog on business topics', category: 'CAREER_WORK', description: 'Share insights and strategies to attract an audience.' },
        { title: 'Take a marketing course', category: 'CAREER_WORK', description: 'Learn digital marketing, SEO, and social media advertising.' },
        { title: 'Launch an online store', category: 'CAREER_WORK', description: 'Sell products through Shopify, Etsy, or Amazon.' },
        { title: 'Create an email newsletter', category: 'CAREER_WORK', description: 'Share tips, news, or deals with your subscribers.' },
        { title: 'Learn negotiation skills', category: 'CAREER_WORK', description: 'Improve your ability to close deals and win agreements.' },
        { title: 'Host a webinar', category: 'CAREER_WORK', description: 'Share knowledge and connect with a virtual audience.' },
        { title: 'Learn financial management', category: 'CAREER_WORK', description: 'Understand budgeting, investments, and profit margins.' },
        { title: 'Collaborate on a joint venture', category: 'CAREER_WORK', description: 'Partner with another business for mutual growth.' },
        { title: 'Create a sales pitch', category: 'CAREER_WORK', description: 'Craft and practice a compelling offer for potential clients.' },
        { title: 'Start a consulting service', category: 'CAREER_WORK', description: 'Offer expertise to help other businesses grow.' },
        { title: 'Develop a passive income stream', category: 'CAREER_WORK', description: 'Earn income with minimal ongoing effort.' },
        { title: 'Learn project management', category: 'CAREER_WORK', description: 'Use tools like Trello or Asana to organize work.' },
        { title: 'Pitch to an investor', category: 'CAREER_WORK', description: 'Present your business idea for funding opportunities.' },
        { title: 'Read daily business news', category: 'CAREER_WORK', description: 'Stay updated with market and industry trends.' },
        { title: 'Join a business mastermind group', category: 'CAREER_WORK', description: 'Collaborate and grow with like-minded professionals.' },
        { title: 'Optimize your LinkedIn profile', category: 'CAREER_WORK', description: 'Improve your professional visibility and networking.' },
        { title: 'Launch a crowdfunding campaign', category: 'CAREER_WORK', description: 'Raise funds for a creative or business idea.' },
        { title: 'Develop leadership skills', category: 'CAREER_WORK', description: 'Learn to inspire and manage a team effectively.' },
        { title: 'Write a case study', category: 'CAREER_WORK', description: 'Document and share a real-world business success story.' },
      ],
    
      lifestyle: [
        { title: 'Create a morning routine', category: 'LIFESTYLE', description: 'Start your day with healthy and productive habits.' },
        { title: 'Declutter your home', category: 'LIFESTYLE', description: 'Simplify your space by removing unnecessary items.' },
        { title: 'Plan a monthly outing', category: 'LIFESTYLE', description: 'Make time for exploration and fun experiences.' },
        { title: 'Try a new recipe every week', category: 'LIFESTYLE', description: 'Expand your cooking skills with diverse cuisines.' },
        { title: 'Practice daily journaling', category: 'LIFESTYLE', description: 'Reflect and record your thoughts and goals.' },
        { title: 'Start a skincare routine', category: 'LIFESTYLE', description: 'Take care of your skin with a regular regimen.' },
        { title: 'Explore minimalism', category: 'LIFESTYLE', description: 'Live with less for a simpler, more intentional life.' },
        { title: 'Switch to eco-friendly products', category: 'LIFESTYLE', description: 'Make sustainable choices for daily living.' },
        { title: 'Host a dinner party', category: 'LIFESTYLE', description: 'Invite friends or family for a special meal.' },
        { title: 'Redesign your living space', category: 'LIFESTYLE', description: 'Refresh your home décor for comfort and style.' },
        { title: 'Take a digital detox', category: 'LIFESTYLE', description: 'Spend a day without screens to recharge mentally.' },
        { title: 'Grow indoor plants', category: 'LIFESTYLE', description: 'Add greenery to your home for better air and mood.' },
        { title: 'Learn basic sewing', category: 'LIFESTYLE', description: 'Mend or customize clothes yourself.' },
        { title: 'Plan a self-care day', category: 'LIFESTYLE', description: 'Dedicate a day to relaxation and wellness.' },
        { title: 'Join a local club', category: 'LIFESTYLE', description: 'Participate in activities that match your interests.' },
        { title: 'Improve your posture', category: 'LIFESTYLE', description: 'Incorporate exercises and reminders to stand tall.' },
        { title: 'Switch to healthy snacks', category: 'LIFESTYLE', description: 'Replace junk food with nutritious options.' },
        { title: 'Host a game night', category: 'LIFESTYLE', description: 'Enjoy board or video games with friends.' },
        { title: 'Experiment with fashion styles', category: 'LIFESTYLE', description: 'Try outfits outside your usual comfort zone.' },
        { title: 'Take a solo day trip', category: 'LIFESTYLE', description: 'Spend a day exploring somewhere new alone.' },
        { title: 'Create a home spa', category: 'LIFESTYLE', description: 'Pamper yourself with a relaxing at-home spa setup.' },
        { title: 'Join a dance class', category: 'LIFESTYLE', description: 'Learn a new dance style while staying active.' },
        { title: 'Organize your finances', category: 'LIFESTYLE', description: 'Track expenses and budget for your goals.' },
        { title: 'Adopt a pet', category: 'LIFESTYLE', description: 'Bring home a furry friend for companionship.' },
        { title: 'Make a vision board', category: 'LIFESTYLE', description: 'Visualize your dreams and aspirations.' },
      ],
    
      spirituality: [
        { title: 'Practice daily meditation', category: 'MENTAL_HEALTH', description: 'Spend time in mindfulness or quiet reflection.' },
        { title: 'Read a spiritual book', category: 'MENTAL_HEALTH', description: 'Explore texts on philosophy, religion, or self-discovery.' },
        { title: 'Try breathwork exercises', category: 'MENTAL_HEALTH', description: 'Enhance mental clarity and calm through breathing techniques.' },
        { title: 'Attend a spiritual retreat', category: 'MENTAL_HEALTH', description: 'Spend time in a peaceful, focused environment.' },
        { title: 'Start a gratitude journal', category: 'MENTAL_HEALTH', description: 'Write down daily blessings and positive moments.' },
        { title: 'Practice yoga regularly', category: 'MENTAL_HEALTH', description: 'Combine physical movement with mental focus.' },
        { title: 'Learn about different religions', category: 'MENTAL_HEALTH', description: 'Gain knowledge and respect for various beliefs.' },
        { title: 'Spend time in nature', category: 'MENTAL_HEALTH', description: 'Reconnect with the earth through outdoor activities.' },
        { title: 'Volunteer for a cause', category: 'MENTAL_HEALTH', description: 'Serve others and experience fulfillment.' },
        { title: 'Practice daily affirmations', category: 'MENTAL_HEALTH', description: 'Reinforce positivity through spoken intentions.' },
        { title: 'Create a sacred space', category: 'MENTAL_HEALTH', description: 'Dedicate an area for reflection and prayer.' },
        { title: 'Attend a mindfulness workshop', category: 'MENTAL_HEALTH', description: 'Learn techniques to stay present and aware.' },
        { title: 'Practice compassion daily', category: 'MENTAL_HEALTH', description: 'Show kindness in small, consistent ways.' },
        { title: 'Listen to spiritual podcasts', category: 'MENTAL_HEALTH', description: 'Gain insights and inspiration from experts.' },
        { title: 'Explore crystal healing', category: 'MENTAL_HEALTH', description: 'Learn about the energies of different stones.' },
        { title: 'Try journaling after meditation', category: 'MENTAL_HEALTH', description: 'Record thoughts and clarity from sessions.' },
        { title: 'Read sacred texts', category: 'MENTAL_HEALTH', description: 'Study scriptures or writings from spiritual leaders.' },
        { title: 'Join a prayer group', category: 'MENTAL_HEALTH', description: 'Connect with others in shared faith practices.' },
        { title: 'Practice fasting', category: 'MENTAL_HEALTH', description: 'Experience discipline and mindfulness through fasting.' },
        { title: 'Attend a cultural festival', category: 'MENTAL_HEALTH', description: 'Celebrate traditions and rituals from around the world.' },
        { title: 'Engage in sound healing', category: 'MENTAL_HEALTH', description: 'Experience relaxation through sound therapy.' },
        { title: 'Create a vision mantra', category: 'MENTAL_HEALTH', description: 'Craft a personal statement to guide your path.' },
        { title: 'Practice forgiveness', category: 'MENTAL_HEALTH', description: 'Let go of grudges to find peace.' },
        { title: 'Spend a day in silence', category: 'MENTAL_HEALTH', description: 'Disconnect from noise to listen inwardly.' },
        { title: 'Write your spiritual journey', category: 'MENTAL_HEALTH', description: 'Document your path of growth and understanding.' },
      ],
    
      sports: [
        { title: 'Run a marathon', category: 'HEALTH_FITNESS', description: 'Train to complete a full or half marathon.' },
        { title: 'Join a local sports team', category: 'HEALTH_FITNESS', description: 'Play regularly with a community group.' },
        { title: 'Learn swimming', category: 'HEALTH_FITNESS', description: 'Build endurance and technique in the water.' },
        { title: 'Try rock climbing', category: 'HEALTH_FITNESS', description: 'Challenge your strength and agility on climbing walls.' },
        { title: 'Play tennis regularly', category: 'HEALTH_FITNESS', description: 'Improve skills through consistent practice.' },
        { title: 'Learn martial arts', category: 'HEALTH_FITNESS', description: 'Train in karate, judo, or another discipline.' },
        { title: 'Go hiking monthly', category: 'HEALTH_FITNESS', description: 'Explore trails and enjoy nature.' },
        { title: 'Learn golf', category: 'HEALTH_FITNESS', description: 'Develop skills for both leisure and competition.' },
        { title: 'Try surfing', category: 'HEALTH_FITNESS', description: 'Ride the waves and improve balance.' },
        { title: 'Play basketball weekly', category: 'HEALTH_FITNESS', description: 'Join games to stay fit and competitive.' },
        { title: 'Participate in a cycling event', category: 'HEALTH_FITNESS', description: 'Join a race or long-distance cycling challenge.' },
        { title: 'Take a fencing class', category: 'HEALTH_FITNESS', description: 'Learn the art of sword fighting.' },
        { title: 'Try archery', category: 'HEALTH_FITNESS', description: 'Improve focus and precision with a bow and arrow.' },
        { title: 'Go kayaking', category: 'HEALTH_FITNESS', description: 'Paddle through lakes, rivers, or oceans.' },
        { title: 'Learn skateboarding', category: 'HEALTH_FITNESS', description: 'Master tricks and balance on a board.' },
        { title: 'Play cricket in a local league', category: 'HEALTH_FITNESS', description: 'Compete in matches for fun or skill.' },
        { title: 'Try scuba diving', category: 'HEALTH_FITNESS', description: 'Explore underwater life and reefs.' },
        { title: 'Practice yoga for flexibility', category: 'HEALTH_FITNESS', description: 'Improve movement and prevent injuries.' },
        { title: 'Join a running club', category: 'HEALTH_FITNESS', description: 'Train and run with a supportive group.' },
        { title: 'Learn snowboarding', category: 'HEALTH_FITNESS', description: 'Hit the slopes and master the sport.' },
        { title: 'Do regular home workouts', category: 'HEALTH_FITNESS', description: 'Stay fit with bodyweight or minimal equipment.' },
        { title: 'Take a boxing class', category: 'HEALTH_FITNESS', description: 'Boost strength and endurance with boxing.' },
        { title: 'Participate in a triathlon', category: 'HEALTH_FITNESS', description: 'Compete in swimming, cycling, and running.' },
        { title: 'Play badminton weekly', category: 'HEALTH_FITNESS', description: 'Stay active with regular matches.' },
        { title: 'Learn parkour', category: 'HEALTH_FITNESS', description: 'Navigate obstacles with speed and efficiency.' },
      ],
      music: [
        { title: 'Learn to play guitar', category: 'CREATIVE', description: 'Master basic chords and a few songs within 3 months.'},
        { title: 'Write an original song', category: 'CREATIVE', description: 'Compose lyrics and melody for your own track.'},
        { title: 'Join a local band', category: 'CREATIVE', description: 'Collaborate with other musicians to perform live.'},
        { title: 'Perform at an open mic', category: 'CREATIVE', description: 'Play in front of a small audience to build confidence.'},
        { title: 'Learn music theory basics', category: 'CREATIVE', description: 'Understand scales, chords, and rhythm fundamentals.'},
        { title: 'Create a home recording setup', category: 'CREATIVE', description: 'Set up equipment to record songs at home.' },
        { title: 'Learn a new instrument', category: 'CREATIVE', description: 'Pick up a new instrument like piano, violin, or drums.'},
        { title: 'Attend a music festival', category: 'CREATIVE', description: 'Experience live performances from multiple artists.' },
        { title: 'Curate a personal playlist', category: 'CREATIVE', description: 'Create a playlist that reflects your mood and style.' },
        { title: 'Understand music production', category: 'CREATIVE', description: 'Learn to use DAWs like Ableton or FL Studio.'},
        { title: 'Reach 100K streams on a track', category: 'CREATIVE', description: 'Promote and distribute your music online.'},
        { title: 'Learn to DJ', category: 'CREATIVE', description: 'Understand beat matching and mixing basics.' },
        { title: 'Transcribe a song by ear', category: 'CREATIVE', description: 'Write down the notes of a favorite song.'},
        { title: 'Take vocal training lessons', category: 'CREATIVE', description: 'Improve pitch, tone, and breathing technique.'},
        { title: 'Record a cover song', category: 'CREATIVE', description: 'Reinterpret a favorite song in your style.' },
        { title: 'Learn sight-reading', category: 'CREATIVE', description: 'Quickly read and play written music.'},
        { title: 'Collaborate with an artist online', category: 'CREATIVE', description: 'Make a track with someone remotely.' },
        { title: 'Perform in a public space', category: 'CREATIVE', description: 'Busk in a park or street corner.' },
        { title: 'Understand world music styles', category: 'CREATIVE', description: 'Explore genres like reggae, jazz, blues, and EDM.' },
        { title: 'Write an EP', category: 'CREATIVE', description: 'Create a short collection of original music.'},
        { title: 'Learn improvisation', category: 'CREATIVE', description: 'Play spontaneously without sheet music.'},
        { title: 'Digitally release your music', category: 'CREATIVE', description: 'Publish your work on platforms like Spotify.'},
        { title: 'Build a personal brand as a musician', category: 'CREATIVE', description: 'Create a unique identity for your music career.'},
        { title: 'Understand audio mixing and mastering', category: 'CREATIVE', description: 'Learn final polishing techniques for music.'},
        { title: 'Organize a charity concert', category: 'CREATIVE', description: 'Host an event to raise funds for a cause.'}
      ],
    
      art: [
        { title: 'Complete a daily sketch challenge', category: 'CREATIVE', description: 'Draw something every day for 30 days.'},
        { title: 'Learn watercolor painting', category: 'CREATIVE', description: 'Explore brush techniques and color blending.' },
        { title: 'Create a digital illustration', category: 'CREATIVE', description: 'Use tools like Procreate or Photoshop.'},
        { title: 'Host an art exhibition', category: 'CREATIVE', description: 'Showcase your artwork to the public.'},
        { title: 'Learn figure drawing', category: 'CREATIVE', description: 'Understand human anatomy and proportions.'},
        { title: 'Paint a mural', category: 'CREATIVE', description: 'Create a large-scale wall painting.'},
        { title: 'Sell your artwork online', category: 'CREATIVE', description: 'Open an Etsy shop or similar store.'},
        { title: 'Try clay sculpting', category: 'CREATIVE', description: 'Learn hand-building and pottery basics.' },
        { title: 'Create an art portfolio', category: 'CREATIVE', description: 'Compile your best works for presentation.'},
        { title: 'Join an art class', category: 'CREATIVE', description: 'Learn from professionals and peers.' },
        { title: 'Recreate a famous painting', category: 'CREATIVE', description: 'Learn techniques from renowned artists.'},
        { title: 'Illustrate a children\'s book', category: 'CREATIVE', description: 'Create visuals for a storybook.'},
        { title: 'Experiment with abstract art', category: 'CREATIVE', description: 'Play with shapes and colors without rules.' },
        { title: 'Design your own comic strip', category: 'CREATIVE', description: 'Create characters and tell a short story.'},
        { title: 'Join an art competition', category: 'CREATIVE', description: 'Test your skills against others.'},
        { title: 'Learn calligraphy', category: 'CREATIVE', description: 'Master decorative handwriting techniques.' },
        { title: 'Make an art vlog', category: 'CREATIVE', description: 'Share your creative process on social media.' },
        { title: 'Try 3D modeling', category: 'CREATIVE', description: 'Learn Blender or Maya basics.'},
        { title: 'Paint outdoors', category: 'CREATIVE', description: 'Do plein-air painting in a scenic location.' },
        { title: 'Collaborate on a community art project', category: 'CREATIVE', description: 'Work with others on a public artwork.'},
        { title: 'Learn perspective drawing', category: 'CREATIVE', description: 'Master one-point and two-point perspective.'},
        { title: 'Create a self-portrait', category: 'CREATIVE', description: 'Capture your likeness through art.' },
        { title: 'Experiment with mixed media', category: 'CREATIVE', description: 'Combine paints, collage, and textures.'},
        { title: 'Build a following on Instagram for art', category: 'CREATIVE', description: 'Post art consistently to gain visibility.'},
        { title: 'Teach an art workshop', category: 'CREATIVE', description: 'Share your skills with aspiring artists.'}
      ],
      reading: [
        { title: 'Read 20 books in a year', category: 'PERSONAL_GROWTH', description: 'Set a reading target and track progress.'},
        { title: 'Join a local book club', category: 'PERSONAL_GROWTH', description: 'Discuss literature with like-minded people.'},
        { title: 'Read a classic novel', category: 'PERSONAL_GROWTH', description: 'Explore timeless literary works.' },
        { title: 'Explore different genres', category: 'PERSONAL_GROWTH', description: 'Read books from at least 5 different genres.'},
        { title: 'Read for 30 minutes daily', category: 'PERSONAL_GROWTH', description: 'Build a consistent reading habit.'},
        { title: 'Write a book review', category: 'PERSONAL_GROWTH', description: 'Summarize and share your thoughts.' },
        { title: 'Listen to audiobooks', category: 'PERSONAL_GROWTH', description: 'Enjoy stories while multitasking.' },
        { title: 'Follow a famous author\'s works', category: 'PERSONAL_GROWTH', description: 'Read all major works by one author.'},
        { title: 'Organize a home library', category: 'PERSONAL_GROWTH', description: 'Arrange and maintain your book collection.' },
        { title: 'Read a book in a foreign language', category: 'PERSONAL_GROWTH', description: 'Improve language skills through literature.'},
        { title: 'Attend a book signing event', category: 'PERSONAL_GROWTH', description: 'Meet your favorite authors in person.' },
        { title: 'Re-read your favorite childhood book', category: 'PERSONAL_GROWTH', description: 'Relive nostalgic moments.' },
        { title: 'Read 10 non-fiction books', category: 'PERSONAL_GROWTH', description: 'Gain knowledge on various topics.'},
        { title: 'Start a reading journal', category: 'PERSONAL_GROWTH', description: 'Note key takeaways from each book.' },
        { title: 'Gift a book to a friend', category: 'PERSONAL_GROWTH', description: 'Share your love of reading.' },
        { title: 'Read a poetry collection', category: 'PERSONAL_GROWTH', description: 'Appreciate rhythm and verse.' },
        { title: 'Participate in a reading challenge', category: 'PERSONAL_GROWTH', description: 'Push yourself to meet a target.'},
        { title: 'Read a self-improvement book', category: 'PERSONAL_GROWTH', description: 'Apply lessons to your life.'},
        { title: 'Read under the stars', category: 'PERSONAL_GROWTH', description: 'Create a magical reading experience.' },
        { title: 'Share book recommendations online', category: 'PERSONAL_GROWTH', description: 'Help others discover great reads.' },
        { title: 'Read a banned or controversial book', category: 'PERSONAL_GROWTH', description: 'Understand diverse perspectives.'},
        { title: 'Read a biography', category: 'PERSONAL_GROWTH', description: 'Learn from the lives of influential people.'},
        { title: 'Read a book in one sitting', category: 'PERSONAL_GROWTH', description: 'Challenge your focus and stamina.'},
        { title: 'Attend a literary festival', category: 'PERSONAL_GROWTH', description: 'Immerse yourself in book culture.' },
        { title: 'Write your own short story', category: 'PERSONAL_GROWTH', description: 'Experiment with storytelling.'}
      ],
    
      cooking: [
        { title: 'Master 10 new recipes', category: 'LIFESTYLE', description: 'Expand your cooking skills.'},
        { title: 'Bake your own bread', category: 'LIFESTYLE', description: 'Learn bread-making from scratch.'},
        { title: 'Host a dinner party', category: 'LIFESTYLE', description: 'Cook for family and friends.'},
        { title: 'Learn to cook international dishes', category: 'LIFESTYLE', description: 'Explore cuisines from around the world.'},
        { title: 'Perfect your knife skills', category: 'LIFESTYLE', description: 'Chop, dice, and slice like a pro.'},
        { title: 'Make homemade pasta', category: 'LIFESTYLE', description: 'Create fresh pasta from scratch.' },
        { title: 'Create a signature dish', category: 'LIFESTYLE', description: 'Be known for one special recipe.'},
        { title: 'Cook a 3-course meal', category: 'LIFESTYLE', description: 'Plan and execute a complete menu.'},
        { title: 'Experiment with plant-based meals', category: 'LIFESTYLE', description: 'Cook vegetarian or vegan dishes.'},
        { title: 'Learn food plating techniques', category: 'LIFESTYLE', description: 'Present dishes beautifully.' },
        { title: 'Make your own sauces', category: 'LIFESTYLE', description: 'Master base sauces like béchamel.'},
        { title: 'Ferment your own food', category: 'LIFESTYLE', description: 'Make kimchi, kombucha, or pickles.' },
        { title: 'Cook with seasonal produce', category: 'LIFESTYLE', description: 'Use fresh, in-season ingredients.'},
        { title: 'Create a weekly meal plan', category: 'LIFESTYLE', description: 'Organize and prepare in advance.' },
        { title: 'Bake a layered cake', category: 'LIFESTYLE', description: 'Practice cake decoration.'},
        { title: 'Cook over a campfire', category: 'LIFESTYLE', description: 'Learn outdoor cooking techniques.' },
        { title: 'Try molecular gastronomy', category: 'LIFESTYLE', description: 'Experiment with modernist cuisine.' },
        { title: 'Make homemade ice cream', category: 'LIFESTYLE', description: 'Try unique flavors and textures.'},
        { title: 'Recreate a dish from a restaurant', category: 'LIFESTYLE', description: 'Reverse engineer your favorite meal.'},
        { title: 'Take a cooking class', category: 'LIFESTYLE', description: 'Learn from professional chefs.'},
        { title: 'Prepare food for charity', category: 'LIFESTYLE', description: 'Cook for community events.' },
        { title: 'Grow your own herbs', category: 'LIFESTYLE', description: 'Use homegrown herbs in cooking.' },
        { title: 'Make sushi at home', category: 'LIFESTYLE', description: 'Learn rolling and cutting techniques.'},
        { title: 'Cook a recipe from a famous chef', category: 'LIFESTYLE', description: 'Test your skills with expert recipes.'},
        { title: 'Document your recipes', category: 'LIFESTYLE', description: 'Create your own recipe book.'}
      ],
    
      gaming: [
        { title: 'Complete a 100% run of a game', category: 'CREATIVE', description: 'Unlock all achievements or trophies.'},
        { title: 'Participate in an online gaming tournament', category: 'CREATIVE', description: 'Test your skills against others.'},
        { title: 'Build your own gaming PC', category: 'CREATIVE', description: 'Assemble a custom setup.'},
        { title: 'Stream games online', category: 'CREATIVE', description: 'Share your gameplay on Twitch or YouTube.' },
        { title: 'Join an esports team', category: 'CREATIVE', description: 'Compete professionally in your favorite game.'},
        { title: 'Finish a classic retro game', category: 'CREATIVE', description: 'Explore gaming history.' },
        { title: 'Host a LAN party', category: 'CREATIVE', description: 'Invite friends for in-person gaming.' },
        { title: 'Learn game development', category: 'CREATIVE', description: 'Create a basic game from scratch.'},
        { title: 'Set a personal speedrun record', category: 'CREATIVE', description: 'Beat a game as fast as possible.'},
        { title: 'Explore VR gaming', category: 'CREATIVE', description: 'Experience immersive virtual reality worlds.'},
        { title: 'Play a new genre', category: 'CREATIVE', description: 'Try something different from your usual style.' },
        { title: 'Collect gaming merchandise', category: 'CREATIVE', description: 'Build a collection of themed items.' },
        { title: 'Create a YouTube gaming series', category: 'CREATIVE', description: 'Upload regular episodes of gameplay.'},
        { title: 'Participate in a game jam', category: 'CREATIVE', description: 'Collaborate to create a game in limited time.'},
        { title: 'Master a competitive game', category: 'CREATIVE', description: 'Reach top ranks in online play.'},
        { title: 'Try mobile gaming marathons', category: 'CREATIVE', description: 'Play for extended hours on mobile.' },
        { title: 'Replay a childhood favorite game', category: 'CREATIVE', description: 'Enjoy nostalgia with old classics.' },
        { title: 'Test gaming accessories', category: 'CREATIVE', description: 'Try new controllers, VR headsets, etc.'},
        { title: 'Build a gaming community', category: 'CREATIVE', description: 'Engage with like-minded gamers.'},
        { title: 'Play a cooperative story game', category: 'CREATIVE', description: 'Experience teamwork in gaming.' },
        { title: 'Review games online', category: 'CREATIVE', description: 'Share opinions and feedback.' },
        { title: 'Attend a gaming convention', category: 'CREATIVE', description: 'Explore new tech and games.'},
        { title: 'Cosplay a game character', category: 'CREATIVE', description: 'Bring your favorite character to life.' },
        { title: 'Finish a game in hardcore mode', category: 'CREATIVE', description: 'Complete high difficulty settings.'},
        { title: 'Create gaming fan art', category: 'CREATIVE', description: 'Express your passion creatively.' }
      ],
      nature: [
        { title: 'Plant 10 new trees', category: 'LIFESTYLE', description: 'Contribute to reforestation by planting native trees in your community.'},
        { title: 'Start a home garden', category: 'LIFESTYLE', description: 'Grow your own vegetables, herbs, or flowers at home.'},
        { title: 'Visit 5 national parks', category: 'LIFESTYLE', description: 'Explore natural beauty by visiting and appreciating 5 different national parks.'},
        { title: 'Go on monthly hikes', category: 'LIFESTYLE', description: 'Stay connected to nature by hiking at least once a month.' },
        { title: 'Build a birdhouse', category: 'LIFESTYLE', description: 'Create a bird-friendly space in your backyard or balcony.' },
        { title: 'Organize a beach clean-up', category: 'LIFESTYLE', description: 'Help preserve marine life by cleaning up trash at the shore.'},
        { title: 'Learn about native plants', category: 'LIFESTYLE', description: 'Study and identify the plants native to your local area.'},
        { title: 'Go camping in the wild', category: 'LIFESTYLE', description: 'Experience nature fully by camping under the stars.' },
        { title: 'Build a compost bin', category: 'LIFESTYLE', description: 'Recycle food waste into compost for a healthier environment.'},
        { title: 'Support a wildlife sanctuary', category: 'LIFESTYLE', description: 'Donate time or resources to protect endangered species.'},
        { title: 'Start rainwater harvesting', category: 'LIFESTYLE', description: 'Set up a rainwater collection system to conserve water.'},
        { title: 'Document nature photography', category: 'LIFESTYLE', description: 'Capture the beauty of nature through photography.' },
        { title: 'Volunteer at a botanical garden', category: 'LIFESTYLE', description: 'Help maintain gardens and educate visitors.'},
        { title: 'Reduce single-use plastics', category: 'LIFESTYLE', description: 'Commit to minimizing plastic waste in daily life.'},
        { title: 'Join a local nature club', category: 'LIFESTYLE', description: 'Meet like-minded people and explore nature together.' },
        { title: 'Create a pollinator garden', category: 'LIFESTYLE', description: 'Grow plants that attract bees, butterflies, and birds.'},
        { title: 'Track local wildlife', category: 'LIFESTYLE', description: 'Observe and log wildlife sightings in your area.' },
        { title: 'Learn foraging basics', category: 'LIFESTYLE', description: 'Understand which wild plants are safe to eat and use.'},
        { title: 'Participate in Earth Day events', category: 'LIFESTYLE', description: 'Join activities that promote environmental protection.'},
        { title: 'Switch to eco-friendly products', category: 'LIFESTYLE', description: 'Replace harmful products with sustainable alternatives.'}
      ],
      volunteering: [
        { title: 'Volunteer at a local shelter', category: 'PERSONAL_GROWTH', description: 'Assist in caring for homeless people or animals.'},
        { title: 'Teach underprivileged kids', category: 'PERSONAL_GROWTH', description: 'Share your knowledge by teaching children in need.'},
        { title: 'Organize a food drive', category: 'PERSONAL_GROWTH', description: 'Collect and distribute food to those in need.'},
        { title: 'Help in disaster relief', category: 'PERSONAL_GROWTH', description: 'Assist communities affected by natural disasters.'},
        { title: 'Join a blood donation camp', category: 'PERSONAL_GROWTH', description: 'Donate blood to save lives.'},
        { title: 'Mentor someone in your field', category: 'PERSONAL_GROWTH', description: 'Guide and support someone starting in your profession.'},
        { title: 'Volunteer at a senior center', category: 'PERSONAL_GROWTH', description: 'Spend time with and assist elderly individuals.'},
        { title: 'Clean up a public park', category: 'PERSONAL_GROWTH', description: 'Help keep community parks clean and safe.'},
        { title: 'Support a local charity', category: 'PERSONAL_GROWTH', description: 'Contribute your time or skills to a charitable cause.'},
        { title: 'Deliver meals to the needy', category: 'PERSONAL_GROWTH', description: 'Participate in programs that bring food to those who cannot leave their homes.'},
        { title: 'Volunteer at a hospital', category: 'PERSONAL_GROWTH', description: 'Assist patients and staff in non-medical ways.'},
        { title: 'Organize a clothes donation drive', category: 'PERSONAL_GROWTH', description: 'Collect clothes and give them to people in need.'},
        { title: 'Participate in animal rescue', category: 'PERSONAL_GROWTH', description: 'Help save and care for injured or stray animals.'},
        { title: 'Assist in community events', category: 'PERSONAL_GROWTH', description: 'Help organize and run local cultural or social events.' },
        { title: 'Raise funds for a cause', category: 'PERSONAL_GROWTH', description: 'Organize fundraising activities for important causes.'},
        { title: 'Volunteer in environmental projects', category: 'PERSONAL_GROWTH', description: 'Participate in tree planting, clean-ups, and other green initiatives.'},
        { title: 'Help at a library', category: 'PERSONAL_GROWTH', description: 'Assist in organizing and running local libraries.' },
        { title: 'Offer pro bono professional services', category: 'PERSONAL_GROWTH', description: 'Provide your skills for free to help communities.'},
        { title: 'Participate in global volunteering programs', category: 'PERSONAL_GROWTH', description: 'Travel to help communities around the world.'},
        { title: 'Create care packages', category: 'PERSONAL_GROWTH', description: 'Prepare and distribute essential supplies to those in need.'}
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
const GoalSuggestions = ({ interests = [], onSelect, onCreate, variant = 'inline', limit = 6, forceExpanded = false, showHeader = true, titleOverride, containerClassName = 'mt-10', innerContainerClassName = 'max-w-5xl mx-auto' }) => {
  const [expanded, setExpanded] = useState(forceExpanded || variant === 'empty')
  const [suggestions, setSuggestions] = useState([])

  const regenerate = () => {
    setSuggestions(pickMixedSuggestions(interests, limit))
  }

  useEffect(() => {
    regenerate()
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
    <div id="suggested-goals" className={containerClassName} style={{ fontFamily: 'Manrope' }}>
      <div className={`${innerContainerClassName} flex flex-col h-full`}>
      {showHeader && (
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center">
            <Sparkles className="h-5 w-5 mr-3" style={{ color: THEME_COLOR }} />
            <h3 className="text-lg font-bold text-gray-900 dark:text-white" style={{ fontFamily: 'Manrope' }}>
              {titleOverride || (variant === 'empty' ? 'Suggested Goals to Get You Started' : 'Goal Inspiration')}
            </h3>
          </div>
          <div className="flex items-center gap-3">
            <button onClick={regenerate} className="text-sm text-gray-600 dark:text-gray-300 hover:text-gray-800 dark:hover:text-gray-100 inline-flex items-center gap-1" style={{ fontFamily: 'Manrope' }}>
              <RefreshCw className="h-4 w-4" /> Shuffle
            </button>
            {!forceExpanded && variant === 'inline' && (
              <button onClick={() => setExpanded(false)} className="text-sm text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200" style={{ fontFamily: 'Manrope' }}>
                Hide
              </button>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 flex-1">
        <AnimatePresence initial={false}>
          {suggestions.map((g, idx) => {
            return (
            <motion.div
              key={`${g.title}-${idx}`}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25, delay: Math.min(idx * 0.04, 0.25) }}
              className="p-5 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:shadow-lg hover:border-gray-300 dark:hover:border-gray-600 transition-all duration-200"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="p-2 rounded-lg" style={{ backgroundColor: `${THEME_COLOR}20` }}>
                  <div style={{ color: THEME_COLOR }}>
                    {getCategoryIcon(g.category)}
                  </div>
                </div>
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400 mb-2 font-semibold uppercase tracking-wider" style={{ fontFamily: 'Manrope' }}>
                {g.category}
              </div>
              <div className="font-bold text-gray-900 dark:text-white mb-2 text-sm" style={{ fontFamily: 'Manrope' }}>{g.title}</div>
              <div className="text-xs text-gray-600 dark:text-gray-400 mb-4 line-clamp-2" style={{ fontFamily: 'Manrope', lineHeight: '1.4' }}>{g.description}</div>
              <button 
                onClick={() => onSelect?.(g)} 
                className="w-full py-2 px-3 text-white rounded-lg hover:opacity-90 transition-all font-medium text-sm"
                style={{ backgroundColor: THEME_COLOR, fontFamily: 'Manrope' }}
              >
                Use this goal
              </button>
            </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </div>
  </div>
  )
}

export default GoalSuggestions
