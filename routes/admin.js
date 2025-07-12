const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const SwapRequest = require('../models/SwapRequest');
const auth = require('../middleware/auth');
const adminAuth = require('../middleware/adminAuth');

const router = express.Router();

// @route   GET /api/admin/stats
// @desc    Get platform statistics
// @access  Private (Admin only)
router.get('/stats', auth, adminAuth, async (req, res) => {
    try {
        // User statistics
        const totalUsers = await User.countDocuments();
        const publicUsers = await User.countDocuments({ isPublic: true });
        const verifiedUsers = await User.countDocuments({ isVerified: true });
        const adminUsers = await User.countDocuments({ isAdmin: true });

        // Swap statistics
        const totalSwaps = await SwapRequest.countDocuments();
        const pendingSwaps = await SwapRequest.countDocuments({ status: 'pending' });
        const acceptedSwaps = await SwapRequest.countDocuments({ status: 'accepted' });
        const completedSwaps = await SwapRequest.countDocuments({ status: 'completed' });
        const rejectedSwaps = await SwapRequest.countDocuments({ status: 'rejected' });
        const cancelledSwaps = await SwapRequest.countDocuments({ status: 'cancelled' });

        // Recent activity (last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

        const recentUsers = await User.countDocuments({ 
            createdAt: { $gte: thirtyDaysAgo } 
        });
        const recentSwaps = await SwapRequest.countDocuments({ 
            createdAt: { $gte: thirtyDaysAgo } 
        });

        // Top skills
        const topSkills = await User.aggregate([
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
            { $limit: 10 },
            {
                $project: {
                    _id: 0,
                    skill: '$_id',
                    count: 1
                }
            }
        ]);

        // Top rated users
        const topRatedUsers = await User.find({ 
            isPublic: true, 
            rating: { $gt: 0 },
            completedSwaps: { $gt: 0 }
        })
        .select('name email rating completedSwaps')
        .sort({ rating: -1, completedSwaps: -1 })
        .limit(10);

        // Monthly growth data
        const monthlyGrowth = await User.aggregate([
            {
                $group: {
                    _id: {
                        year: { $year: '$createdAt' },
                        month: { $month: '$createdAt' }
                    },
                    count: { $sum: 1 }
                }
            },
            { $sort: { '_id.year': 1, '_id.month': 1 } },
            { $limit: 12 }
        ]);

        res.json({
            success: true,
            stats: {
                users: {
                    total: totalUsers,
                    public: publicUsers,
                    verified: verifiedUsers,
                    admin: adminUsers,
                    recent: recentUsers
                },
                swaps: {
                    total: totalSwaps,
                    pending: pendingSwaps,
                    accepted: acceptedSwaps,
                    completed: completedSwaps,
                    rejected: rejectedSwaps,
                    cancelled: cancelledSwaps,
                    recent: recentSwaps
                },
                topSkills,
                topRatedUsers,
                monthlyGrowth
            }
        });
    } catch (error) {
        console.error('Admin stats error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error fetching admin statistics' 
        });
    }
});

// @route   GET /api/admin/users
// @desc    Get all users with admin details
// @access  Private (Admin only)
router.get('/users', auth, adminAuth, async (req, res) => {
    try {
        const { page = 1, limit = 20, search, status } = req.query;
        
        let query = {};
        
        if (search) {
            const searchRegex = new RegExp(search, 'i');
            query.$or = [
                { name: searchRegex },
                { email: searchRegex },
                { location: searchRegex }
            ];
        }
        
        if (status === 'verified') {
            query.isVerified = true;
        } else if (status === 'unverified') {
            query.isVerified = false;
        } else if (status === 'admin') {
            query.isAdmin = true;
        }
        
        const pageNumber = parseInt(page);
        const pageSize = parseInt(limit);
        const skip = (pageNumber - 1) * pageSize;
        
        const users = await User.find(query)
            .select('-password')
            .sort({ createdAt: -1 })
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
        console.error('Admin users fetch error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error fetching users' 
        });
    }
});

// @route   PUT /api/admin/users/:id/verify
// @desc    Verify/unverify user
// @access  Private (Admin only)
router.put('/users/:id/verify', auth, adminAuth, async (req, res) => {
    try {
        const { isVerified } = req.body;
        
        const user = await User.findByIdAndUpdate(
            req.params.id,
            { isVerified: Boolean(isVerified) },
            { new: true }
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
        console.error('User verification error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error updating user verification' 
        });
    }
});

