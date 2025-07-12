const adminAuth = (req, res, next) => {
    try {
        // Check if user is authenticated (should be done by auth middleware first)
        if (!req.user) {
            return res.status(401).json({ 
                success: false, 
                message: 'Access denied. No user found.' 
            });
        }

        // Check if user is admin
        if (!req.user.isAdmin) {
            return res.status(403).json({ 
                success: false, 
                message: 'Access denied. Admin privileges required.' 
            });
        }

        next();
    } catch (error) {
        console.error('Admin auth middleware error:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Server error in admin authentication' 
        });
    }
};

module.exports = adminAuth;