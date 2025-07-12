// SkillHub Platform - Main JavaScript Application

// Application State
let currentUser = null;
let users = [];
let swapRequests = [];
let adminStats = {};
let authToken = null;

// API Configuration
const API_BASE = '/api';

// Initialize Application
function init() {
    console.log('Initializing SkillHub application...');
    console.log('DOM elements check:');
    console.log('- Home page:', document.getElementById('home'));
    console.log('- Profile page:', document.getElementById('profile'));
    console.log('- Browse page:', document.getElementById('browse'));
    console.log('- Auth buttons:', document.getElementById('authButtons'));
    console.log('- Auth modal:', document.getElementById('authModal'));
    
    checkAuthStatus();
}

// Check if user is authenticated
async function checkAuthStatus() {
    authToken = localStorage.getItem('authToken');
    
    if (authToken) {
        try {
            const response = await fetch(`${API_BASE}/auth/me`, {
                headers: {
                    'Authorization': `Bearer ${authToken}`
                }
            });
            
            if (response.ok) {
                const data = await response.json();
                currentUser = data.user;
                setAuthenticatedState();
                await loadAppData();
            } else {
                // Token is invalid, fall back to localStorage
                localStorage.removeItem('authToken');
                authToken = null;
                loadDataFromDatabase();
                setAuthenticatedState();
            }
        } catch (error) {
            console.error('Auth check failed, using localStorage:', error);
            // Fall back to localStorage if server is not available
            loadDataFromDatabase();
            if (currentUser) {
                setAuthenticatedState();
            } else {
                setUnauthenticatedState();
            }
        }
    } else {
        // No token, check if we should load demo data or stay logged out
        const storedUser = SkillHubDB.getCurrentUser();
        if (storedUser && storedUser.id) {
            // Only load if there's actually a stored user (demo mode)
            loadDataFromDatabase();
            setAuthenticatedState();
        } else {
            // No stored user, stay logged out
            currentUser = null;
            users = [];
            swapRequests = [];
            adminStats = {};
            setUnauthenticatedState();
        }
    }
    
    setupEventListeners();
}

// Set authenticated state
function setAuthenticatedState() {
    document.body.classList.add('authenticated');
    document.getElementById('authButtons').style.display = 'none';
    document.getElementById('userDropdown').style.display = 'block';
    
    if (currentUser) {
        document.getElementById('userAvatar').textContent = currentUser.name.charAt(0).toUpperCase();
        loadUserProfile();
        updateAdminVisibility();
        updateAdminStats();
        renderFeaturedProfiles();
        renderAllProfiles();
        renderSwapRequests();
        loadUserSkillsInModal();
    }
}

// Set unauthenticated state
function setUnauthenticatedState() {
    document.body.classList.remove('authenticated');
    document.getElementById('authButtons').style.display = 'flex';
    document.getElementById('userDropdown').style.display = 'none';
    
    // Show only home page for unauthenticated users
    showPage('home');
}

// Authentication Functions
function showAuthModal(type) {
    console.log('showAuthModal called with type:', type);
    const modal = document.getElementById('authModal');
    if (modal) {
        modal.style.display = 'block';
        switchAuthForm(type);
    } else {
        console.error('Auth modal not found');
    }
}

function closeAuthModal() {
    document.getElementById('authModal').style.display = 'none';
    document.getElementById('loginFormElement').reset();
    document.getElementById('signupFormElement').reset();
}

function switchAuthForm(type) {
    const loginForm = document.getElementById('loginForm');
    const signupForm = document.getElementById('signupForm');
    
    if (type === 'login') {
        loginForm.style.display = 'block';
        signupForm.style.display = 'none';
    } else {
        loginForm.style.display = 'none';
        signupForm.style.display = 'block';
    }
}

async function handleLogin(email, password) {
    console.log('Attempting login for:', email);
    
    try {
        const response = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ email, password })
        });
        
        const data = await response.json();
        console.log('Login response:', data);
        
        if (data.success) {
            authToken = data.token;
            currentUser = data.user;
            localStorage.setItem('authToken', authToken);
            
            console.log('Login successful, user:', currentUser);
            
            closeAuthModal();
            setAuthenticatedState();
            await loadAppData();
            showNotification('Welcome back!', 'success');
        } else {
            throw new Error(data.message || 'Login failed');
        }
    } catch (error) {
        console.error('Login error:', error);
        showNotification(error.message || 'Login failed. Server may be offline.', 'error');
    }
}

