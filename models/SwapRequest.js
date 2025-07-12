const mongoose = require('mongoose');

const swapRequestSchema = new mongoose.Schema({
    fromUser: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'From user is required']
    },
    toUser: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'To user is required']
    },
    skillOffered: {
        type: String,
        required: [true, 'Skill offered is required'],
        trim: true,
        maxlength: [100, 'Skill offered cannot exceed 100 characters']
    },
    skillWanted: {
        type: String,
        required: [true, 'Skill wanted is required'],
        trim: true,
        maxlength: [100, 'Skill wanted cannot exceed 100 characters']
    },
    message: {
        type: String,
        trim: true,
        maxlength: [1000, 'Message cannot exceed 1000 characters']
    },
    status: {
        type: String,
        enum: ['pending', 'accepted', 'rejected', 'completed', 'cancelled'],
        default: 'pending'
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high'],
        default: 'medium'
    },
    scheduledDate: {
        type: Date
    },
    duration: {
        type: Number, // in hours
        min: 1,
        max: 40
    },
    sessionFormat: {
        type: String,
        enum: ['online', 'offline', 'hybrid'],
        default: 'online'
    },
    meetingLink: {
        type: String,
        trim: true
    },
    notes: {
        type: String,
        maxlength: [2000, 'Notes cannot exceed 2000 characters']
    },
    rating: {
        fromUserRating: {
            type: Number,
            min: 1,
            max: 5
        },
        toUserRating: {
            type: Number,
            min: 1,
            max: 5
        },
        fromUserReview: {
            type: String,
            maxlength: [500, 'Review cannot exceed 500 characters']
        },
        toUserReview: {
            type: String,
            maxlength: [500, 'Review cannot exceed 500 characters']
        }
    },
    completedAt: {
        type: Date
    },
    cancelledAt: {
        type: Date
    },
    cancelledBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    cancellationReason: {
        type: String,
        maxlength: [500, 'Cancellation reason cannot exceed 500 characters']
    },
    isReported: {
        type: Boolean,
        default: false
    },
    reportReason: {
        type: String
    },
    reportedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    reportedAt: {
        type: Date
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual for swap request ID
swapRequestSchema.virtual('id').get(function() {
    return this._id.toHexString();
});

// Indexes for better performance
swapRequestSchema.index({ fromUser: 1, status: 1 });
swapRequestSchema.index({ toUser: 1, status: 1 });
swapRequestSchema.index({ status: 1 });
swapRequestSchema.index({ createdAt: -1 });
swapRequestSchema.index({ scheduledDate: 1 });

// Compound index for user swap queries
swapRequestSchema.index({ 
    $or: [{ fromUser: 1 }, { toUser: 1 }],
    status: 1 
});

// Middleware to validate that fromUser and toUser are different
swapRequestSchema.pre('save', function(next) {
    if (this.fromUser.toString() === this.toUser.toString()) {
        return next(new Error('Cannot create swap request with yourself'));
    }
    next();
});

// Middleware to set completion date
swapRequestSchema.pre('save', function(next) {
    if (this.isModified('status') && this.status === 'completed' && !this.completedAt) {
        this.completedAt = new Date();
    }
    next();
});

// Instance method to check if user is involved
swapRequestSchema.methods.isUserInvolved = function(userId) {
    return this.fromUser.toString() === userId.toString() || 
           this.toUser.toString() === userId.toString();
};

// Instance method to get other user
swapRequestSchema.methods.getOtherUser = function(userId) {
    if (this.fromUser.toString() === userId.toString()) {
        return this.toUser;
    } else if (this.toUser.toString() === userId.toString()) {
        return this.fromUser;
    }
    return null;
};

// Instance method to check if user can accept
swapRequestSchema.methods.canAccept = function(userId) {
    return this.toUser.toString() === userId.toString() && this.status === 'pending';
};

// Instance method to check if user can cancel
swapRequestSchema.methods.canCancel = function(userId) {
    return this.isUserInvolved(userId) && 
           ['pending', 'accepted'].includes(this.status);
};

// Instance method to calculate average rating
swapRequestSchema.methods.getAverageRating = function() {
    const { fromUserRating, toUserRating } = this.rating || {};
    if (fromUserRating && toUserRating) {
        return (fromUserRating + toUserRating) / 2;
    } else if (fromUserRating) {
        return fromUserRating;
    } else if (toUserRating) {
        return toUserRating;
    }
    return null;
};

// Static method to get user's swap statistics
swapRequestSchema.statics.getUserStats = function(userId) {
    return this.aggregate([
        {
            $match: {
                $or: [
                    { fromUser: mongoose.Types.ObjectId(userId) },
                    { toUser: mongoose.Types.ObjectId(userId) }
                ]
            }
        },
        {
            $group: {
                _id: '$status',
                count: { $sum: 1 }
            }
        }
    ]);
};

// Static method to get platform statistics
swapRequestSchema.statics.getPlatformStats = function() {
    return this.aggregate([
        {
            $group: {
                _id: '$status',
                count: { $sum: 1 }
            }
        },
        {
            $group: {
                _id: null,
                totalSwaps: { $sum: '$count' },
                statusBreakdown: {
                    $push: {
                        status: '$_id',
                        count: '$count'
                    }
                }
            }
        }
    ]);
};

module.exports = mongoose.model('SwapRequest', swapRequestSchema);