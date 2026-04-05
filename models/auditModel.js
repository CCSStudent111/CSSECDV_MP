const { MongoClient } = require('mongodb');
const dURL = "mongodb://127.0.0.1:27017/";
const client = new MongoClient(dURL);
const dbName = "forumdb";
const collection = "audit_logs";

async function connect() {
    await client.connect();
    return client.db(dbName).collection(collection);
}

// Log an audit event
async function logEvent({ userId, username, role, action, details, ip, success }) {
    try {
        const db = await connect();
        await db.insertOne({
            timestamp: new Date(),
            userId: userId || null,
            username: username || 'unknown',
            role: role || 'unknown',
            action: action,
            details: details || {},
            ip: ip || 'unknown',
            success: success !== undefined ? success : true
        });
    } catch (error) {
        console.error('Audit log error:', error);
    }
}

// Get paginated logs with optional filters
async function getLogs(filters = {}, page = 1, limit = 20) {
    const db = await connect();
    const query = {};

    if (filters.action) query.action = filters.action;
    if (filters.username) query.username = { $regex: filters.username, $options: 'i' };
    if (filters.startDate || filters.endDate) {
        query.timestamp = {};
        if (filters.startDate) query.timestamp.$gte = new Date(filters.startDate);
        if (filters.endDate) query.timestamp.$lte = new Date(filters.endDate + 'T23:59:59');
    }

    const skip = (page - 1) * limit;
    return await db.find(query).sort({ timestamp: -1 }).skip(skip).limit(limit).toArray();
}

// Get total count for pagination
async function getLogCount(filters = {}) {
    const db = await connect();
    const query = {};

    if (filters.action) query.action = filters.action;
    if (filters.username) query.username = { $regex: filters.username, $options: 'i' };
    if (filters.startDate || filters.endDate) {
        query.timestamp = {};
        if (filters.startDate) query.timestamp.$gte = new Date(filters.startDate);
        if (filters.endDate) query.timestamp.$lte = new Date(filters.endDate + 'T23:59:59');
    }

    return await db.countDocuments(query);
}

// Action type constants
const ACTIONS = {
    LOGIN_SUCCESS: 'LOGIN_SUCCESS',
    LOGIN_FAILURE: 'LOGIN_FAILURE',
    LOGOUT: 'LOGOUT',
    REGISTER: 'REGISTER',
    POST_CREATE: 'POST_CREATE',
    POST_UPDATE: 'POST_UPDATE',
    POST_DELETE: 'POST_DELETE',
    COMMENT_CREATE: 'COMMENT_CREATE',
    COMMENT_UPDATE: 'COMMENT_UPDATE',
    COMMENT_DELETE: 'COMMENT_DELETE',
    USER_CREATE: 'USER_CREATE',
    USER_DELETE: 'USER_DELETE',
    USER_ROLE_CHANGE: 'USER_ROLE_CHANGE',
    PASSWORD_CHANGE: 'PASSWORD_CHANGE',
    ACCESS_DENIED: 'ACCESS_DENIED',
    ACCOUNT_LOCKED: 'ACCOUNT_LOCKED',
    VALIDATION_FAILURE: 'VALIDATION_FAILURE'
};

module.exports = { logEvent, getLogs, getLogCount, ACTIONS };