async function handleSignup(name, email, password, location) {
    try {
        const response = await fetch(`${API_BASE}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ name, email, password, location })
        });
        
        const data = await response.json();
        
        if (data.success) {
            authToken = data.token;
            currentUser = data.user;
            localStorage.setItem('authToken', authToken);
            
            closeAuthModal();
            setAuthenticatedState();
            await loadAppData();
            showNotification('Account created successfully!', 'success');
        } else {
            throw new Error(data.message || data.errors?.[0]?.msg || 'Registration failed');
        }
    } catch (error) {
        console.error('Signup error:', error);
        showNotification(error.message || 'Registration failed. Server may be offline.', 'error');
    }
}

async function demoLogin() {
    console.log('Attempting demo login...');
    
    try {
        const response = await fetch(`${API_BASE}/auth/demo-login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        const data = await response.json();
        console.log('Demo login response:', data);
        
        if (data.success) {
            authToken = data.token;
            currentUser = data.user;
            localStorage.setItem('authToken', authToken);
            
            console.log('Demo login successful, user:', currentUser);
            
            closeAuthModal();
            setAuthenticatedState();
            await loadAppData();
            showNotification('Welcome to the demo!', 'success');
        } else {
            throw new Error(data.message || 'Demo login failed');
        }
    } catch (error) {
        console.error('Demo login error, using localStorage demo:', error);
        // Fall back to localStorage demo
        currentUser = SkillHubDB.getDefaultCurrentUser();
        SkillHubDB.setCurrentUser(currentUser);
        
        console.log('Using offline demo user:', currentUser);
        
        closeAuthModal();
        setAuthenticatedState();
        showNotification('Welcome to the demo! (Offline mode)', 'success');
    }
}

function logout() {
    console.log('Logging out user...');
    
    // Clear authentication state
    authToken = null;
    currentUser = null;
    localStorage.removeItem('authToken');
    SkillHubDB.setCurrentUser(null);
    
    // Reset authentication forms
    const loginForm = document.getElementById('loginFormElement');
    const signupForm = document.getElementById('signupFormElement');
    if (loginForm) loginForm.reset();
    if (signupForm) signupForm.reset();
    
    // Close any open modals
    closeAuthModal();
    
    // Set unauthenticated state
    setUnauthenticatedState();
    
    // Clear any cached data
    users = [];
    swapRequests = [];
    adminStats = {};
    
    showNotification('Logged out successfully', 'success');
    console.log('Logout completed');
}

// Load application data
async function loadAppData() {
    try {
        await Promise.all([
            loadUsers(),
            loadSwapRequests(),
            loadAdminStats()
        ]);
        
        renderFeaturedProfiles();
        renderAllProfiles();
        renderSwapRequests();
        loadUserSkillsInModal();
    } catch (error) {
        console.error('Failed to load app data:', error);
        // Fall back to localStorage
        loadDataFromDatabase();
        renderFeaturedProfiles();
        renderAllProfiles();
        renderSwapRequests();
        loadUserSkillsInModal();
    }
}

// Load data from API
async function loadUsers() {
    try {
        const response = await fetch(`${API_BASE}/users`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            users = data.users || [];
        } else {
            throw new Error('Failed to load users');
        }
    } catch (error) {
        console.error('Failed to load users:', error);
        users = SkillHubDB.getUsers();
    }
}

async function loadSwapRequests() {
    try {
        const response = await fetch(`${API_BASE}/swaps`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            swapRequests = data.swaps || [];
        } else {
            throw new Error('Failed to load swap requests');
        }
    } catch (error) {
        console.error('Failed to load swap requests:', error);
        swapRequests = SkillHubDB.getSwapRequests();
    }
}

async function loadAdminStats() {
    if (!currentUser?.isAdmin) return;
    
    try {
        const response = await fetch(`${API_BASE}/admin/stats`, {
            headers: {
                'Authorization': `Bearer ${authToken}`
            }
        });
        
        if (response.ok) {
            const data = await response.json();
            adminStats = data.stats || {};
        } else {
            throw new Error('Failed to load admin stats');
        }
    } catch (error) {
        console.error('Failed to load admin stats:', error);
        adminStats = SkillHubDB.getAdminStats();
    }
}

// Load data from database
function loadDataFromDatabase() {
    currentUser = SkillHubDB.getCurrentUser();
    users = SkillHubDB.getUsers();
    swapRequests = SkillHubDB.getSwapRequests();
    adminStats = SkillHubDB.getAdminStats();
}

// Save data to database
function saveDataToDatabase() {
    SkillHubDB.setCurrentUser(currentUser);
    SkillHubDB.setToStorage('users', users);
    SkillHubDB.setToStorage('swapRequests', swapRequests);
    SkillHubDB.setToStorage('adminStats', adminStats);
}

// Event Listeners
function setupEventListeners() {
    console.log('Setting up event listeners...');
    
    // Authentication form listeners
    const loginForm = document.getElementById('loginFormElement');
    const signupForm = document.getElementById('signupFormElement');
    
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('loginBtn');
            btn.classList.add('loading');
            
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;
            
            await handleLogin(email, password);
            btn.classList.remove('loading');
        });
    }
    
    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const btn = document.getElementById('signupBtn');
            btn.classList.add('loading');
            
            const name = document.getElementById('signupName').value;
            const email = document.getElementById('signupEmail').value;
            const password = document.getElementById('signupPassword').value;
            const location = document.getElementById('signupLocation').value;
            
            await handleSignup(name, email, password, location);
            btn.classList.remove('loading');
        });
    }

    // Profile form listener
    const profileForm = document.getElementById('profileForm');
    if (profileForm) {
        profileForm.addEventListener('submit', handleProfileSubmit);
    }
    
    // Skill input listeners
    const skillOfferedInput = document.getElementById('skillOfferedInput');
    const skillWantedInput = document.getElementById('skillWantedInput');
    
    if (skillOfferedInput) {
        skillOfferedInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                addSkill('offered');
            }
        });
    }
    
    if (skillWantedInput) {
        skillWantedInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                addSkill('wanted');
            }
        });
    }

    // Other listeners
    const visibilityToggle = document.getElementById('visibilityToggle');
    const searchInput = document.getElementById('searchInput');
    const swapRequestForm = document.getElementById('swapRequestForm');
    
    if (visibilityToggle) {
        visibilityToggle.addEventListener('click', toggleVisibility);
    }
    
    if (searchInput) {
        searchInput.addEventListener('input', handleSearch);
    }
    
    if (swapRequestForm) {
        swapRequestForm.addEventListener('submit', handleSwapSubmit);
    }

    // Modal listeners
    const swapModal = document.getElementById('swapModal');
    const authModal = document.getElementById('authModal');
    
    if (swapModal) {
        swapModal.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                closeModal();
            }
        });
    }
    
    if (authModal) {
        authModal.addEventListener('click', (e) => {
            if (e.target.classList.contains('modal')) {
                closeAuthModal();
            }
        });
    }
    
    console.log('Event listeners setup complete');
}

