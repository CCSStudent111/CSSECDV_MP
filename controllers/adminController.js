const bcrypt = require("bcrypt");
const userModel = require('../models/userModel');
const auditModel = require('../models/auditModel');
const { ROLES } = require('../middleware/authMiddleware');

// Render admin dashboard with user list
async function dashboard(req, res) {
    try {
        const users = await userModel.getAllUsers();
        const currentUser = req.session.user;
        
        res.render('adminDashboard', {
            title: 'Admin Dashboard',
            layout: 'adminLayout',
            users: users,
            user: currentUser,
            roles: ROLES
        });
    } catch (error) {
        console.error('Admin dashboard error:', error);
        res.status(500).render('error', { title: 'Error', message: 'Failed to load dashboard.', layout: 'main' });
    }
}

// Create a new admin or manager user
async function createUser(req, res) {
    try {
        const { username, email, password, role } = req.body;
        const currentUser = req.session.user;

        // Validate inputs
        if (!username || !email || !password || !role) {
            return res.redirect('/admin?error=All fields are required');
        }

        // Only allow creating admin or manager accounts
        if (role !== ROLES.ADMIN && role !== ROLES.MANAGER) {
            await auditModel.logEvent({
                userId: currentUser._id, username: currentUser.username, role: currentUser.role,
                action: auditModel.ACTIONS.VALIDATION_FAILURE,
                details: { reason: 'Invalid role for admin user creation', attemptedRole: role },
                ip: req.ip, success: false
            });
            return res.redirect('/admin?error=Invalid role selection');
        }

        // Check username length
        if (username.length < 3 || username.length > 30) {
            return res.redirect('/admin?error=Username must be 3-30 characters');
        }

        // Password validation
        const passwordError = validatePassword(password);
        if (passwordError) {
            return res.redirect('/admin?error=' + encodeURIComponent(passwordError));
        }

        // Check if username exists
        const existing = await userModel.getuserUsername(username);
        if (existing) {
            return res.redirect('/admin?error=Username already exists');
        }

        // Hash password and create user
        const hashedPassword = await bcrypt.hash(password, 10);
        await userModel.createUser({
            username,
            email,
            password: hashedPassword,
            role
        });

        // Log event
        await auditModel.logEvent({
            userId: currentUser._id, username: currentUser.username, role: currentUser.role,
            action: auditModel.ACTIONS.USER_CREATE,
            details: { createdUsername: username, assignedRole: role },
            ip: req.ip, success: true
        });

        res.redirect('/admin?success=User created successfully');
    } catch (error) {
        console.error('Create user error:', error);
        res.redirect('/admin?error=Failed to create user');
    }
}

// Delete a user
async function deleteUser(req, res) {
    try {
        const userId = req.params.id;
        const currentUser = req.session.user;

        // Don't allow deleting yourself
        if (userId === currentUser._id.toString()) {
            return res.redirect('/admin?error=Cannot delete your own account');
        }

        const targetUser = await userModel.getUserById(userId);
        if (!targetUser) {
            return res.redirect('/admin?error=User not found');
        }

        await userModel.deleteUser(userId);

        await auditModel.logEvent({
            userId: currentUser._id, username: currentUser.username, role: currentUser.role,
            action: auditModel.ACTIONS.USER_DELETE,
            details: { deletedUsername: targetUser.username, deletedRole: targetUser.role },
            ip: req.ip, success: true
        });

        res.redirect('/admin?success=User deleted');
    } catch (error) {
        console.error('Delete user error:', error);
        res.redirect('/admin?error=Failed to delete user');
    }
}

// Change a user's role
async function changeUserRole(req, res) {
    try {
        const userId = req.params.id;
        const { role } = req.body;
        const currentUser = req.session.user;

        if (!role || !Object.values(ROLES).includes(role)) {
            return res.redirect('/admin?error=Invalid role');
        }

        // Don't allow changing your own role
        if (userId === currentUser._id.toString()) {
            return res.redirect('/admin?error=Cannot change your own role');
        }

        const targetUser = await userModel.getUserById(userId);
        if (!targetUser) {
            return res.redirect('/admin?error=User not found');
        }

        const oldRole = targetUser.role;
        await userModel.updateUserById(userId, { role });

        await auditModel.logEvent({
            userId: currentUser._id, username: currentUser.username, role: currentUser.role,
            action: auditModel.ACTIONS.USER_ROLE_CHANGE,
            details: { targetUsername: targetUser.username, oldRole, newRole: role },
            ip: req.ip, success: true
        });

        res.redirect('/admin?success=Role updated');
    } catch (error) {
        console.error('Change role error:', error);
        res.redirect('/admin?error=Failed to change role');
    }
}

