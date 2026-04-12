const bcrypt = require("bcrypt");
const userModel = require('../models/userModel');
const auditModel = require('../models/auditModel');
const postModel = require('../models/postModel');
const { ROLES } = require('../middleware/authMiddleware');

// Render manager dashboard with user list
async function dashboard(req, res) {
    try {
        const posts = await postModel.viewallPost();
        const users = await userModel.getAllUsers();
        const currentUser = req.session.user;
        
        res.render('managerDashboard', {
            title: 'Manager Dashboard',
            layout: 'adminLayout',
            users: users,
            posts: posts,
            user: currentUser,
            roles: ROLES
        });
    } catch (error) {
        console.error('Manager dashboard error:', error);
        res.status(500).render('error', { title: 'Error', message: 'Failed to load dashboard.', layout: 'main' });
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

async function deletePost(req, res) {
    try {
        const postId = req.params.id;
        const currentUser = req.session.user;

        const targetPost = await postModel.getPostById(postId);
        if(!targetPost) {
            return res.status(404).render('error', { title: 'Error', message: 'Post not found.', layout: 'main' });
        }

        await postModel.deletePost(postId);
        await auditModel.logEvent({
            userId: currentUser._id, username: currentUser.username, role: currentUser.role,
            action: auditModel.ACTIONS.POST_DELETE,
            details: { deletedPostId: postId, deletedPostTitle: targetPost.title },
            ip: req.ip, success: true
        });

        res.redirect('/manager?success=Post deleted');
    } catch (error) {
        console.error('Delete post error:', error);
        res.status(500).render('error', { title: 'Error', message: 'Failed to delete post.', layout: 'main' });
    }
}

module.exports = {
    dashboard,
    deleteUser,
    changeUserRole,
    viewLogs,
    changePasswordPage,
    changePassword,
    validatePassword,
    deletePost
};