// Page Navigation
function showPage(pageId, event) {
    console.log('=== showPage called ===');
    console.log('pageId:', pageId);
    console.log('currentUser:', currentUser);
    console.log('event:', event);
    
    try {
        // Prevent default action if event is provided
        if (event) {
            event.preventDefault();
            event.stopPropagation();
        }
        
        // Check if user is authenticated for protected pages
        if (!currentUser && ['browse', 'profile', 'swaps', 'admin'].includes(pageId)) {
            console.log('User not authenticated, showing auth modal');
            showAuthModal('login');
            return;
        }
        
        // Remove active class from all nav links
        const navLinks = document.querySelectorAll('.nav-link');
        console.log('Found nav links:', navLinks.length);
        navLinks.forEach(link => {
            link.classList.remove('active');
        });
        
        // Add active class to clicked element
        if (event?.target) {
            event.target.classList.add('active');
            console.log('Added active class to:', event.target);
        }

        // Hide all pages
        const allPages = document.querySelectorAll('.page');
        console.log('Found pages:', allPages.length);
        allPages.forEach(page => {
            page.classList.remove('active');
            console.log('Removed active from page:', page.id);
        });
        
        // Show target page
        const targetPage = document.getElementById(pageId);
        if (targetPage) {
            targetPage.classList.add('active');
            console.log('✅ Page switched to:', pageId);
            console.log('Target page classes:', targetPage.className);
        } else {
            console.error('❌ Page not found:', pageId);
            return;
        }

        // Execute page-specific logic
        switch(pageId) {
            case 'browse':
                console.log('Loading browse page...');
                if (typeof renderAllProfiles === 'function') {
                    renderAllProfiles();
                }
                break;
            case 'swaps':
                console.log('Loading swaps page...');
                if (typeof renderSwapRequests === 'function') {
                    renderSwapRequests();
                }
                break;
            case 'admin':
                console.log('Loading admin page...');
                if (typeof updateAdminStats === 'function') {
                    updateAdminStats();
                }
                break;
            case 'home':
                console.log('Loading home page...');
                if (typeof renderFeaturedProfiles === 'function') {
                    renderFeaturedProfiles();
                }
                break;
            default:
                console.log('No specific logic for page:', pageId);
        }
        
        console.log('=== showPage completed ===');
        
    } catch (error) {
        console.error('Error in showPage:', error);
    }
}

