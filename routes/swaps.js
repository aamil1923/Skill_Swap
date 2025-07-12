const express = require('express');
const { body, validationResult } = require('express-validator');
const SwapRequest = require('../models/SwapRequest');
const User = require('../models/User');
const auth = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/swaps
// @desc    Get user's swap requests
// @access  Private
router.get('/', auth, async (req, res) => {
    try {
        const { status, page = 1, limit = 10 } = req.query;
        
        let query = {
            $or: [
                { fromUser: req.user.id },
                { toUser: req.user.id }
            ]
        };
        
        if (status) {
            query.status = status;
        }
        
        const pageNumber = parseInt(page);
        const pageSize = parseInt(limit);
        const skip = (pageNumber - 1) * pageSize;
        
        const swapRequests = await SwapRequest.find(query)
            .populate('fromUser', 'name email location rating')
            .populate('toUser', 'name email location rating')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(pageSize);
            
        const total = await SwapRequest.countDocuments(query);
        
        res.json({
            success: true,
            swapRequests,
            pagination: {
                current: pageNumber,
                pages: Math.ceil(total / pageSize),
                total,
                hasNext: pageNumber < Math.ceil(total / pageSize),
                hasPrev: pageNumber > 1
            }
        });
    } catch (error) {
        console.error('Swap requests fetch error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error fetching swap requests' 
        });
    }
});

// @route   POST /api/swaps
// @desc    Create swap request
// @access  Private
router.post('/', auth, [
    body('toUser').isMongoId().withMessage('Valid recipient user ID is required'),
    body('skillOffered').trim().isLength({ min: 1, max: 100 }).withMessage('Skill offered must be 1-100 characters'),
    body('skillWanted').trim().isLength({ min: 1, max: 100 }).withMessage('Skill wanted must be 1-100 characters'),
    body('message').optional().trim().isLength({ max: 1000 }).withMessage('Message cannot exceed 1000 characters'),
    body('duration').optional().isInt({ min: 1, max: 40 }).withMessage('Duration must be between 1-40 hours'),
    body('sessionFormat').optional().isIn(['online', 'offline', 'hybrid']).withMessage('Invalid session format'),
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ 
                success: false, 
                errors: errors.array() 
            });
        }

        const { toUser, skillOffered, skillWanted, message, duration, sessionFormat, priority } = req.body;

        // Check if recipient user exists and is public
        const recipient = await User.findById(toUser);
        if (!recipient) {
            return res.status(404).json({ 
                success: false, 
                message: 'Recipient user not found' 
            });
        }

        if (!recipient.isPublic) {
            return res.status(403).json({ 
                success: false, 
                message: 'Cannot send swap request to private user' 
            });
        }

        // Check if requesting user has the offered skill
        const requestingUser = await User.findById(req.user.id);
        if (!requestingUser.skillsOffered.includes(skillOffered)) {
            return res.status(400).json({ 
                success: false, 
                message: 'You must have the offered skill in your profile' 
            });
        }

        // Check for existing pending request between these users for same skills
        const existingRequest = await SwapRequest.findOne({
            fromUser: req.user.id,
            toUser,
            skillOffered,
            skillWanted,
            status: 'pending'
        });

        if (existingRequest) {
            return res.status(400).json({ 
                success: false, 
                message: 'A pending request for these skills already exists' 
            });
        }

        const swapRequest = await SwapRequest.create({
            fromUser: req.user.id,
            toUser,
            skillOffered,
            skillWanted,
            message: message || '',
            duration,
            sessionFormat: sessionFormat || 'online',
            priority: priority || 'medium'
        });

        const populatedRequest = await SwapRequest.findById(swapRequest._id)
            .populate('fromUser', 'name email location rating')
            .populate('toUser', 'name email location rating');

        res.status(201).json({
            success: true,
            swapRequest: populatedRequest
        });
    } catch (error) {
        console.error('Swap request creation error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error creating swap request' 
        });
    }
});

