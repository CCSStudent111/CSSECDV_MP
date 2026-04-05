const { MongoClient } = require('mongodb');
const dURL = "mongodb://127.0.0.1:27017/";
const client = new MongoClient(dURL);
const bcrypt = require("bcrypt");

const databaseName = "forumdb";
const usersCollection = "users";
const postsCollection = "posts";
const commentsCollection = "comments";
const auditLogsCollection = "audit_logs";

// Sample data with roles
const sampleUsers = [
    { username: "Admin", password: "Admin@12345", email: "admin@forum.com", role: "admin", joinDate: new Date(), posts: 0, comments: 0, status: "active", failedLoginAttempts: 0, lockUntil: null, lastLogin: null, passwordChangedAt: new Date(), previousPasswords: [] },
    { username: "Manager1", password: "Manager@12345", email: "manager@forum.com", role: "manager", joinDate: new Date(), posts: 0, comments: 0, status: "active", failedLoginAttempts: 0, lockUntil: null, lastLogin: null, passwordChangedAt: new Date(), previousPasswords: [] },
    { username: "Anime_Girl79", password: "Anime@Girl79", email: "anime@example.com", role: "customer", joinDate: new Date(), posts: 2, comments: 3, status: "active", failedLoginAttempts: 0, lockUntil: null, lastLogin: null, passwordChangedAt: new Date(), previousPasswords: [] },
    { username: "Brainrot", password: "Brainrot@45", email: "brain@example.com", role: "customer", joinDate: new Date(), posts: 1, comments: 1, status: "active", failedLoginAttempts: 0, lockUntil: null, lastLogin: null, passwordChangedAt: new Date(), previousPasswords: [] },
    { username: "Hater", password: "Hater@1234", email: "hater@example.com", role: "customer", joinDate: new Date(), posts: 0, comments: 5, status: "active", failedLoginAttempts: 0, lockUntil: null, lastLogin: null, passwordChangedAt: new Date(), previousPasswords: [] },
    { username: "Randymarsh", password: "Randy@marsh1", email: "randy@example.com", role: "customer", joinDate: new Date(), posts: 3, comments: 2, status: "active", failedLoginAttempts: 0, lockUntil: null, lastLogin: null, passwordChangedAt: new Date(), previousPasswords: [] },
    { username: "Skibidi", password: "Skibidi@123", email: "skibidi@example.com", role: "customer", joinDate: new Date(), posts: 0, comments: 0, status: "active", failedLoginAttempts: 0, lockUntil: null, lastLogin: null, passwordChangedAt: new Date(), previousPasswords: [] }
];

const samplePosts = [
    { 
        title: "I NEED HELP",
        content: "Can someone please help me with my assignment? I'm stuck on question 3.",
        author: "Brainrot",
        category: "text",
        tags: ["#subject", "#help", "#study"],
        createdAt: new Date(),
        updatedAt: new Date(),
        likes: 5,
        dislikes: 2
    },
    { 
        title: "Best professor for CSARCH2?",
        content: "Looking for recommendations for CSARCH2 professors. Who's the best in terms of teaching and grading?",
        author: "Anime_Girl79",
        category: "text",
        tags: ["#prof", "#subject"],
        createdAt: new Date(),
        updatedAt: new Date(),
        likes: 12,
        dislikes: 0
    },
    { 
        title: "Campus drama - You won't believe what happened today!",
        content: "I saw someone steal food from the cafeteria today. Should I report them?",
        author: "Randymarsh",
        category: "text",
        tags: ["#drama", "#rant"],
        createdAt: new Date(),
        updatedAt: new Date(),
        likes: 8,
        dislikes: 3
    },
    { 
        title: "Study group for finals?",
        content: "Anyone want to form a study group for the upcoming finals? We can meet at the library.",
        author: "Anime_Girl79",
        category: "text",
        tags: ["#study", "#help"],
        createdAt: new Date(),
        updatedAt: new Date(),
        likes: 15,
        dislikes: 0
    },
    { 
        title: "This professor is terrible!",
        content: "I'm in this class and the professor never explains anything clearly. Anyone else feeling the same?",
        author: "Randymarsh",
        category: "text",
        tags: ["#prof", "#rant"],
        createdAt: new Date(),
        updatedAt: new Date(),
        likes: 20,
        dislikes: 5
    }
];

