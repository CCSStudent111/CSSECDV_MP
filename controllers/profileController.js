const bcrypt = require("bcrypt");
const userModel = require('../models/userModel');
const tempuserhehe = require('../models/tempuserhehe');

//user login
async function login(req, res) {
    try {
        const { username, password } = req.body;

        // Ensure password is a string (prevent array issues)
        const plainPassword = Array.isArray(password) ? password[0] : password;

        // Retrieve user from database
        const user = await userModel.getuserUsername(username);

        if (!user) {
            return res.render('login', { 
                title: 'Login', 
                layout: 'loginLayout', 
                error: 'Invalid username or password' 
            });
        }

        console.log('Entered Password:', plainPassword);
        console.log('Stored Hashed Password:', user.password);

        // Compare password
        const isMatch = await bcrypt.compare(plainPassword, user.password);
        console.log('Password Match:', isMatch);

        if (isMatch) {
            tempuserhehe.setcurrentUser(req, user);
            return res.redirect('/');
        } else {
            return res.render('login', { 
                title: 'Login', 
                layout: 'loginLayout', 
                error: 'Invalid username or password' 
            });
        }
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).render('login', { 
            title: 'Login', 
            layout: 'loginLayout', 
            error: 'Server error. Please try again later.' 
        });
    }
}

async function register(req, res) {
    try {
        const { email, password, username } = req.body;

        // Ensure password is always a string
        const plainPassword = Array.isArray(password) ? password[0] : String(password);

        // Validate input
        if (!email || !plainPassword || !username) {
            return res.render('register', { 
                title: 'Register', 
                layout: 'loginLayout', 
                error: 'All fields are required.' 
            });
        }

        // Check if username already exists
        const existingUser = await userModel.getuserUsername(username);
        if (existingUser) {
            return res.render('register', { 
                title: 'Register', 
                layout: 'loginLayout', 
                error: 'This username is already used, please use another one.' 
            });
        }

        // Hash password correctly
        const hashedPassword = await bcrypt.hash(plainPassword, 10);
        console.log('Plain Password:', plainPassword);
        console.log('Hashed Password:', hashedPassword);

        // Save user
        const newUser = await userModel.createUser({ 
            username, 
            password: hashedPassword, 
            email 
        });

        // Set the current user
        tempuserhehe.setcurrentUser(req, {
            username,
            email, 
            password: hashedPassword,
            _id: newUser.insertedId,
            joinDate: new Date(),
            posts: 0,
            comments: 0
        });

        // Redirect to home page
        return res.redirect('/'); 
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).render('register', { 
            title: 'Register', 
            layout: 'loginLayout', 
            error: 'Server error. Please try again later.' 
        });
    }
}

// logout
function logout(req, res) {
    tempuserhehe.setcurrentUser(req, null);
    res.render('logout', { title: 'Logout' });
}

module.exports = {
    login,
    register,
    logout
};