const express = require('express');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');

const router = express.Router();

// Generate JWT token
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET, {
        expiresIn: process.env.JWT_EXPIRE,
    });
};

// @route   POST /api/auth/register
// @desc    Register user
// @access  Public
router.post('/register', [
    body('name').trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
    body('email').isEmail().normalizeEmail().withMessage('Please enter a valid email'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ 
                success: false, 
                errors: errors.array() 
            });
        }

        const { name, email, password, location } = req.body;

        // Check if user already exists
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(400).json({ 
                success: false, 
                message: 'User already exists with this email' 
            });
        }

        // Create user
        const user = await User.create({
            name,
            email,
            password,
            location: location || '',
            skillsOffered: [],
            skillsWanted: []
        });

        // Generate token
        const token = generateToken(user._id);

        res.status(201).json({
            success: true,
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                location: user.location,
                availability: user.availability,
                isPublic: user.isPublic,
                skillsOffered: user.skillsOffered,
                skillsWanted: user.skillsWanted,
                isAdmin: user.isAdmin,
                rating: user.rating,
                completedSwaps: user.completedSwaps
            }
        });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error during registration' 
        });
    }
});

// @route   POST /api/auth/login
// @desc    Login user
// @access  Public
router.post('/login', [
    body('email').isEmail().normalizeEmail().withMessage('Please enter a valid email'),
    body('password').notEmpty().withMessage('Password is required'),
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ 
                success: false, 
                errors: errors.array() 
            });
        }

        const { email, password } = req.body;

        // Check if user exists and get password
        const user = await User.findOne({ email }).select('+password');
        if (!user) {
            return res.status(401).json({ 
                success: false, 
                message: 'Invalid credentials' 
            });
        }

        // Check password
        const isPasswordCorrect = await user.comparePassword(password);
        if (!isPasswordCorrect) {
            return res.status(401).json({ 
                success: false, 
                message: 'Invalid credentials' 
            });
        }

        // Update last active
        user.lastActive = new Date();
        await user.save();

        // Generate token
        const token = generateToken(user._id);

        res.json({
            success: true,
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                location: user.location,
                availability: user.availability,
                isPublic: user.isPublic,
                skillsOffered: user.skillsOffered,
                skillsWanted: user.skillsWanted,
                isAdmin: user.isAdmin,
                rating: user.rating,
                completedSwaps: user.completedSwaps
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error during login' 
        });
    }
});

// @route   GET /api/auth/me
// @desc    Get current user
// @access  Private
router.get('/me', async (req, res) => {
    try {
        const token = req.header('x-auth-token') || req.header('Authorization')?.replace('Bearer ', '');
        
        if (!token) {
            return res.status(401).json({ 
                success: false, 
                message: 'No token, authorization denied' 
            });
        }

        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);

        if (!user) {
            return res.status(401).json({ 
                success: false, 
                message: 'Token is not valid' 
            });
        }

        res.json({
            success: true,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                location: user.location,
                availability: user.availability,
                isPublic: user.isPublic,
                skillsOffered: user.skillsOffered,
                skillsWanted: user.skillsWanted,
                isAdmin: user.isAdmin,
                rating: user.rating,
                completedSwaps: user.completedSwaps,
                bio: user.bio,
                linkedinProfile: user.linkedinProfile,
                githubProfile: user.githubProfile,
                portfolio: user.portfolio
            }
        });
    } catch (error) {
        console.error('Auth verification error:', error);
        res.status(401).json({ 
            success: false, 
            message: 'Token is not valid' 
        });
    }
});

// @route   POST /api/auth/demo-login
// @desc    Demo login (for testing)
// @access  Public
router.post('/demo-login', async (req, res) => {
    try {
        // Find or create a demo user
        let user = await User.findOne({ email: 'demo@skillhub.com' });
        
        if (!user) {
            user = await User.create({
                name: 'Demo User',
                email: 'demo@skillhub.com',
                password: 'demo123',
                location: 'Demo City, Demo Country',
                skillsOffered: ['JavaScript', 'React', 'Node.js'],
                skillsWanted: ['Python', 'Machine Learning'],
                isAdmin: false
            });
        }

        const token = generateToken(user._id);

        res.json({
            success: true,
            token,
            user: {
                id: user._id,
                name: user.name,
                email: user.email,
                location: user.location,
                availability: user.availability,
                isPublic: user.isPublic,
                skillsOffered: user.skillsOffered,
                skillsWanted: user.skillsWanted,
                isAdmin: user.isAdmin,
                rating: user.rating,
                completedSwaps: user.completedSwaps
            }
        });
    } catch (error) {
        console.error('Demo login error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error during demo login' 
        });
    }
});

module.exports = router;