// @route   GET /api/swaps/:id
// @desc    Get specific swap request
// @access  Private
router.get('/:id', auth, async (req, res) => {
    try {
        const swapRequest = await SwapRequest.findById(req.params.id)
            .populate('fromUser', 'name email location rating skillsOffered')
            .populate('toUser', 'name email location rating skillsWanted');

        if (!swapRequest) {
            return res.status(404).json({ 
                success: false, 
                message: 'Swap request not found' 
            });
        }

        // Check if user is involved in this swap request
        if (!swapRequest.isUserInvolved(req.user.id)) {
            return res.status(403).json({ 
                success: false, 
                message: 'Access denied' 
            });
        }

        res.json({
            success: true,
            swapRequest
        });
    } catch (error) {
        console.error('Swap request fetch error:', error);
        if (error.name === 'CastError') {
            return res.status(400).json({ 
                success: false, 
                message: 'Invalid swap request ID' 
            });
        }
        res.status(500).json({ 
            success: false, 
            message: 'Server error fetching swap request' 
        });
    }
});

// @route   PUT /api/swaps/:id/accept
// @desc    Accept swap request
// @access  Private
router.put('/:id/accept', auth, async (req, res) => {
    try {
        const swapRequest = await SwapRequest.findById(req.params.id);

        if (!swapRequest) {
            return res.status(404).json({ 
                success: false, 
                message: 'Swap request not found' 
            });
        }

        if (!swapRequest.canAccept(req.user.id)) {
            return res.status(403).json({ 
                success: false, 
                message: 'Cannot accept this swap request' 
            });
        }

        swapRequest.status = 'accepted';
        await swapRequest.save();

        const populatedRequest = await SwapRequest.findById(swapRequest._id)
            .populate('fromUser', 'name email location rating')
            .populate('toUser', 'name email location rating');

        res.json({
            success: true,
            swapRequest: populatedRequest
        });
    } catch (error) {
        console.error('Swap accept error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error accepting swap request' 
        });
    }
});

// @route   PUT /api/swaps/:id/reject
// @desc    Reject swap request
// @access  Private
router.put('/:id/reject', auth, async (req, res) => {
    try {
        const swapRequest = await SwapRequest.findById(req.params.id);

        if (!swapRequest) {
            return res.status(404).json({ 
                success: false, 
                message: 'Swap request not found' 
            });
        }

        if (!swapRequest.canAccept(req.user.id)) {
            return res.status(403).json({ 
                success: false, 
                message: 'Cannot reject this swap request' 
            });
        }

        swapRequest.status = 'rejected';
        await swapRequest.save();

        const populatedRequest = await SwapRequest.findById(swapRequest._id)
            .populate('fromUser', 'name email location rating')
            .populate('toUser', 'name email location rating');

        res.json({
            success: true,
            swapRequest: populatedRequest
        });
    } catch (error) {
        console.error('Swap reject error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error rejecting swap request' 
        });
    }
});

// @route   PUT /api/swaps/:id/cancel
// @desc    Cancel swap request
// @access  Private
router.put('/:id/cancel', auth, [
    body('reason').optional().trim().isLength({ max: 500 }).withMessage('Reason cannot exceed 500 characters'),
], async (req, res) => {
    try {
        const swapRequest = await SwapRequest.findById(req.params.id);

        if (!swapRequest) {
            return res.status(404).json({ 
                success: false, 
                message: 'Swap request not found' 
            });
        }

        if (!swapRequest.canCancel(req.user.id)) {
            return res.status(403).json({ 
                success: false, 
                message: 'Cannot cancel this swap request' 
            });
        }

        swapRequest.status = 'cancelled';
        swapRequest.cancelledBy = req.user.id;
        swapRequest.cancelledAt = new Date();
        if (req.body.reason) {
            swapRequest.cancellationReason = req.body.reason;
        }
        await swapRequest.save();

        const populatedRequest = await SwapRequest.findById(swapRequest._id)
            .populate('fromUser', 'name email location rating')
            .populate('toUser', 'name email location rating');

        res.json({
            success: true,
            swapRequest: populatedRequest
        });
    } catch (error) {
        console.error('Swap cancel error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error cancelling swap request' 
        });
    }
});

