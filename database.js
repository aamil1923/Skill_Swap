// Database Layer - SkillHub Platform
// This implements a client-side database using localStorage for persistence

class SkillHubDatabase {
    constructor() {
        this.dbName = 'skillhub_db';
        this.version = 1;
        this.init();
    }

    // Initialize database with default data if not exists
    init() {
        if (!this.getFromStorage('users')) {
            this.setToStorage('users', this.getDefaultUsers());
        }
        if (!this.getFromStorage('swapRequests')) {
            this.setToStorage('swapRequests', this.getDefaultSwapRequests());
        }
        if (!this.getFromStorage('adminStats')) {
            this.setToStorage('adminStats', this.getDefaultAdminStats());
        }
        if (!this.getFromStorage('currentUser')) {
            this.setToStorage('currentUser', this.getDefaultCurrentUser());
        }
    }

    // Storage helper methods
    getFromStorage(key) {
        try {
            const data = localStorage.getItem(`${this.dbName}_${key}`);
            return data ? JSON.parse(data) : null;
        } catch (error) {
            console.error('Error retrieving from storage:', error);
            return null;
        }
    }

    setToStorage(key, data) {
        try {
            localStorage.setItem(`${this.dbName}_${key}`, JSON.stringify(data));
            return true;
        } catch (error) {
            console.error('Error saving to storage:', error);
            return false;
        }
    }

    clearStorage() {
        const keys = Object.keys(localStorage);
        keys.forEach(key => {
            if (key.startsWith(this.dbName)) {
                localStorage.removeItem(key);
            }
        });
    }

    // User Management
    getUsers() {
        return this.getFromStorage('users') || [];
    }

    addUser(user) {
        const users = this.getUsers();
        const newUser = {
            id: this.generateId(),
            ...user,
            createdAt: new Date().toISOString(),
            rating: 0,
            completedSwaps: 0
        };
        users.push(newUser);
        return this.setToStorage('users', users) ? newUser : null;
    }

    updateUser(userId, updates) {
        const users = this.getUsers();
        const userIndex = users.findIndex(u => u.id === userId);
        if (userIndex !== -1) {
            users[userIndex] = { ...users[userIndex], ...updates };
            this.setToStorage('users', users);
            return users[userIndex];
        }
        return null;
    }

    getUserById(userId) {
        const users = this.getUsers();
        return users.find(u => u.id === userId) || null;
    }

    deleteUser(userId) {
        const users = this.getUsers();
        const filteredUsers = users.filter(u => u.id !== userId);
        return this.setToStorage('users', filteredUsers);
    }

    searchUsers(query) {
        const users = this.getUsers();
        const searchTerm = query.toLowerCase();
        return users.filter(user => {
            const nameMatch = user.name.toLowerCase().includes(searchTerm);
            const locationMatch = user.location.toLowerCase().includes(searchTerm);
            const skillsMatch = [...user.skillsOffered, ...user.skillsWanted]
                .some(skill => skill.toLowerCase().includes(searchTerm));
            return nameMatch || locationMatch || skillsMatch;
        });
    }

    // Current User Management
    getCurrentUser() {
        return this.getFromStorage('currentUser') || null;
    }

    setCurrentUser(user) {
        return this.setToStorage('currentUser', user);
    }

    updateCurrentUser(updates) {
        const currentUser = this.getCurrentUser();
        if (currentUser) {
            const updatedUser = { ...currentUser, ...updates };
            this.setCurrentUser(updatedUser);
            this.updateUser(currentUser.id, updates);
            return updatedUser;
        }
        return null;
    }

    // Swap Request Management
    getSwapRequests() {
        return this.getFromStorage('swapRequests') || [];
    }

    addSwapRequest(swapRequest) {
        const swapRequests = this.getSwapRequests();
        const newSwapRequest = {
            id: this.generateId(),
            ...swapRequest,
            createdAt: new Date().toISOString(),
            status: 'pending',
            rating: null
        };
        swapRequests.push(newSwapRequest);
        return this.setToStorage('swapRequests', swapRequests) ? newSwapRequest : null;
    }

    updateSwapRequest(swapId, updates) {
        const swapRequests = this.getSwapRequests();
        const swapIndex = swapRequests.findIndex(s => s.id === swapId);
        if (swapIndex !== -1) {
            swapRequests[swapIndex] = { ...swapRequests[swapIndex], ...updates };
            this.setToStorage('swapRequests', swapRequests);
            return swapRequests[swapIndex];
        }
        return null;
    }

    getSwapRequestById(swapId) {
        const swapRequests = this.getSwapRequests();
        return swapRequests.find(s => s.id === swapId) || null;
    }

    deleteSwapRequest(swapId) {
        const swapRequests = this.getSwapRequests();
        const filteredSwaps = swapRequests.filter(s => s.id !== swapId);
        return this.setToStorage('swapRequests', filteredSwaps);
    }

    getUserSwapRequests(userId) {
        const swapRequests = this.getSwapRequests();
        return swapRequests.filter(swap => 
            swap.fromUser === userId || swap.toUser === userId
        );
    }

    getSwapRequestsByStatus(status) {
        const swapRequests = this.getSwapRequests();
        return swapRequests.filter(swap => swap.status === status);
    }

    // Admin Stats Management
    getAdminStats() {
        return this.getFromStorage('adminStats') || this.getDefaultAdminStats();
    }

    updateAdminStats(updates) {
        const stats = this.getAdminStats();
        const updatedStats = { ...stats, ...updates };
        return this.setToStorage('adminStats', updatedStats) ? updatedStats : null;
    }

