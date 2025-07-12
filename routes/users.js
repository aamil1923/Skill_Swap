const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/users
// @desc    Get all public users
// @access  Public
router.get('/', async (req, res) => {
    try {
        const { search, skill, location, availability, page = 1, limit = 10 } = req.query;
        
        let query = { isPublic: true };
        
        // Search functionality
        if (search) {
            const searchRegex = new RegExp(search, 'i');
            query.$or = [
                { name: searchRegex },
                { location: searchRegex },
                { skillsOffered: { $elemMatch: { $regex: searchRegex } } },
                { skillsWanted: { $elemMatch: { $regex: searchRegex } } },
                { bio: searchRegex }
            ];
        }
        
        // Filter by specific skill
        if (skill) {
            const skillRegex = new RegExp(skill, 'i');
            query.$or = [
                { skillsOffered: { $elemMatch: { $regex: skillRegex } } },
                { skillsWanted: { $elemMatch: { $regex: skillRegex } } }
            ];
        }
        
        // Filter by location
        if (location) {
            query.location = new RegExp(location, 'i');
        }
        
        // Filter by availability
        if (availability) {
            query.availability = availability;
        }
        
        const pageNumber = parseInt(page);
        const pageSize = parseInt(limit);
        const skip = (pageNumber - 1) * pageSize;
        
        const users = await User.find(query)
            .select('-password')
            .sort({ rating: -1, completedSwaps: -1 })
            .skip(skip)
            .limit(pageSize);
            
        const total = await User.countDocuments(query);
        
        res.json({
            success: true,
            users,
            pagination: {
                current: pageNumber,
                pages: Math.ceil(total / pageSize),
                total,
                hasNext: pageNumber < Math.ceil(total / pageSize),
                hasPrev: pageNumber > 1
            }
        });
    } catch (error) {
        console.error('Users fetch error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error fetching users' 
        });
    }
});

// @route   GET /api/users/:id
// @desc    Get user by ID
// @access  Public
router.get('/:id', async (req, res) => {
    try {
        const user = await User.findById(req.params.id).select('-password');
        
        if (!user) {
            return res.status(404).json({ 
                success: false, 
                message: 'User not found' 
            });
        }
        
        // Only return full profile if user is public or requesting own profile
        if (!user.isPublic && (!req.user || req.user.id !== user._id.toString())) {
            return res.status(403).json({ 
                success: false, 
                message: 'User profile is private' 
            });
        }
        
        res.json({
            success: true,
            user
        });
    } catch (error) {
        console.error('User fetch error:', error);
        if (error.name === 'CastError') {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid user ID' 
            });
        }
        res.status(500).json({ 
            success: false, 
            message: 'Server error fetching user' 
        });
    }
});

// @route   PUT /api/users/profile
// @desc    Update user profile
// @access  Private
router.put('/profile', auth, [
    body('name').optional().trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
    body('location').optional().trim().isLength({ max: 200 }).withMessage('Location cannot exceed 200 characters'),
    body('bio').optional().trim().isLength({ max: 500 }).withMessage('Bio cannot exceed 500 characters'),
    body('availability').optional().isIn(['weekdays', 'weekends', 'evenings', 'flexible']).withMessage('Invalid availability option'),
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ 
                success: false, 
                errors: errors.array() 
            });
        }

        const updateFields = {};
        const allowedFields = ['name', 'location', 'bio', 'availability', 'isPublic', 'linkedinProfile', 'githubProfile', 'portfolio'];
        
        allowedFields.forEach(field => {
            if (req.body[field] !== undefined) {
                updateFields[field] = req.body[field];
            }
        });

        const user = await User.findByIdAndUpdate(
            req.user.id,
            updateFields,
            { new: true, runValidators: true }
        ).select('-password');

        if (!user) {
            return res.status(404).json({ 
                success: false, 
                message: 'User not found' 
            });
        }

        res.json({
            success: true,
            user
        });
    } catch (error) {
        console.error('Profile update error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error updating profile' 
        });
    }
});

// @route   PUT /api/users/skills
// @desc    Update user skills
// @access  Private
router.put('/skills', auth, [
    body('skillsOffered').optional().isArray().withMessage('Skills offered must be an array'),
    body('skillsOffered.*').optional().trim().isLength({ min: 1, max: 50 }).withMessage('Each skill must be 1-50 characters'),
    body('skillsWanted').optional().isArray().withMessage('Skills wanted must be an array'),
    body('skillsWanted.*').optional().trim().isLength({ min: 1, max: 50 }).withMessage('Each skill must be 1-50 characters'),
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ 
                success: false, 
                errors: errors.array() 
            });
        }

        const { skillsOffered, skillsWanted } = req.body;
        const updateFields = {};

        if (skillsOffered !== undefined) {
            updateFields.skillsOffered = skillsOffered.filter(skill => skill.trim().length > 0);
        }
        
        if (skillsWanted !== undefined) {
            updateFields.skillsWanted = skillsWanted.filter(skill => skill.trim().length > 0);
        }

        const user = await User.findByIdAndUpdate(
            req.user.id,
            updateFields,
            { new: true, runValidators: true }
        ).select('-password');

        if (!user) {
            return res.status(404).json({ 
                success: false, 
                message: 'User not found' 
            });
        }

        res.json({
            success: true,
            user
        });
    } catch (error) {
        console.error('Skills update error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error updating skills' 
        });
    }
});

// @route   GET /api/users/skills/popular
// @desc    Get most popular skills
// @access  Public
router.get('/skills/popular', async (req, res) => {
    try {
        const { limit = 20 } = req.query;
        
        const skillsAggregation = await User.aggregate([
            { $match: { isPublic: true } },
            {
                $project: {
                    skills: { $concatArrays: ['$skillsOffered', '$skillsWanted'] }
                }
            },
            { $unwind: '$skills' },
            {
                $group: {
                    _id: '$skills',
                    count: { $sum: 1 }
                }
            },
            { $sort: { count: -1 } },
            { $limit: parseInt(limit) },
            {
                $project: {
                    _id: 0,
                    skill: '$_id',
                    count: 1
                }
            }
        ]);

        res.json({
            success: true,
            skills: skillsAggregation
        });
    } catch (error) {
        console.error('Popular skills fetch error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error fetching popular skills' 
        });
    }
});

// @route   GET /api/users/stats
// @desc    Get user statistics
// @access  Public
router.get('/stats/platform', async (req, res) => {
    try {
        const totalUsers = await User.countDocuments();
        const publicUsers = await User.countDocuments({ isPublic: true });
        const verifiedUsers = await User.countDocuments({ isVerified: true });
        
        // Get users by availability
        const availabilityStats = await User.aggregate([
            {
                $group: {
                    _id: '$availability',
                    count: { $sum: 1 }
                }
            }
        ]);

        // Get top rated users
        const topRatedUsers = await User.find({ isPublic: true, rating: { $gt: 0 } })
            .select('name rating completedSwaps')
            .sort({ rating: -1, completedSwaps: -1 })
            .limit(5);

        res.json({
            success: true,
            stats: {
                totalUsers,
                publicUsers,
                verifiedUsers,
                availabilityBreakdown: availabilityStats,
                topRatedUsers
            }
        });
    } catch (error) {
        console.error('Platform stats error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error fetching platform statistics' 
        });
    }
});

module.exports = router;