// @route   PUT /api/admin/users/:id/admin
// @desc    Grant/revoke admin privileges
// @access  Private (Admin only)
router.put('/users/:id/admin', auth, adminAuth, async (req, res) => {
    try {
        const { isAdmin } = req.body;
        
        // Prevent removing admin privileges from yourself
        if (req.params.id === req.user.id && !isAdmin) {
            return res.status(400).json({ 
                success: false, 
                message: 'Cannot remove admin privileges from yourself' 
            });
        }
        
        const user = await User.findByIdAndUpdate(
            req.params.id,
            { isAdmin: Boolean(isAdmin) },
            { new: true }
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
        console.error('User admin update error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error updating user admin status' 
        });
    }
});

// @route   DELETE /api/admin/users/:id
// @desc    Delete user account
// @access  Private (Admin only)
router.delete('/users/:id', auth, adminAuth, async (req, res) => {
    try {
        // Prevent deleting yourself
        if (req.params.id === req.user.id) {
            return res.status(400).json({ 
                success: false, 
                message: 'Cannot delete your own account' 
            });
        }
        
        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ 
                success: false, 
                message: 'User not found' 
            });
        }

        // Delete associated swap requests
        await SwapRequest.deleteMany({
            $or: [
                { fromUser: req.params.id },
                { toUser: req.params.id }
            ]
        });

        // Delete user
        await User.findByIdAndDelete(req.params.id);

        res.json({
            success: true,
            message: 'User and associated data deleted successfully'
        });
    } catch (error) {
        console.error('User deletion error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error deleting user' 
        });
    }
});

// @route   GET /api/admin/swaps
// @desc    Get all swap requests with admin details
// @access  Private (Admin only)
router.get('/swaps', auth, adminAuth, async (req, res) => {
    try {
        const { page = 1, limit = 20, status, reported } = req.query;
        
        let query = {};
        
        if (status) {
            query.status = status;
        }
        
        if (reported === 'true') {
            query.isReported = true;
        }
        
        const pageNumber = parseInt(page);
        const pageSize = parseInt(limit);
        const skip = (pageNumber - 1) * pageSize;
        
        const swapRequests = await SwapRequest.find(query)
            .populate('fromUser', 'name email location')
            .populate('toUser', 'name email location')
            .populate('reportedBy', 'name email')
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
        console.error('Admin swaps fetch error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error fetching swap requests' 
        });
    }
});

// @route   DELETE /api/admin/swaps/:id
// @desc    Delete swap request
// @access  Private (Admin only)
router.delete('/swaps/:id', auth, adminAuth, async (req, res) => {
    try {
        const swapRequest = await SwapRequest.findByIdAndDelete(req.params.id);
        
        if (!swapRequest) {
            return res.status(404).json({ 
                success: false, 
                message: 'Swap request not found' 
            });
        }

        res.json({
            success: true,
            message: 'Swap request deleted successfully'
        });
    } catch (error) {
        console.error('Swap deletion error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error deleting swap request' 
        });
    }
});

// @route   POST /api/admin/announcements
// @desc    Send platform-wide announcement
// @access  Private (Admin only)
router.post('/announcements', auth, adminAuth, [
    body('title').trim().isLength({ min: 1, max: 200 }).withMessage('Title must be 1-200 characters'),
    body('message').trim().isLength({ min: 1, max: 2000 }).withMessage('Message must be 1-2000 characters'),
    body('type').optional().isIn(['info', 'warning', 'success', 'error']).withMessage('Invalid announcement type'),
], async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ 
                success: false, 
                errors: errors.array() 
            });
        }

        const { title, message, type = 'info' } = req.body;

        // In a real application, you would save this to a database
        // and potentially send email notifications or push notifications
        // For now, we'll just simulate the announcement
        
        console.log(`Admin ${req.user.id} sent announcement:`, { title, message, type });

        res.json({
            success: true,
            message: 'Announcement sent successfully',
            announcement: {
                title,
                message,
                type,
                sentBy: req.user.id,
                sentAt: new Date()
            }
        });
    } catch (error) {
        console.error('Announcement error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error sending announcement' 
        });
    }
});

// @route   GET /api/admin/export
// @desc    Export platform data
// @access  Private (Admin only)
router.get('/export', auth, adminAuth, async (req, res) => {
    try {
        const { type = 'all' } = req.query;
        
        let exportData = {};
        
        if (type === 'all' || type === 'users') {
            exportData.users = await User.find({}).select('-password');
        }
        
        if (type === 'all' || type === 'swaps') {
            exportData.swapRequests = await SwapRequest.find({})
                .populate('fromUser', 'name email')
                .populate('toUser', 'name email');
        }
        
        exportData.exportedAt = new Date();
        exportData.exportedBy = req.user.id;
        
        res.json({
            success: true,
            data: exportData
        });
    } catch (error) {
        console.error('Data export error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error exporting data' 
        });
    }
});

module.exports = router;