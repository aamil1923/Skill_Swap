const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const User = require('../models/User');
const SwapRequest = require('../models/SwapRequest');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/skillhub';

// Sample users data
const sampleUsers = [
    {
        name: 'John Doe',
        email: 'john@skillhub.com',
        password: 'password123',
        location: 'Mumbai, Maharashtra, India',
        availability: 'weekends',
        isPublic: true,
        skillsOffered: ['JavaScript', 'React', 'Node.js', 'UI/UX Design'],
        skillsWanted: ['Python', 'Machine Learning', 'Data Science', 'DevOps'],
        isAdmin: true,
        rating: 4.8,
        completedSwaps: 12,
        bio: 'Full-stack developer with 5+ years of experience. Love teaching and learning new technologies.',
        linkedinProfile: 'https://linkedin.com/in/johndoe',
        githubProfile: 'https://github.com/johndoe',
        isVerified: true
    },
    {
        name: 'Sarah Chen',
        email: 'sarah@skillhub.com',
        password: 'password123',
        location: 'Delhi, India',
        availability: 'evenings',
        isPublic: true,
        skillsOffered: ['Python', 'Data Science', 'Machine Learning', 'Statistics'],
        skillsWanted: ['JavaScript', 'Web Development', 'React', 'Frontend'],
        isAdmin: false,
        rating: 4.9,
        completedSwaps: 18,
        bio: 'Data scientist passionate about AI and machine learning. Always excited to share knowledge.',
        linkedinProfile: 'https://linkedin.com/in/sarahchen',
        githubProfile: 'https://github.com/sarahchen',
        isVerified: true
    },
    {
        name: 'Mike Johnson',
        email: 'mike@skillhub.com',
        password: 'password123',
        location: 'Bangalore, India',
        availability: 'flexible',
        isPublic: true,
        skillsOffered: ['Photoshop', 'UI/UX Design', 'Figma', 'Branding'],
        skillsWanted: ['Marketing', 'SEO', 'Content Writing', 'Social Media'],
        isAdmin: false,
        rating: 4.7,
        completedSwaps: 8,
        bio: 'Creative designer with a passion for user experience and visual storytelling.',
        portfolio: 'https://mikejohnson.design',
        isVerified: true
    },
    {
        name: 'Priya Sharma',
        email: 'priya@skillhub.com',
        password: 'password123',
        location: 'Chennai, India',
        availability: 'weekdays',
        isPublic: true,
        skillsOffered: ['Digital Marketing', 'SEO', 'Content Strategy', 'Analytics'],
        skillsWanted: ['Graphic Design', 'Video Editing', 'Photography'],
        isAdmin: false,
        rating: 4.6,
        completedSwaps: 15,
        bio: 'Digital marketing specialist helping businesses grow their online presence.',
        linkedinProfile: 'https://linkedin.com/in/priyasharma',
        isVerified: true
    },
    {
        name: 'Alex Rodriguez',
        email: 'alex@skillhub.com',
        password: 'password123',
        location: 'Pune, India',
        availability: 'evenings',
        isPublic: true,
        skillsOffered: ['DevOps', 'AWS', 'Docker', 'Kubernetes'],
        skillsWanted: ['Mobile Development', 'Flutter', 'iOS Development'],
        isAdmin: false,
        rating: 4.8,
        completedSwaps: 10,
        bio: 'DevOps engineer with expertise in cloud technologies and automation.',
        githubProfile: 'https://github.com/alexrodriguez',
        isVerified: true
    },
    {
        name: 'Emma Wilson',
        email: 'emma@skillhub.com',
        password: 'password123',
        location: 'Hyderabad, India',
        availability: 'flexible',
        isPublic: true,
        skillsOffered: ['Content Writing', 'Copywriting', 'Blog Writing', 'Social Media'],
        skillsWanted: ['Web Development', 'WordPress', 'SEO'],
        isAdmin: false,
        rating: 4.5,
        completedSwaps: 6,
        bio: 'Content writer and copywriter helping brands tell their stories effectively.',
        portfolio: 'https://emmawilson.writer',
        isVerified: false
    },
    {
        name: 'Demo User',
        email: 'demo@skillhub.com',
        password: 'demo123',
        location: 'Demo City, Demo Country',
        availability: 'flexible',
        isPublic: true,
        skillsOffered: ['JavaScript', 'React', 'Node.js'],
        skillsWanted: ['Python', 'Machine Learning'],
        isAdmin: false,
        rating: 4.0,
        completedSwaps: 3,
        bio: 'Demo user for testing the platform.',
        isVerified: false
    }
];

