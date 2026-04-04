const { MongoClient, ObjectId } = require('mongodb');
const dURL = "mongodb://127.0.0.1:27017/";
const client = new MongoClient(dURL);
const dbName = "forumdb";
const collection = "posts";

// connect to the database
async function connect() {
    await client.connect();
    return client.db(dbName).collection(collection);
}

// get all posts
async function viewallPost() {
    const db = await connect();
    return await db.find({}).sort({ createdAt: -1 }).toArray();
}

// get the post based on the id
async function getpostID(id) {
    const db = await connect();
    return await db.findOne({ _id: new ObjectId(id) });
}

// create a new post 
async function createPost(postData) {
    const db = await connect();
    
    // timestamp of created post, still experimental, as well as likes
    postData.createdAt = new Date();
    postData.updatedAt = new Date();
    postData.likes = 0;
    postData.dislikes = 0;
    
    // tags
    if (postData.tags) {
        // convert the tags (string) to array
        postData.tags = postData.tags.split('#')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0)
        .map(tag => '#' + tag);
    } else {
        postData.tags = [];
    }
    
    return await db.insertOne(postData);
}

// update the post
async function updatePost(id, updates) {
    const db = await connect();
    
    // timestamp update
    updates.updatedAt = new Date();
    
    if (updates.tags) {
        updates.tags = updates.tags.split('#')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0)
        .map(tag => '#' + tag);
    }
    
    return await db.updateOne({ _id: new ObjectId(id) }, { $set: updates });
}

// like a post
async function likePost(id) {
    const db = await connect();
    return await db.updateOne({ _id: new ObjectId(id) }, { $inc: { likes: 1 } });
}

// dislike a post
async function dislikePost(id) {
    const db = await connect();
    return await db.updateOne({ _id: new ObjectId(id) }, { $inc: { dislikes: 1 } });
}

// delete the post
async function deletePost(id) {
    const db = await connect();
    return await db.deleteOne({ _id: new ObjectId(id) });
}

// close the connection
async function closeConnection() {
    await client.close();
}


module.exports = {
    viewallPost,
    getpostID,
    createPost,
    updatePost,
    deletePost,
    likePost,
    dislikePost,
    closeConnection
};
