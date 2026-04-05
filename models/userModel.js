const { MongoClient, ObjectId } = require('mongodb');
const dURL = "mongodb://127.0.0.1:27017/";
const client = new MongoClient(dURL);
const dbName = "forumdb";
const collection = "users";


async function connect() {
    await client.connect();
    return client.db(dbName).collection(collection);
}

// get all users
async function getAllUsers() {
    const db = await connect();
    return await db.find({}).toArray();
}

// get user by username
async function getuserUsername(username) {
    const db = await connect();
    return await db.findOne({ username: username });
}

// get user by ID
async function getUserById(id) {
    const db = await connect();
    return await db.findOne({ _id: new ObjectId(id) });
}

// get users by role
async function getAllUsersByRole(role) {
    const db = await connect();
    return await db.find({ role: role }).toArray();
}

// create a new user
async function createUser(userData) {
    const db = await connect();
    
    userData.joinDate = new Date();
    userData.posts = 0;
    userData.comments = 0;
    userData.role = userData.role || 'customer';
    userData.status = 'active';
    userData.failedLoginAttempts = 0;
    userData.lockUntil = null;
    userData.lastLogin = null;
    userData.passwordChangedAt = new Date();
    userData.previousPasswords = [];
    
    return await db.insertOne(userData);
}

// update user
async function updateUser(username, updates) {
    const db = await connect();
    return await db.updateOne({ username: username }, { $set: updates });
}

// update user by ID
async function updateUserById(id, updates) {
    const db = await connect();
    return await db.updateOne({ _id: new ObjectId(id) }, { $set: updates });
}

// delete user by ID
async function deleteUser(id) {
    const db = await connect();
    return await db.deleteOne({ _id: new ObjectId(id) });
}

// increment failed login attempts
async function incrementFailedLogins(username) {
    const db = await connect();
    const user = await db.findOne({ username: username });
    const attempts = (user.failedLoginAttempts || 0) + 1;
    const updates = { failedLoginAttempts: attempts };
    
    // Lock account after 5 failed attempts for 15 minutes
    if (attempts >= 5) {
        updates.lockUntil = new Date(Date.now() + 15 * 60 * 1000);
        updates.status = 'locked';
    }
    
    return await db.updateOne({ username: username }, { $set: updates });
}

// reset failed login attempts
async function resetFailedLogins(username) {
    const db = await connect();
    return await db.updateOne({ username: username }, { 
        $set: { failedLoginAttempts: 0, lockUntil: null, status: 'active' } 
    });
}

// check if account is locked
function isAccountLocked(user) {
    if (user.lockUntil && new Date(user.lockUntil) > new Date()) {
        return true;
    }
    return false;
}

async function closeConnection() {
    await client.close();
}

module.exports = {
    getAllUsers,
    getuserUsername,
    getUserById,
    getAllUsersByRole,
    createUser,
    updateUser,
    updateUserById,
    deleteUser,
    incrementFailedLogins,
    resetFailedLogins,
    isAccountLocked,
    closeConnection
};