// Profile Management
function loadUserProfile() {
    if (!currentUser) return;
    
    document.getElementById('profileName').value = currentUser.name;
    document.getElementById('profileLocation').value = currentUser.location;
    document.getElementById('profileAvailability').value = currentUser.availability;
    
    const toggle = document.getElementById('visibilityToggle');
    if (currentUser.isPublic) {
        toggle.classList.add('active');
    }

    updateUserAvatar();
    renderSkills();
}

function updateUserAvatar() {
    const avatar = document.getElementById('userAvatar');
    avatar.textContent = currentUser.name.charAt(0).toUpperCase();
}

function handleProfileSubmit(e) {
    e.preventDefault();
    
    const updatedData = {
        name: document.getElementById('profileName').value,
        location: document.getElementById('profileLocation').value,
        availability: document.getElementById('profileAvailability').value
    };
    
    currentUser = SkillHubDB.updateCurrentUser(updatedData);
    
    // Update in users array
    const userIndex = users.findIndex(u => u._id === currentUser._id);
    if (userIndex !== -1) {
        users[userIndex] = { ...currentUser };
    }
    
    updateUserAvatar();
    showNotification('Profile updated successfully!', 'success');
}

function addSkill(type) {
    const inputId = type === 'offered' ? 'skillOfferedInput' : 'skillWantedInput';
    const input = document.getElementById(inputId);
    const skillText = input.value.trim();
    
    if (!skillText) return;
    
    const skillsArray = type === 'offered' ? currentUser.skillsOffered : currentUser.skillsWanted;
    
    if (!skillsArray.includes(skillText)) {
        skillsArray.push(skillText);
        input.value = '';
        
        // Update in database
        SkillHubDB.updateCurrentUser(currentUser);
        
        // Update in users array
        const userIndex = users.findIndex(u => u.id === currentUser.id);
        if (userIndex !== -1) {
            users[userIndex] = { ...currentUser };
        }
        
        renderSkills();
        loadUserSkillsInModal();
    }
}

function removeSkill(type, skill) {
    const skillsArray = type === 'offered' ? currentUser.skillsOffered : currentUser.skillsWanted;
    const index = skillsArray.indexOf(skill);
    
    if (index > -1) {
        skillsArray.splice(index, 1);
        
        // Update in database
        SkillHubDB.updateCurrentUser(currentUser);
        
        // Update in users array
        const userIndex = users.findIndex(u => u.id === currentUser.id);
        if (userIndex !== -1) {
            users[userIndex] = { ...currentUser };
        }
        
        renderSkills();
        loadUserSkillsInModal();
    }
}

function renderSkills() {
    renderSkillContainer('offered', currentUser.skillsOffered, 'offeredSkillsContainer');
    renderSkillContainer('wanted', currentUser.skillsWanted, 'wantedSkillsContainer');
}

function renderSkillContainer(type, skills, containerId) {
    const container = document.getElementById(containerId);
    container.innerHTML = '';
    
    skills.forEach(skill => {
        const skillTag = document.createElement('div');
        skillTag.className = 'skill-tag';
        skillTag.innerHTML = `
            <span>${skill}</span>
            <span class="skill-remove" onclick="removeSkill('${type}', '${skill}')">&times;</span>
        `;
        container.appendChild(skillTag);
    });
}