    // Analytics
    getTopSkills() {
        const users = this.getUsers();
        const skillCount = {};
        
        users.forEach(user => {
            [...user.skillsOffered, ...user.skillsWanted].forEach(skill => {
                skillCount[skill] = (skillCount[skill] || 0) + 1;
            });
        });
        
        return Object.entries(skillCount)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10)
            .map(([skill, count]) => ({ skill, count }));
    }

    getSwapStatistics() {
        const swapRequests = this.getSwapRequests();
        return {
            total: swapRequests.length,
            pending: swapRequests.filter(s => s.status === 'pending').length,
            accepted: swapRequests.filter(s => s.status === 'accepted').length,
            completed: swapRequests.filter(s => s.status === 'completed').length,
            rejected: swapRequests.filter(s => s.status === 'rejected').length
        };
    }

    getUserStatistics() {
        const users = this.getUsers();
        return {
            total: users.length,
            public: users.filter(u => u.isPublic).length,
            private: users.filter(u => !u.isPublic).length,
            admin: users.filter(u => u.isAdmin).length
        };
    }

    // Export/Import functionality
    exportData() {
        return {
            users: this.getUsers(),
            swapRequests: this.getSwapRequests(),
            adminStats: this.getAdminStats(),
            currentUser: this.getCurrentUser(),
            exportDate: new Date().toISOString(),
            version: this.version
        };
    }

    importData(data) {
        try {
            if (data.users) this.setToStorage('users', data.users);
            if (data.swapRequests) this.setToStorage('swapRequests', data.swapRequests);
            if (data.adminStats) this.setToStorage('adminStats', data.adminStats);
            if (data.currentUser) this.setToStorage('currentUser', data.currentUser);
            return true;
        } catch (error) {
            console.error('Error importing data:', error);
            return false;
        }
    }

    // Utility Methods
    generateId() {
        return Date.now() + Math.random().toString(36).substr(2, 9);
    }

    // Default Data
    getDefaultCurrentUser() {
        return {
            id: 1,
            name: 'John Doe',
            location: 'Mumbai, Maharashtra, India',
            availability: 'weekends',
            isPublic: true,
            skillsOffered: ['JavaScript', 'React', 'Node.js', 'UI/UX Design'],
            skillsWanted: ['Python', 'Machine Learning', 'Data Science', 'DevOps'],
            isAdmin: true,
            rating: 4.8,
            completedSwaps: 12
        };
    }

    getDefaultUsers() {
        return [
            {
                id: 1,
                name: 'John Doe',
                location: 'Mumbai, Maharashtra, India',
                availability: 'weekends',
                isPublic: true,
                skillsOffered: ['JavaScript', 'React', 'Node.js', 'UI/UX Design'],
                skillsWanted: ['Python', 'Machine Learning', 'Data Science', 'DevOps'],
                isAdmin: true,
                rating: 4.8,
                completedSwaps: 12
            },
            {
                id: 2,
                name: 'Sarah Chen',
                location: 'Delhi, India',
                availability: 'evenings',
                isPublic: true,
                skillsOffered: ['Python', 'Data Science', 'Machine Learning', 'Statistics'],
                skillsWanted: ['JavaScript', 'Web Development', 'React', 'Frontend'],
                isAdmin: false,
                rating: 4.9,
                completedSwaps: 18
            },
            {
                id: 3,
                name: 'Mike Johnson',
                location: 'Bangalore, India',
                availability: 'flexible',
                isPublic: true,
                skillsOffered: ['Photoshop', 'UI/UX Design', 'Figma', 'Branding'],
                skillsWanted: ['Marketing', 'SEO', 'Content Writing', 'Social Media'],
                isAdmin: false,
                rating: 4.7,
                completedSwaps: 8
            },
            {
                id: 4,
                name: 'Priya Sharma',
                location: 'Chennai, India',
                availability: 'weekdays',
                isPublic: true,
                skillsOffered: ['Digital Marketing', 'SEO', 'Content Strategy', 'Analytics'],
                skillsWanted: ['Graphic Design', 'Video Editing', 'Photography'],
                isAdmin: false,
                rating: 4.6,
                completedSwaps: 15
            },
            {
                id: 5,
                name: 'Alex Rodriguez',
                location: 'Pune, India',
                availability: 'evenings',
                isPublic: true,
                skillsOffered: ['DevOps', 'AWS', 'Docker', 'Kubernetes'],
                skillsWanted: ['Mobile Development', 'Flutter', 'iOS Development'],
                isAdmin: false,
                rating: 4.8,
                completedSwaps: 10
            }
        ];
    }

    getDefaultSwapRequests() {
        return [
            {
                id: 1,
                fromUser: 2,
                toUser: 1,
                skillOffered: 'Python',
                skillWanted: 'JavaScript',
                message: 'Hi John! I\'d love to learn JavaScript from you. I have extensive Python experience and can help you with data science concepts.',
                status: 'pending',
                createdAt: new Date('2024-07-10').toISOString(),
                rating: null
            },
            {
                id: 2,
                fromUser: 3,
                toUser: 1,
                skillOffered: 'UI/UX Design',
                skillWanted: 'React',
                message: 'Hey! I saw your React skills and would love to learn. I can help you with advanced UI/UX design principles in return.',
                status: 'accepted',
                createdAt: new Date('2024-07-08').toISOString(),
                rating: 5
            }
        ];
    }

    getDefaultAdminStats() {
        return {
            totalUsers: 5,
            activeSwaps: 3,
            completedSwaps: 7,
            reportedUsers: 0
        };
    }
}

// Initialize database instance
const db = new SkillHubDatabase();

// Export for use in other files
window.SkillHubDB = db;