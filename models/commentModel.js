const { MongoClient, ObjectId } = require('mongodb');
const dURL = "mongodb://127.0.0.1:27017/";
const client = new MongoClient(dURL);
const dbName = "forumdb";
const collection = "comments";

async function connect() {
    await client.connect();
    return client.db(dbName).collection(collection);
}

// get comment by id
async function getcommentsbyID(postId) {//gets all the comments for specific post
    const db = await connect();
    return await db.find({ postId: postId }).sort({ createdAt: 1 }).toArray();
}

async function getsinglecommentID(id) { //get a single comment id
    const db = await connect();
    return await db.findOne({ _id: new ObjectId(id) });
}

async function updateComment(id, content) {
    const db = await connect();
    return await db.updateOne({ _id: new ObjectId(id) }, { $set: { content: content,updatedAt: new Date()} });
}
// create a new comment
async function createComment(commentData) {
    const db = await connect();
    // timestamp experimental
    commentData.createdAt = new Date();
    
    return await db.insertOne(commentData);
}
// delete a comment
async function deleteComment(id) {
    const db = await connect();
    return await db.deleteOne({ _id: new ObjectId(id) });
}

async function closeConnection() {
    await client.close();
}

module.exports = {
    getcommentsbyID,
    getsinglecommentID,
    createComment,
    deleteComment,
    updateComment,
    closeConnection
};