function toggleVisibility() {
    const toggle = document.getElementById('visibilityToggle');
    toggle.classList.toggle('active');
    currentUser.isPublic = toggle.classList.contains('active');
    
    // Update in database
    SkillHubDB.updateCurrentUser(currentUser);
    
    // Update in users array
    const userIndex = users.findIndex(u => u.id === currentUser.id);
    if (userIndex !== -1) {
        users[userIndex] = { ...currentUser };
    }
}

// Profile Rendering
function renderFeaturedProfiles() {
    const container = document.getElementById('featuredProfiles');
    const featuredUsers = users.filter(user => user.id !== currentUser.id).slice(0, 3);
    
    container.innerHTML = featuredUsers.map(user => createProfileCard(user)).join('');
}

function renderAllProfiles() {
    const container = document.getElementById('profilesGrid');
    const publicUsers = users.filter(user => user.isPublic && user.id !== currentUser.id);
    
    container.innerHTML = publicUsers.map(user => createProfileCard(user)).join('');
}

function createProfileCard(user) {
    const stars = '★'.repeat(Math.floor(user.rating)) + '☆'.repeat(5 - Math.floor(user.rating));
    
    return `
        <div class="profile-card" onclick="viewProfile(${user.id})">
            <div class="profile-header">
                <div class="profile-avatar">${user.name.charAt(0)}</div>
                <div class="profile-info">
                    <h3>${user.name}</h3>
                    <p>📍 ${user.location}</p>
                    <div class="profile-rating">
                        <span class="stars">${stars}</span>
                        <span class="rating-text">${user.rating} (${user.completedSwaps} swaps)</span>
                    </div>
                </div>
            </div>
            
            <div class="skills-section">
                <h4 class="skills-title">Offers</h4>
                <div class="skills-list">
                    ${user.skillsOffered.slice(0, 3).map(skill => `<span class="skill-item">${skill}</span>`).join('')}
                    ${user.skillsOffered.length > 3 ? `<span class="skill-item">+${user.skillsOffered.length - 3} more</span>` : ''}
                </div>
            </div>
            
            <div class="skills-section">
                <h4 class="skills-title">Wants</h4>
                <div class="skills-list">
                    ${user.skillsWanted.slice(0, 3).map(skill => `<span class="skill-item">${skill}</span>`).join('')}
                    ${user.skillsWanted.length > 3 ? `<span class="skill-item">+${user.skillsWanted.length - 3} more</span>` : ''}
                </div>
            </div>
            
            <div class="flex gap-2 mt-4">
                <button class="btn btn-primary btn-sm" onclick="event.stopPropagation(); initiateSwap(${user.id})">
                    Request Swap
                </button>
                <button class="btn btn-outline btn-sm" onclick="event.stopPropagation(); viewProfile(${user.id})">
                    View Profile
                </button>
            </div>
        </div>
    `;
}

// Search Functionality
function handleSearch(e) {
    const searchTerm = e.target.value.toLowerCase();
    const filteredUsers = SkillHubDB.searchUsers(searchTerm).filter(user => 
        user.isPublic && user.id !== currentUser.id
    );
    
    const container = document.getElementById('profilesGrid');
    container.innerHTML = filteredUsers.map(user => createProfileCard(user)).join('');
}

// Swap Request Management
function loadUserSkillsInModal() {
    const select = document.getElementById('swapSkillOffered');
    select.innerHTML = '<option value="">Select a skill you offer</option>';
    
    currentUser.skillsOffered.forEach(skill => {
        const option = document.createElement('option');
        option.value = skill;
        option.textContent = skill;
        select.appendChild(option);
    });

    const userSelect = document.getElementById('swapTargetUser');
    userSelect.innerHTML = '<option value="">Select a user</option>';
    
    users.filter(user => user.isPublic && user.id !== currentUser.id).forEach(user => {
        const option = document.createElement('option');
        option.value = user.id;
        option.textContent = user.name;
        userSelect.appendChild(option);
    });
}

function showCreateSwapModal() {
    loadUserSkillsInModal();
    document.getElementById('swapModal').style.display = 'block';
}

function closeModal() {
    document.getElementById('swapModal').style.display = 'none';
    document.getElementById('swapRequestForm').reset();
}

