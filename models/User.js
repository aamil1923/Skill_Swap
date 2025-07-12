const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: [true, 'Name is required'],
        trim: true,
        maxlength: [100, 'Name cannot exceed 100 characters']
    },
    email: {
        type: String,
        required: [true, 'Email is required'],
        unique: true,
        lowercase: true,
        trim: true,
        match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
    },
    password: {
        type: String,
        required: [true, 'Password is required'],
        minlength: [6, 'Password must be at least 6 characters'],
        select: false
    },
    location: {
        type: String,
        trim: true,
        maxlength: [200, 'Location cannot exceed 200 characters']
    },
    availability: {
        type: String,
        enum: ['weekdays', 'weekends', 'evenings', 'flexible'],
        default: 'flexible'
    },
    isPublic: {
        type: Boolean,
        default: true
    },
    skillsOffered: [{
        type: String,
        trim: true,
        maxlength: [50, 'Skill name cannot exceed 50 characters']
    }],
    skillsWanted: [{
        type: String,
        trim: true,
        maxlength: [50, 'Skill name cannot exceed 50 characters']
    }],
    isAdmin: {
        type: Boolean,
        default: false
    },
    rating: {
        type: Number,
        default: 0,
        min: 0,
        max: 5
    },
    completedSwaps: {
        type: Number,
        default: 0
    },
    profilePicture: {
        type: String,
        default: null
    },
    bio: {
        type: String,
        maxlength: [500, 'Bio cannot exceed 500 characters']
    },
    linkedinProfile: {
        type: String,
        trim: true
    },
    githubProfile: {
        type: String,
        trim: true
    },
    portfolio: {
        type: String,
        trim: true
    },
    joinedAt: {
        type: Date,
        default: Date.now
    },
    lastActive: {
        type: Date,
        default: Date.now
    },
    isVerified: {
        type: Boolean,
        default: false
    },
    verificationToken: String,
    passwordResetToken: String,
    passwordResetExpires: Date
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Virtual for user's age (if birthdate is added later)
userSchema.virtual('id').get(function() {
    return this._id.toHexString();
});

// Indexes for better performance
userSchema.index({ email: 1 });
userSchema.index({ location: 1 });
userSchema.index({ skillsOffered: 1 });
userSchema.index({ skillsWanted: 1 });
userSchema.index({ isPublic: 1 });
userSchema.index({ rating: -1 });

// Middleware to hash password before saving
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    
    this.password = await bcrypt.hash(this.password, 12);
    next();
});

// Update lastActive on login
userSchema.pre('save', function(next) {
    if (this.isNew || this.isModified()) {
        this.lastActive = Date.now();
    }
    next();
});

// Instance method to check password
userSchema.methods.comparePassword = async function(candidatePassword) {
    return await bcrypt.compare(candidatePassword, this.password);
};

// Instance method to calculate rating
userSchema.methods.calculateRating = function() {
    // This would be calculated based on received ratings
    // For now, return the stored rating
    return this.rating;
};

// Static method to get users by skill
userSchema.statics.findBySkill = function(skill, type = 'offered') {
    const field = type === 'offered' ? 'skillsOffered' : 'skillsWanted';
    return this.find({ 
        [field]: { $regex: skill, $options: 'i' },
        isPublic: true 
    });
};

// Static method for search
userSchema.statics.search = function(query) {
    const searchRegex = new RegExp(query, 'i');
    return this.find({
        $and: [
            { isPublic: true },
            {
                $or: [
                    { name: searchRegex },
                    { location: searchRegex },
                    { skillsOffered: { $elemMatch: { $regex: searchRegex } } },
                    { skillsWanted: { $elemMatch: { $regex: searchRegex } } },
                    { bio: searchRegex }
                ]
            }
        ]
    });
};

module.exports = mongoose.model('User', userSchema);