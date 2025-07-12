# SkillHub - Professional Skill Exchange Platform

A modern web platform that connects professionals for skill exchange and collaborative learning.

## 🚀 Features

- **User Registration & Authentication**: Secure user accounts with JWT authentication
- **Profile Management**: Comprehensive user profiles with skills, availability, and ratings
- **Skill Exchange System**: Request and manage skill swaps with other users
- **Search & Discovery**: Find users by skills, location, and availability
- **Rating & Reviews**: Rate completed skill exchanges and build reputation
- **Admin Dashboard**: Platform management with analytics and user administration
- **Responsive Design**: Works seamlessly on desktop and mobile devices

## 🛠 Technology Stack

### Frontend
- **HTML5**: Semantic markup
- **CSS3**: Modern styling with CSS variables and Flexbox/Grid
- **Vanilla JavaScript**: Pure JS for client-side functionality
- **LocalStorage**: Client-side data persistence

### Backend
- **Node.js**: JavaScript runtime
- **Express.js**: Web application framework
- **MongoDB**: NoSQL database
- **Mongoose**: MongoDB object modeling
- **JWT**: JSON Web Tokens for authentication
- **bcryptjs**: Password hashing
- **Express Validator**: Input validation

### Security
- **Helmet**: Security headers
- **Rate Limiting**: API request limiting
- **CORS**: Cross-origin resource sharing
- **Input Validation**: Server-side validation

## 📁 Project Structure

```
skillhub-platform/
├── index.html              # Main HTML file
├── styles.css              # CSS stylesheet
├── script.js               # Frontend JavaScript
├── database.js             # Client-side database layer
├── server.js               # Express server
├── package.json            # Node.js dependencies
├── .env                    # Environment variables
├── models/                 # Database models
│   ├── User.js            
│   └── SwapRequest.js     
├── routes/                 # API routes
│   ├── auth.js            
│   ├── users.js           
│   ├── swaps.js           
│   └── admin.js           
├── middleware/             # Custom middleware
│   ├── auth.js            
│   └── adminAuth.js       
└── scripts/               # Utility scripts
    └── init-database.js   
```

## 🚀 Quick Start

### Prerequisites
- Node.js (v14 or higher)
- MongoDB (v4.4 or higher)
- npm or yarn

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd skillhub-platform
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Setup environment variables**
   ```bash
   cp .env.example .env
   ```
   Edit `.env` with your configuration:
   ```env
   MONGODB_URI=mongodb://localhost:27017/skillhub
   JWT_SECRET=your-super-secret-jwt-key
   JWT_EXPIRE=7d
   PORT=3000
   NODE_ENV=development
   ```

4. **Start MongoDB**
   ```bash
   # On macOS with Homebrew
   brew services start mongodb-community

   # On Ubuntu
   sudo systemctl start mongod

   # On Windows
   net start MongoDB
   ```

5. **Initialize the database with sample data**
   ```bash
   npm run init-db
   ```

6. **Start the development server**
   ```bash
   npm run dev
   ```

7. **Open your browser**
   Navigate to `http://localhost:3000`

### Sample Login Credentials

After running the database initialization, you can use these credentials:

**Admin User:**
- Email: `john@skillhub.com`
- Password: `password123`

**Regular User:**
- Email: `sarah@skillhub.com`
- Password: `password123`

**Demo User:**
- Email: `demo@skillhub.com`
- Password: `demo123`

## 📖 API Documentation

### Authentication Endpoints

- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - User login
- `GET /api/auth/me` - Get current user
- `POST /api/auth/demo-login` - Demo login

### User Endpoints

- `GET /api/users` - Get all public users
- `GET /api/users/:id` - Get user by ID
- `PUT /api/users/profile` - Update user profile
- `PUT /api/users/skills` - Update user skills
- `GET /api/users/skills/popular` - Get popular skills
- `GET /api/users/stats/platform` - Get platform statistics

### Swap Request Endpoints

- `GET /api/swaps` - Get user's swap requests
- `POST /api/swaps` - Create swap request
- `GET /api/swaps/:id` - Get specific swap request
- `PUT /api/swaps/:id/accept` - Accept swap request
- `PUT /api/swaps/:id/reject` - Reject swap request
- `PUT /api/swaps/:id/cancel` - Cancel swap request
- `PUT /api/swaps/:id/complete` - Complete swap and rate
- `GET /api/swaps/stats/user` - Get user's swap statistics