function handleSwapSubmit(e) {
    e.preventDefault();
    
    const skillOffered = document.getElementById('swapSkillOffered').value;
    const skillWanted = document.getElementById('swapSkillWanted').value;
    const targetUserId = parseInt(document.getElementById('swapTargetUser').value);
    const message = document.getElementById('swapMessage').value;
    
    if (!skillOffered || !skillWanted || !targetUserId) {
        showNotification('Please fill in all required fields', 'error');
        return;
    }
    
    const newSwapRequest = {
        fromUser: currentUser.id,
        toUser: targetUserId,
        skillOffered: skillOffered,
        skillWanted: skillWanted,
        message: message
    };
    
    const savedSwap = SkillHubDB.addSwapRequest(newSwapRequest);
    if (savedSwap) {
        swapRequests = SkillHubDB.getSwapRequests();
        closeModal();
        showNotification('Swap request sent successfully!', 'success');
        
        if (document.getElementById('swaps').classList.contains('active')) {
            renderSwapRequests();
        }
    }
}

function initiateSwap(userId) {
    const targetUser = users.find(u => u.id === userId);
    if (!targetUser) return;
    
    showCreateSwapModal();
    document.getElementById('swapTargetUser').value = userId;
    
    const skillWantedInput = document.getElementById('swapSkillWanted');
    if (targetUser.skillsWanted.length > 0) {
        skillWantedInput.placeholder = `Suggested: ${targetUser.skillsWanted.join(', ')}`;
    }
}

function renderSwapRequests() {
    const container = document.getElementById('swapRequestsContainer');
    const userSwaps = swapRequests.filter(swap => 
        swap.fromUser === currentUser.id || swap.toUser === currentUser.id
    );
    
    if (userSwaps.length === 0) {
        container.innerHTML = `
            <div class="text-center">
                <p class="text-sm">No swap requests yet.</p>
                <button class="btn btn-primary mt-4" onclick="showCreateSwapModal()">
                    Create Your First Swap
                </button>
            </div>
        `;
        return;
    }
    
    container.innerHTML = userSwaps.map(swap => createSwapRequestCard(swap)).join('');
}

function createSwapRequestCard(swap) {
    const isFromCurrentUser = swap.fromUser === currentUser.id;
    const otherUserId = isFromCurrentUser ? swap.toUser : swap.fromUser;
    const otherUser = users.find(u => u.id === otherUserId);
    const direction = isFromCurrentUser ? 'Sent to' : 'Received from';
    
    return `
        <div class="swap-request ${swap.status}">
            <div class="swap-header">
                <div class="swap-user">${direction} ${otherUser.name}</div>
                <div class="swap-status ${swap.status}">${swap.status}</div>
            </div>
            
            <div class="swap-skills">
                <span class="swap-skill">${isFromCurrentUser ? swap.skillOffered : swap.skillWanted}</span>
                <span class="swap-arrow">⇄</span>
                <span class="swap-skill">${isFromCurrentUser ? swap.skillWanted : swap.skillOffered}</span>
            </div>
            
            ${swap.message ? `<div class="swap-message">"${swap.message}"</div>` : ''}
            
            <div class="text-xs mb-4" style="color: var(--gray-500);">
                ${formatDate(swap.createdAt)}
            </div>
            
            <div class="flex gap-2">
                ${swap.status === 'pending' && !isFromCurrentUser ? `
                    <button class="btn btn-success btn-sm" onclick="acceptSwap(${swap.id})">
                        Accept
                    </button>
                    <button class="btn btn-danger btn-sm" onclick="rejectSwap(${swap.id})">
                        Reject
                    </button>
                ` : ''}
                
                ${swap.status === 'pending' && isFromCurrentUser ? `
                    <button class="btn btn-secondary btn-sm" onclick="cancelSwap(${swap.id})">
                        Cancel
                    </button>
                ` : ''}
                
                ${swap.status === 'accepted' && !swap.rating ? `
                    <button class="btn btn-primary btn-sm" onclick="rateSwap(${swap.id})">
                        Rate Experience
                    </button>
                ` : ''}
            </div>
        </div>
    `;
}

function acceptSwap(swapId) {
    const updatedSwap = SkillHubDB.updateSwapRequest(swapId, { status: 'accepted' });
    if (updatedSwap) {
        swapRequests = SkillHubDB.getSwapRequests();
        renderSwapRequests();
        updateAdminStats();
        showNotification('Swap request accepted!', 'success');
    }
}

