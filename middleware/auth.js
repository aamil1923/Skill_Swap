const jwt = require('jsonwebtoken');
const User = require('../models/User');

const auth = async (req, res, next) => {
    try {
        // Get token from header
        const token = req.header('x-auth-token') || 
                     req.header('Authorization')?.replace('Bearer ', '') ||
                     req.cookies?.token;

        // Check if no token
        if (!token) {
            return res.status(401).json({ 
                success: false, 
                message: 'No token, authorization denied' 
            });
        }

        try {
            // Verify token
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            
            // Get user from token
            const user = await User.findById(decoded.id).select('-password');
            
            if (!user) {
                return res.status(401).json({ 
                    success: false, 
                    message: 'Token is not valid' 
                });
            }

            // Add user to request object
            req.user = {
                id: user._id.toString(),
                name: user.name,
                email: user.email,
                isAdmin: user.isAdmin,
                isVerified: user.isVerified
            };
            
            next();
        } catch (err) {
            return res.status(401).json({ 
                success: false, 
                message: 'Token is not valid' 
            });
        }
    } catch (error) {
        console.error('Auth middleware error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error in authentication' 
        });
    }
};

module.exports = auth;