// View audit logs
async function viewLogs(req, res) {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = 25;
        const filters = {
            action: req.query.action || '',
            username: req.query.username || '',
            startDate: req.query.startDate || '',
            endDate: req.query.endDate || ''
        };

        const logs = await auditModel.getLogs(filters, page, limit);
        const totalCount = await auditModel.getLogCount(filters);
        const totalPages = Math.ceil(totalCount / limit);

        res.render('adminLogs', {
            title: 'Audit Logs',
            layout: 'adminLayout',
            logs: logs,
            user: req.session.user,
            filters: filters,
            currentPage: page,
            totalPages: totalPages,
            totalCount: totalCount,
            actions: auditModel.ACTIONS
        });
    } catch (error) {
        console.error('View logs error:', error);
        res.status(500).render('error', { title: 'Error', message: 'Failed to load logs.', layout: 'main' });
    }
}

// Render change password page
function changePasswordPage(req, res) {
    res.render('changePassword', {
        title: 'Change Password',
        layout: 'main',
        user: req.session.user
    });
}

// Handle password change
async function changePassword(req, res) {
    try {
        const { currentPassword, newPassword, confirmPassword } = req.body;
        const currentUser = req.session.user;

        // Re-authenticate (checklist 2.1.13)
        const user = await userModel.getuserUsername(currentUser.username);
        const isMatch = await bcrypt.compare(currentPassword, user.password);
        if (!isMatch) {
            await auditModel.logEvent({
                userId: user._id, username: user.username, role: user.role,
                action: auditModel.ACTIONS.PASSWORD_CHANGE,
                details: { reason: 'Incorrect current password' },
                ip: req.ip, success: false
            });
            return res.render('changePassword', {
                title: 'Change Password', layout: 'main', user: currentUser,
                error: 'Current password is incorrect.'
            });
        }

        // Check passwords match
        if (newPassword !== confirmPassword) {
            return res.render('changePassword', {
                title: 'Change Password', layout: 'main', user: currentUser,
                error: 'New passwords do not match.'
            });
        }

        // Validate new password complexity
        const passwordError = validatePassword(newPassword);
        if (passwordError) {
            return res.render('changePassword', {
                title: 'Change Password', layout: 'main', user: currentUser,
                error: passwordError
            });
        }

        // Check password age - must be at least 1 day old (checklist 2.1.11)
        if (user.passwordChangedAt) {
            const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
            if (new Date(user.passwordChangedAt) > dayAgo) {
                return res.render('changePassword', {
                    title: 'Change Password', layout: 'main', user: currentUser,
                    error: 'Password can only be changed once per 24 hours.'
                });
            }
        }

        // Check password reuse (checklist 2.1.10) - check last 5 passwords
        const previousPasswords = user.previousPasswords || [];
        for (const oldHash of previousPasswords) {
            const reused = await bcrypt.compare(newPassword, oldHash);
            if (reused) {
                return res.render('changePassword', {
                    title: 'Change Password', layout: 'main', user: currentUser,
                    error: 'Cannot reuse a recent password.'
                });
            }
        }

        // Hash and save new password
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        
        // Keep last 5 passwords
        previousPasswords.push(user.password);
        if (previousPasswords.length > 5) previousPasswords.shift();

        await userModel.updateUser(currentUser.username, {
            password: hashedPassword,
            passwordChangedAt: new Date(),
            previousPasswords: previousPasswords
        });

        await auditModel.logEvent({
            userId: user._id, username: user.username, role: user.role,
            action: auditModel.ACTIONS.PASSWORD_CHANGE,
            details: { reason: 'Password changed successfully' },
            ip: req.ip, success: true
        });

        // Update session
        req.session.user.password = hashedPassword;

        res.render('changePassword', {
            title: 'Change Password', layout: 'main', user: req.session.user,
            success: 'Password changed successfully!'
        });
    } catch (error) {
        console.error('Change password error:', error);
        res.render('changePassword', {
            title: 'Change Password', layout: 'main', user: req.session.user,
            error: 'An error occurred. Please try again.'
        });
    }
}

// Password complexity validation (checklist 2.1.5, 2.1.6)
function validatePassword(password) {
    if (password.length < 8) return 'Password must be at least 8 characters long.';
    if (password.length > 64) return 'Password must not exceed 64 characters.';
    if (!/[A-Z]/.test(password)) return 'Password must contain at least one uppercase letter.';
    if (!/[a-z]/.test(password)) return 'Password must contain at least one lowercase letter.';
    if (!/[0-9]/.test(password)) return 'Password must contain at least one digit.';
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) return 'Password must contain at least one special character.';
    return null;
}

module.exports = {
    dashboard,
    createUser,
    deleteUser,
    changeUserRole,
    viewLogs,
    changePasswordPage,
    changePassword,
    validatePassword
};
