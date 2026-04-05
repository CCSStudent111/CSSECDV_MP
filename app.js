const express = require('express');
const session = require('express-session'); 
const path = require('path');
const exphbs = require('express-handlebars');
const bodyParser = require('body-parser');
const { initializeDatabase } = require('./models/dbInit');
const tempuserhehe = require('./models/tempuserhehe');
const { requireAuth, requireRole, ROLES } = require('./middleware/authMiddleware');
const auditModel = require('./models/auditModel');

const app = express();

// Initialize database (comment out to prevent reset)
initializeDatabase().catch(console.error);

// Middleware to parse incoming request data
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Set up session middleware
app.use(session({
    secret: 'my_secret_key',
    resave: false,
    saveUninitialized: true,
    cookie: {
        httpOnly: true, 
        secure: process.env.NODE_ENV === 'production',
        maxAge: 30 * 24 * 60 * 60 * 1000,
    }
}));

// Controller files
const profileController = require('./controllers/profileController');
const postController = require('./controllers/postController');
const commentController = require('./controllers/commentController');
const adminController = require('./controllers/adminController');

// Handlebars setup with helpers
const hbs = exphbs.create({
    extname: 'hbs',
    defaultLayout: 'main',
    layoutsDir: path.join(__dirname, 'views/layouts'),
    partialsDir: path.join(__dirname, 'views/partials'),
    helpers: {
        eq: function(a, b) { return a === b; },
        gt: function(a, b) { return a > b; },
        lt: function(a, b) { return a < b; },
        add: function(a, b) { return a + b; },
        subtract: function(a, b) { return a - b; },
        json: function(context) { return JSON.stringify(context); }
    }
});

app.engine('hbs', hbs.engine);
app.set('view engine', 'hbs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Make current user available to all views
app.use((req, res, next) => {
    res.locals.currentUser = tempuserhehe.getcurrentUser(req);
    // Pass query params for alerts
    res.locals.error = req.query.error || null;
    res.locals.success = req.query.success || null;
    next();
});

// ===== PUBLIC ROUTES (no auth required) =====
app.get('/login', (req, res) => res.render('login', { title: 'Login', layout: 'loginLayout' }));
app.get('/register', (req, res) => res.render('register', { title: 'Register', layout: 'loginLayout' }));
app.post('/login', profileController.login);
app.post('/register', profileController.register);

// ===== AUTHENTICATED ROUTES =====
app.get('/', postController.viewallPost);
app.get('/logout', profileController.logout);
app.get('/post/:id', postController.getpostID);

// Post routes (require auth)
app.post('/post/create', requireAuth, postController.createPost);
app.post('/post/update/:id', requireAuth, postController.updatePost);
app.post('/post/delete/:id', requireAuth, postController.deletePost);
app.post('/post/like/:id', postController.likePost);
app.post('/post/dislike/:id', postController.dislikePost);
app.get('/post/edit/:id', requireAuth, postController.editPost);

// Comment routes (require auth)
app.post('/comment/add', requireAuth, commentController.addComment);
app.post('/comment/edit/:id', requireAuth, commentController.editComment);
app.post('/comment/delete/:id', requireAuth, commentController.deleteComment);

// Password change (any authenticated user)
app.get('/change-password', requireAuth, adminController.changePasswordPage);
app.post('/change-password', requireAuth, adminController.changePassword);

// ===== ADMIN ROUTES (admin only) =====
app.get('/admin', requireAuth, requireRole(ROLES.ADMIN), adminController.dashboard);
app.post('/admin/user/create', requireAuth, requireRole(ROLES.ADMIN), adminController.createUser);
app.post('/admin/user/delete/:id', requireAuth, requireRole(ROLES.ADMIN), adminController.deleteUser);
app.post('/admin/user/role/:id', requireAuth, requireRole(ROLES.ADMIN), adminController.changeUserRole);
app.get('/admin/logs', requireAuth, requireRole(ROLES.ADMIN), adminController.viewLogs);

// Middleware to protect routes (ensure the user is authenticated)
function authenticateSession(req, res, next) {
    if (!req.session.user) {
        return res.status(401).json({ message: 'Unauthorized' });
    }
    next();
}

// Profile Route - Only accessible to authenticated users
app.get('/profile', authenticateSession, (req, res) => {
    res.status(200).json({ message: 'Welcome to your profile', user: req.session.user });
});

// Logout Route (POST) - Destroys the session
app.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            return res.status(500).json({ message: 'Could not log out' });
        }
        res.clearCookie('connect.sid');
        res.status(200).json({ message: 'Logged out successfully' });
    });
});

// 404 handler
app.use((req, res) => {
    res.status(404).render('error', {
        title: 'Page Not Found',
        message: 'The page you are looking for does not exist.',
        layout: 'main'
    });
});

// Global error handler (checklist 2.4.1, 2.4.2 - no debug info)
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).render('error', {
        title: 'Server Error',
        message: 'An unexpected error occurred. Please try again later.',
        layout: 'main'
    });
});

// Start the Express server
app.listen(3000, () => {
    console.log('Server running on http://localhost:3000');
});