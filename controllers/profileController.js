const bcrypt = require("bcrypt");
const userModel = require('../models/userModel');
const tempuserhehe = require('../models/tempuserhehe');
const auditModel = require('../models/auditModel');
const { validatePassword } = require('./adminController');

// User login
async function login(req, res) {
    try {
        const { username, password } = req.body;
        const plainPassword = Array.isArray(password) ? password[0] : password;

        // Validate input
        if (!username || !plainPassword) {
            return res.render('login', {
                title: 'Login', layout: 'loginLayout',
                error: 'Invalid username and/or password'
            });
        }

        // Retrieve user from database
        const user = await userModel.getuserUsername(username);

        if (!user) {
            // Generic error message (checklist 2.1.4)
            await auditModel.logEvent({
                username: username, role: 'unknown',
                action: auditModel.ACTIONS.LOGIN_FAILURE,
                details: { reason: 'User not found' },
                ip: req.ip, success: false
            });
            return res.render('login', {
                title: 'Login', layout: 'loginLayout',
                error: 'Invalid username and/or password'
            });
        }

        // Check if account is locked (checklist 2.1.8)
        if (userModel.isAccountLocked(user)) {
            await auditModel.logEvent({
                userId: user._id, username: user.username, role: user.role,
                action: auditModel.ACTIONS.LOGIN_FAILURE,
                details: { reason: 'Account locked' },
                ip: req.ip, success: false
            });
            return res.render('login', {
                title: 'Login', layout: 'loginLayout',
                error: 'Account is temporarily locked. Please try again later.'
            });
        }

        // Compare password
        const isMatch = await bcrypt.compare(plainPassword, user.password);

        if (isMatch) {
            // Reset failed login attempts
            await userModel.resetFailedLogins(username);

            // Store last login for reporting (checklist 2.1.12)
            const lastLogin = user.lastLogin;
            await userModel.updateUser(username, { lastLogin: new Date() });

            // Set session
            tempuserhehe.setcurrentUser(req, {
                _id: user._id,
                username: user.username,
                email: user.email,
                role: user.role || 'customer',
                joinDate: user.joinDate,
                posts: user.posts,
                comments: user.comments,
                lastLogin: lastLogin
            });

            // Log successful login
            await auditModel.logEvent({
                userId: user._id, username: user.username, role: user.role,
                action: auditModel.ACTIONS.LOGIN_SUCCESS,
                details: { lastLogin: lastLogin },
                ip: req.ip, success: true
            });

            return res.redirect('/');
        } else {
            // Increment failed login attempts
            await userModel.incrementFailedLogins(username);

            await auditModel.logEvent({
                userId: user._id, username: user.username, role: user.role,
                action: auditModel.ACTIONS.LOGIN_FAILURE,
                details: { reason: 'Invalid password', failedAttempts: (user.failedLoginAttempts || 0) + 1 },
                ip: req.ip, success: false
            });

            return res.render('login', {
                title: 'Login', layout: 'loginLayout',
                error: 'Invalid username and/or password'
            });
        }
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).render('login', {
            title: 'Login', layout: 'loginLayout',
            error: 'An error occurred. Please try again later.'
        });
    }
}

// User registration (customers only via public form)
async function register(req, res) {
    try {
        const { email, password, username } = req.body;
        const plainPassword = Array.isArray(password) ? password[0] : String(password);

        // Validate input
        if (!email || !plainPassword || !username) {
            await auditModel.logEvent({
                username: username || 'unknown', role: 'unknown',
                action: auditModel.ACTIONS.VALIDATION_FAILURE,
                details: { reason: 'Missing registration fields' },
                ip: req.ip, success: false
            });
            return res.render('register', {
                title: 'Register', layout: 'loginLayout',
                error: 'All fields are required.'
            });
        }

        // Username length validation (checklist 2.3.3)
        if (username.length < 3 || username.length > 30) {
            return res.render('register', {
                title: 'Register', layout: 'loginLayout',
                error: 'Username must be between 3 and 30 characters.'
            });
        }

        // Email basic validation
        if (!email.includes('@') || email.length > 100) {
            return res.render('register', {
                title: 'Register', layout: 'loginLayout',
                error: 'Please enter a valid email address.'
            });
        }

        // Password complexity validation (checklist 2.1.5, 2.1.6)
        const passwordError = validatePassword(plainPassword);
        if (passwordError) {
            await auditModel.logEvent({
                username: username, role: 'unknown',
                action: auditModel.ACTIONS.VALIDATION_FAILURE,
                details: { reason: 'Password validation failed', error: passwordError },
                ip: req.ip, success: false
            });
            return res.render('register', {
                title: 'Register', layout: 'loginLayout',
                error: passwordError
            });
        }

        // Check if username exists
        const existingUser = await userModel.getuserUsername(username);
        if (existingUser) {
            return res.render('register', {
                title: 'Register', layout: 'loginLayout',
                error: 'This username is already used, please use another one.'
            });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(plainPassword, 10);

        // Create user with customer role (default)
        const newUser = await userModel.createUser({
            username,
            password: hashedPassword,
            email,
            role: 'customer'
        });

        // Log registration
        await auditModel.logEvent({
            userId: newUser.insertedId, username: username, role: 'customer',
            action: auditModel.ACTIONS.REGISTER,
            details: { email: email },
            ip: req.ip, success: true
        });

        // Set session
        tempuserhehe.setcurrentUser(req, {
            _id: newUser.insertedId,
            username,
            email,
            role: 'customer',
            joinDate: new Date(),
            posts: 0,
            comments: 0,
            lastLogin: null
        });

        return res.redirect('/');
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).render('register', {
            title: 'Register', layout: 'loginLayout',
            error: 'An error occurred. Please try again later.'
        });
    }
}

// Logout - destroy session and clear cookie
function logout(req, res) {
    const currentUser = req.session ? req.session.user : null;

    if (currentUser) {
        auditModel.logEvent({
            userId: currentUser._id, username: currentUser.username, role: currentUser.role,
            action: auditModel.ACTIONS.LOGOUT,
            details: {},
            ip: req.ip, success: true
        });
    }

    req.session.destroy((err) => {
        if (err) {
            console.error('Logout error:', err);
        }
        res.clearCookie('connect.sid');
        res.render('logout', { title: 'Logout', layout: 'loginLayout' });
    });
}

module.exports = {
    login,
    register,
    logout
};