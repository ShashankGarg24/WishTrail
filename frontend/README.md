# WishTrail - Dreams. Goals. Progress.

A beautiful and modern personal goal-tracking web application built with React, Tailwind CSS, and Framer Motion. WishTrail helps you set, track, and achieve your yearly goals while providing daily inspiration through embedded content.

## ✨ Features

- **Year-wise Goal Management**: Organize your goals by year with progress tracking
- **Beautiful UI**: Modern glassmorphism design with smooth animations
- **Dark/Light Mode**: Toggle between themes for comfortable viewing
- **Progress Tracking**: Visual progress bars and completion statistics
- **Inspiration Content**: Embedded YouTube videos and Instagram posts
- **Blog Integration**: Direct links to your external blog content
- **User Authentication**: Mock authentication system (ready for backend integration)
- **Responsive Design**: Works perfectly on all device sizes
- **Goal Categories**: Organize goals by categories with priority levels
- **Achievement System**: Unlock achievements as you complete goals

## 🚀 Tech Stack

- **React 18** - Modern React with hooks
- **Vite** - Fast development build tool
- **Tailwind CSS** - Utility-first CSS framework
- **Framer Motion** - Smooth animations and transitions
- **React Router v6** - Client-side routing
- **Zustand** - Lightweight state management
- **Lucide React** - Beautiful icons

## 📦 Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd wishtrail
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   ```

4. **Open your browser**
   Navigate to `http://localhost:3000`

## 🛠️ Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint

## 🎯 Usage

### Getting Started

1. **Create an Account**: Visit the auth page to create a new account or sign in
2. **Set Your Goals**: Navigate to the dashboard to add your first goal
3. **Track Progress**: Mark goals as complete and watch your progress grow
4. **Get Inspired**: Visit the inspiration page for motivational content
5. **Customize**: Toggle between light and dark themes

### Goal Management

- **Add Goals**: Click "Add Goal" to create new goals with categories and priorities
- **Edit Goals**: Click the edit icon on any goal card to modify it
- **Complete Goals**: Click the circle icon to mark goals as completed
- **Delete Goals**: Use the trash icon to remove goals you no longer need

### Year Selection

- Switch between different years to plan future goals or review past achievements
- The dashboard shows stats for the currently selected year
- Progress bars update dynamically based on your completion rate

## 🎨 Customization

### Adding Your Content

1. **YouTube Videos**: Update the video IDs in `src/components/VideoEmbedGrid.jsx`
2. **Instagram Posts**: Replace the Instagram URLs with your actual posts
3. **Blog URL**: Update the blog URL in multiple components to point to your blog
4. **Social Links**: Modify social media handles in the footer and other components

### Styling

- **Colors**: Modify the color scheme in `tailwind.config.js`
- **Animations**: Adjust animations in the individual components
- **Layout**: Customize the responsive breakpoints and spacing

## 🔧 Backend Integration

The project is designed to be backend-ready. To integrate with a real backend:

1. **Replace Mock Auth**: Update the authentication in `src/pages/AuthPage.jsx`
2. **API Integration**: Add API calls to the Zustand store actions
3. **Data Persistence**: Replace local storage with database persistence
4. **User Management**: Implement proper user sessions and security

## 📱 Social Media Integration

### YouTube Integration
- Replace sample video IDs with your actual YouTube video IDs
- Consider implementing YouTube API for dynamic content loading

### Instagram Integration
- Update Instagram post URLs with your actual posts
- For production, consider using Instagram's official embed API

### Blog Integration
- The project links to `https://blooggerr.netlify.app/`
- Update all blog references to point to your actual blog

## 🎨 Design System

### Colors
- **Primary**: Blue color scheme for main actions
- **Secondary**: Purple color scheme for accents
- **Success**: Green for completed goals
- **Warning**: Yellow for medium priority
- **Error**: Red for high priority and overdue items

### Typography
- **Font**: Inter font family for clean, modern look
- **Headings**: Bold weights for hierarchy
- **Body**: Regular weights for readability

### Components
- **Glass Cards**: Translucent backgrounds with blur effects
- **Buttons**: Gradient backgrounds with hover effects
- **Forms**: Clean inputs with focus states
- **Icons**: Lucide React icons for consistency

## 🚀 Deployment

### Build for Production
```bash
npm run build
```

### Deploy to Netlify
1. Build the project
2. Deploy the `dist` folder to Netlify
3. Configure redirects for SPA routing

### Deploy to Vercel
1. Connect your repository to Vercel
2. It will automatically detect it's a Vite project
3. Deploy with default settings

## 📄 License

This project is licensed under the MIT License. See the LICENSE file for details.

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📞 Support

If you have any questions or need help with the project:

- Create an issue on GitHub
- Check the documentation
- Review the code comments for implementation details

## 🔄 Future Enhancements

- [ ] Real-time collaboration features
- [ ] Goal sharing and social features
- [ ] Mobile app version
- [ ] Advanced analytics and insights
- [ ] Integration with calendar apps
- [ ] Goal templates and recommendations
- [ ] Habit tracking integration
- [ ] Notification system
- [ ] Export/import functionality
- [ ] Advanced user profiles

---

**Built with ❤️ for goal achievers everywhere** 