### Admin Endpoints (Admin only)

- `GET /api/admin/stats` - Get platform statistics
- `GET /api/admin/users` - Get all users
- `PUT /api/admin/users/:id/verify` - Verify/unverify user
- `PUT /api/admin/users/:id/admin` - Grant/revoke admin
- `DELETE /api/admin/users/:id` - Delete user
- `GET /api/admin/swaps` - Get all swap requests
- `DELETE /api/admin/swaps/:id` - Delete swap request
- `POST /api/admin/announcements` - Send announcements
- `GET /api/admin/export` - Export platform data

## 🔧 Development

### Available Scripts

- `npm start` - Start production server
- `npm run dev` - Start development server with nodemon
- `npm run init-db` - Initialize database with sample data

### Environment Variables

```env
# Database
MONGODB_URI=mongodb://localhost:27017/skillhub

# JWT
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRE=7d

# Server
PORT=3000
NODE_ENV=development

# Admin
ADMIN_EMAIL=admin@skillhub.com
ADMIN_PASSWORD=admin123
```

## 🎨 Frontend Features

### Client-Side Database Layer
The application includes a sophisticated client-side database layer (`database.js`) that:
- Uses localStorage for data persistence
- Provides CRUD operations for users and swap requests
- Includes search and filtering capabilities
- Handles data export/import functionality

### Responsive Design
- Mobile-first approach
- Flexible grid layouts
- Touch-friendly interfaces
- Optimized for various screen sizes

### Interactive Components
- Modal dialogs for swap requests
- Real-time search and filtering
- Dynamic skill tags
- Notification system

## 🔒 Security Features

- Password hashing with bcrypt
- JWT token authentication
- Input validation and sanitization
- Rate limiting on API endpoints
- CORS protection
- Security headers with Helmet
- Admin-only routes protection

## 📊 Database Schema

### User Model
```javascript
{
  name: String,
  email: String (unique),
  password: String (hashed),
  location: String,
  availability: Enum,
  isPublic: Boolean,
  skillsOffered: [String],
  skillsWanted: [String],
  isAdmin: Boolean,
  rating: Number,
  completedSwaps: Number,
  // ... additional fields
}
```

### SwapRequest Model
```javascript
{
  fromUser: ObjectId,
  toUser: ObjectId,
  skillOffered: String,
  skillWanted: String,
  message: String,
  status: Enum,
  rating: {
    fromUserRating: Number,
    toUserRating: Number,
    fromUserReview: String,
    toUserReview: String
  },
  // ... additional fields
}
```

## 🚀 Deployment

### Production Setup

1. **Environment Configuration**
   ```env
   NODE_ENV=production
   MONGODB_URI=mongodb://your-production-db-url
   JWT_SECRET=your-super-secure-production-secret
   ```

2. **Build Optimization**
   - Minify CSS and JavaScript
   - Optimize images
   - Enable gzip compression

3. **Security Considerations**
   - Use HTTPS in production
   - Set secure JWT secrets
   - Configure proper CORS origins
   - Enable rate limiting
   - Regular security updates

### Deployment Options

- **Heroku**: Easy deployment with MongoDB Atlas
- **DigitalOcean**: VPS with PM2 process manager
- **AWS**: EC2 with RDS or DocumentDB
- **Vercel/Netlify**: Frontend deployment (static version)

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Commit your changes
4. Push to the branch
5. Create a Pull Request

## 📝 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the documentation

## 🔮 Future Enhancements

- Real-time messaging system
- Video call integration
- Mobile app development
- AI-powered skill matching
- Payment integration for premium features
- Multi-language support
- Advanced analytics dashboard

## 📈 Performance

- Optimized database queries with indexing
- Efficient pagination for large datasets
- Client-side caching for better UX
- Image optimization and lazy loading
- Minified assets for faster loading

---
Video recording of the final output : 
[skill_swap-recording.zip](https://github.com/user-attachments/files/21195806/skill_swap-recording.zip)