function rejectSwap(swapId) {
    const updatedSwap = SkillHubDB.updateSwapRequest(swapId, { status: 'rejected' });
    if (updatedSwap) {
        swapRequests = SkillHubDB.getSwapRequests();
        renderSwapRequests();
        showNotification('Swap request rejected.', 'warning');
    }
}

function cancelSwap(swapId) {
    if (SkillHubDB.deleteSwapRequest(swapId)) {
        swapRequests = SkillHubDB.getSwapRequests();
        renderSwapRequests();
        showNotification('Swap request cancelled.', 'warning');
    }
}

function rateSwap(swapId) {
    const rating = prompt('Rate your experience (1-5 stars):');
    const numRating = parseInt(rating);
    
    if (numRating >= 1 && numRating <= 5) {
        const updatedSwap = SkillHubDB.updateSwapRequest(swapId, { 
            rating: numRating, 
            status: 'completed' 
        });
        
        if (updatedSwap) {
            swapRequests = SkillHubDB.getSwapRequests();
            renderSwapRequests();
            updateAdminStats();
            showNotification(`Thanks for rating! ${numRating} stars given.`, 'success');
        }
    }
}

// Admin Functions
function updateAdminVisibility() {
    const adminLink = document.getElementById('adminNavLink');
    if (currentUser && currentUser.isAdmin) {
        adminLink.style.display = 'block';
    }
}

function updateAdminStats() {
    if (!currentUser || !currentUser.isAdmin) return;
    
    const stats = SkillHubDB.getSwapStatistics();
    const userStats = SkillHubDB.getUserStatistics();
    
    document.getElementById('totalUsersCount').textContent = userStats.total;
    document.getElementById('activeSwapsCount').textContent = stats.accepted;
    document.getElementById('completedSwapsCount').textContent = stats.completed;
    document.getElementById('reportedUsersCount').textContent = 0; // No reports system yet
}

function sendAdminMessage() {
    const message = document.getElementById('adminMessageInput').value;
    if (!message.trim()) {
        showNotification('Please enter a message', 'error');
        return;
    }
    
    showNotification('Platform-wide announcement sent!', 'success');
    document.getElementById('adminMessageInput').value = '';
}

function downloadReports() {
    const reportData = SkillHubDB.exportData();
    reportData.topSkills = SkillHubDB.getTopSkills();
    reportData.swapStats = SkillHubDB.getSwapStatistics();
    reportData.userStats = SkillHubDB.getUserStatistics();
    
    const dataStr = JSON.stringify(reportData, null, 2);
    const dataBlob = new Blob([dataStr], {type: 'application/json'});
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `skillhub-report-${new Date().toISOString().split('T')[0]}.json`;
    link.click();
    
    showNotification('Report downloaded successfully!', 'success');
}

function manageUsers() {
    showNotification('User management panel opened', 'success');
    // Could implement a user management modal here
}

function moderateContent() {
    showNotification('Content moderation panel opened', 'success');
    // Could implement content moderation features here
}

// Utility Functions
function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function viewProfile(userId) {
    const user = users.find(u => u.id === userId);
    if (user) {
        showNotification(`Viewing ${user.name}'s profile`, 'success');
        // Could implement a detailed profile modal here
    }
}

function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    document.body.appendChild(notification);
    
    // Trigger animation
    setTimeout(() => notification.classList.add('show'), 100);
    
    // Remove after 3 seconds
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            if (document.body.contains(notification)) {
                document.body.removeChild(notification);
            }
        }, 300);
    }, 3000);
}

// Test function to check if JavaScript is working
function testNavigation() {
    console.log('Test navigation called');
    alert('JavaScript is working! Current user: ' + (currentUser ? currentUser.name : 'Not logged in'));
}

// Make functions globally available for debugging
window.showPage = showPage;
window.showAuthModal = showAuthModal;
window.testNavigation = testNavigation;

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing...');
    init();
    
    // Test basic functionality after a short delay
    setTimeout(() => {
        console.log('Running post-init tests...');
        console.log('Pages found:');
        document.querySelectorAll('.page').forEach(page => {
            console.log(`- ${page.id}: ${page.classList.contains('active') ? 'ACTIVE' : 'hidden'}`);
        });
    }, 1000);
});

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        closeModal();
    }
});