// @route   PUT /api/swaps/:id/complete
// @desc    Mark swap as completed and add rating
// @access  Private
router.put('/:id/complete', auth, [
    body('rating').isInt({ min: 1, max: 5 }).withMessage('Rating must be between 1-5'),
    body('review').optional().trim().isLength({ max: 500 }).withMessage('Review cannot exceed 500 characters'),
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ 
                success: false, 
                errors: errors.array() 
            });
        }

        const { rating, review } = req.body;
        const swapRequest = await SwapRequest.findById(req.params.id);

        if (!swapRequest) {
            return res.status(404).json({ 
                success: false, 
                message: 'Swap request not found' 
            });
        }

        if (!swapRequest.isUserInvolved(req.user.id)) {
            return res.status(403).json({ 
                success: false, 
                message: 'Access denied' 
            });
        }

        if (swapRequest.status !== 'accepted') {
            return res.status(400).json({ 
                success: false, 
                message: 'Can only complete accepted swap requests' 
            });
        }

        // Initialize rating object if it doesn't exist
        if (!swapRequest.rating) {
            swapRequest.rating = {};
        }

        // Add rating based on who is rating
        if (swapRequest.fromUser.toString() === req.user.id) {
            swapRequest.rating.fromUserRating = rating;
            if (review) swapRequest.rating.fromUserReview = review;
        } else {
            swapRequest.rating.toUserRating = rating;
            if (review) swapRequest.rating.toUserReview = review;
        }

        // If both users have rated, mark as completed and update user ratings
        if (swapRequest.rating.fromUserRating && swapRequest.rating.toUserRating) {
            swapRequest.status = 'completed';
            swapRequest.completedAt = new Date();

            // Update user ratings and completed swaps count
            const fromUser = await User.findById(swapRequest.fromUser);
            const toUser = await User.findById(swapRequest.toUser);

            if (fromUser) {
                fromUser.completedSwaps += 1;
                // Update rating calculation (simplified)
                const newRating = ((fromUser.rating * (fromUser.completedSwaps - 1)) + swapRequest.rating.toUserRating) / fromUser.completedSwaps;
                fromUser.rating = Math.round(newRating * 10) / 10;
                await fromUser.save();
            }

            if (toUser) {
                toUser.completedSwaps += 1;
                // Update rating calculation (simplified)
                const newRating = ((toUser.rating * (toUser.completedSwaps - 1)) + swapRequest.rating.fromUserRating) / toUser.completedSwaps;
                toUser.rating = Math.round(newRating * 10) / 10;
                await toUser.save();
            }
        }

        await swapRequest.save();

        const populatedRequest = await SwapRequest.findById(swapRequest._id)
            .populate('fromUser', 'name email location rating')
            .populate('toUser', 'name email location rating');

        res.json({
            success: true,
            swapRequest: populatedRequest
        });
    } catch (error) {
        console.error('Swap complete error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error completing swap request' 
        });
    }
});

// @route   GET /api/swaps/stats/user
// @desc    Get user's swap statistics
// @access  Private
router.get('/stats/user', auth, async (req, res) => {
    try {
        const stats = await SwapRequest.getUserStats(req.user.id);
        
        const formattedStats = {
            total: 0,
            pending: 0,
            accepted: 0,
            completed: 0,
            rejected: 0,
            cancelled: 0
        };

        stats.forEach(stat => {
            formattedStats[stat._id] = stat.count;
            formattedStats.total += stat.count;
        });

        res.json({
            success: true,
            stats: formattedStats
        });
    } catch (error) {
        console.error('User swap stats error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error fetching swap statistics' 
        });
    }
});

module.exports = router;