// Sample swap requests data (will be created after users)
const createSampleSwapRequests = async (users) => {
    const sampleSwapRequests = [
        {
            fromUser: users[1]._id, // Sarah
            toUser: users[0]._id,   // John
            skillOffered: 'Python',
            skillWanted: 'JavaScript',
            message: 'Hi John! I\'d love to learn JavaScript from you. I have extensive Python experience and can help you with data science concepts.',
            status: 'pending'
        },
        {
            fromUser: users[2]._id, // Mike
            toUser: users[0]._id,   // John
            skillOffered: 'UI/UX Design',
            skillWanted: 'React',
            message: 'Hey! I saw your React skills and would love to learn. I can help you with advanced UI/UX design principles in return.',
            status: 'accepted'
        },
        {
            fromUser: users[0]._id, // John
            toUser: users[4]._id,   // Alex
            skillOffered: 'JavaScript',
            skillWanted: 'DevOps',
            message: 'I\'m interested in learning DevOps and AWS. Can teach you modern JavaScript and React in return.',
            status: 'completed',
            rating: {
                fromUserRating: 5,
                toUserRating: 5,
                fromUserReview: 'Excellent teacher! Very patient and knowledgeable.',
                toUserReview: 'Great student, picked up concepts quickly.'
            }
        },
        {
            fromUser: users[3]._id, // Priya
            toUser: users[2]._id,   // Mike
            skillOffered: 'Digital Marketing',
            skillWanted: 'Graphic Design',
            message: 'Would love to learn graphic design from you. I can teach you effective digital marketing strategies.',
            status: 'accepted'
        },
        {
            fromUser: users[5]._id, // Emma
            toUser: users[1]._id,   // Sarah
            skillOffered: 'Content Writing',
            skillWanted: 'Data Science',
            message: 'Hi Sarah! I\'m fascinated by data science and would love to learn the basics. I can help you improve your technical writing skills.',
            status: 'pending'
        }
    ];

    return await SwapRequest.insertMany(sampleSwapRequests);
};

const initializeDatabase = async () => {
    try {
        console.log('Connecting to MongoDB...');
        await mongoose.connect(MONGODB_URI);
        console.log('Connected to MongoDB successfully!');

        // Clear existing data
        console.log('Clearing existing data...');
        await User.deleteMany({});
        await SwapRequest.deleteMany({});
        console.log('Existing data cleared.');

        // Create users
        console.log('Creating sample users...');
        const users = await User.insertMany(sampleUsers);
        console.log(`Created ${users.length} users successfully!`);

        // Create swap requests
        console.log('Creating sample swap requests...');
        const swapRequests = await createSampleSwapRequests(users);
        console.log(`Created ${swapRequests.length} swap requests successfully!`);

        console.log('\n=== Database Initialization Complete ===');
        console.log('\nSample Login Credentials:');
        console.log('Admin User:');
        console.log('  Email: john@skillhub.com');
        console.log('  Password: password123');
        console.log('\nRegular User:');
        console.log('  Email: sarah@skillhub.com');
        console.log('  Password: password123');
        console.log('\nDemo User:');
        console.log('  Email: demo@skillhub.com');
        console.log('  Password: demo123');
        console.log('\nAll users have the same password: password123');
        
        process.exit(0);
    } catch (error) {
        console.error('Database initialization error:', error);
        process.exit(1);
    }
};

// Run initialization
initializeDatabase();