const sampleComments = [
    {
        postId: "", 
        author: "StrongHelper",
        content: "Ok I will help!",
        createdAt: new Date()
    },
    {
        postId: "", 
        author: "Brainrot",
        content: "frfr",
        createdAt: new Date()
    },
    {
        postId: "", 
        author: "Hater",
        content: "Just figure it out yourself lol",
        createdAt: new Date()
    },
    {
        postId: "", 
        author: "Anime_Girl79",
        content: "I had that professor too. Try watching YouTube tutorials, they helped me a lot!",
        createdAt: new Date()
    },
    {
        postId: "",
        author: "Hater",
        content: "You're overreacting. The professor is fine.",
        createdAt: new Date()
    }
];

async function initializeDatabase() {
    try {
        const conn = await client.connect();
        console.log('Connected to MongoDB at ' + dURL);
        
        const db = client.db(databaseName);

        // Ensure collections exist
        const collections = await db.listCollections().toArray();
        const collectionNames = collections.map(c => c.name);
        
        if (!collectionNames.includes(auditLogsCollection)) {
            await db.createCollection(auditLogsCollection);
            // Create index for faster log queries
            await db.collection(auditLogsCollection).createIndex({ timestamp: -1 });
            await db.collection(auditLogsCollection).createIndex({ action: 1 });
            console.log('Created audit_logs collection with indexes');
        }

        // Check if collections are empty before inserting sample data
        const usersCount = await db.collection(usersCollection).countDocuments();
        const postsCount = await db.collection(postsCollection).countDocuments();
        const commentsCount = await db.collection(commentsCollection).countDocuments();

        if (usersCount === 0) {
            const hashedUsers = await hashPasswords(sampleUsers);
            await db.collection(usersCollection).insertMany(hashedUsers);
            console.log('Inserted sample users (with roles: admin, manager, customer)');
        }
        if (postsCount === 0) {
            const postsResult = await db.collection(postsCollection).insertMany(samplePosts);
            const postIds = Object.values(postsResult.insertedIds);

            sampleComments[0].postId = postIds[0].toString();
            sampleComments[1].postId = postIds[0].toString();
            sampleComments[2].postId = postIds[1].toString();
            sampleComments[3].postId = postIds[2].toString();
            sampleComments[4].postId = postIds[4].toString();

            if (commentsCount === 0) {
                await db.collection(commentsCollection).insertMany(sampleComments);
            }
            console.log('Inserted sample posts and comments');
        }

        // Log initial seed event
        await db.collection(auditLogsCollection).insertOne({
            timestamp: new Date(),
            userId: null,
            username: 'SYSTEM',
            role: 'system',
            action: 'SYSTEM_INIT',
            details: { message: 'Database initialized' },
            ip: '127.0.0.1',
            success: true
        });

    } catch (error) {
        console.error('Error initializing the database:', error);
    } finally {
        await client.close();
    }
}

async function hashPasswords(users) {
    for(let user of users) {
        const hashedPassword = await bcrypt.hash(user.password, 10);
        user.password = hashedPassword;
    }
    return users;
}

function connectToMongo(callback) {
    client.connect()
        .then(() => {
            console.log("Connected to MongoDB");
            callback();
        })
        .catch(err => {
            console.error("MongoDB Connection Error:", err);
            callback(err);
        });
}

function getDb(dbName = "forumdb") {
    return client.db(dbName);
}

function signalHandler() {
    console.log("Closing MongoDB Connection...");
    client.close()
        .then(() => {
            console.log("MongoDB Connection Closed");
            process.exit();
        })
        .catch(err => {
            console.error("Error closing MongoDB connection:", err);
            process.exit(1);
        });
}

module.exports = { initializeDatabase, connectToMongo, getDb };
process.on("SIGINT", signalHandler);
process.on("SIGTERM", signalHandler);
process.on("SIGQUIT", signalHandler);