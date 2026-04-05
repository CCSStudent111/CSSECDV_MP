// Role constants - used across the app
const ROLES = {
    ADMIN: 'admin',
    MANAGER: 'manager',
    CUSTOMER: 'customer'
};

// Check if user is authenticated
function requireAuth(req, res, next) {
    if (!req.session || !req.session.user) {
        return res.redirect('/login');
    }
    next();
}

// Check if user has one of the allowed roles
function requireRole(...roles) {
    return (req, res, next) => {
        if (!req.session || !req.session.user) {
            return res.redirect('/login');
        }
        const userRole = req.session.user.role;
        if (!roles.includes(userRole)) {
            return res.status(403).render('error', {
                title: 'Access Denied',
                message: 'You do not have permission to access this page.',
                layout: 'main'
            });
        }
        next();
    };
}

// Check if user is the owner of a resource OR has an elevated role
function requireOwnerOrRole(getAuthor, ...roles) {
    return async (req, res, next) => {
        if (!req.session || !req.session.user) {
            return res.redirect('/login');
        }
        const userRole = req.session.user.role;
        // If user has one of the allowed roles, allow
        if (roles.includes(userRole)) {
            return next();
        }
        // Otherwise check ownership
        try {
            const author = await getAuthor(req);
            if (author === req.session.user.username) {
                return next();
            }
            return res.status(403).render('error', {
                title: 'Access Denied',
                message: 'You do not have permission to perform this action.',
                layout: 'main'
            });
        } catch (err) {
            return res.status(500).render('error', {
                title: 'Error',
                message: 'An error occurred.',
                layout: 'main'
            });
        }
    };
}

module.exports = { ROLES, requireAuth, requireRole, requireOwnerOrRole };
