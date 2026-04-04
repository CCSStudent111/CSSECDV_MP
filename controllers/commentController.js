const commentModel = require('../models/commentModel');
const tempuserhehe = require('../models/tempuserhehe');
const userModel = require('../models/userModel');

//add comment
async function addComment(req, res) {
    try {
        const { content, postId } = req.body;
        
        //go to login if no temp user
        const currentUser = tempuserhehe.getcurrentUser(req);
        if (!currentUser) {
            return res.redirect('/login');
        }
        await commentModel.createComment({
            postId,
            author: currentUser.username,
            content
        });
        
        // increment user comment count
        await userModel.updateUser(currentUser.username, {
            comments: currentUser.comments + 1
        });
        currentUser.comments += 1;
        
        res.redirect('/post/' + postId);
    } catch (error) {
        console.error('Error adding the comment:', error);
        res.status(500).send('Error adding the comment');
    }
}

//delete comment
async function deleteComment(req, res) {
    try {
        const cID = req.params.id;
        const comment = await commentModel.getsinglecommentID(cID);
        
        if (!comment) {
            return res.status(404).send('comment not found.');
        }
        
        // get temp user
        const currentUser = tempuserhehe.getcurrentUser(req);
        if (!currentUser) {
            return res.redirect('/login');
        }
        
        // check account ownership
        if (comment.author !== currentUser.username) {
            return res.status(403).send('You are not authorized to delete this comment');
        }
        
        await commentModel.deleteComment(cID);
        
        // decerement the comment count
        await userModel.updateUser(currentUser.username, {
            comments: Math.max(0, currentUser.comments - 1)
        });
        currentUser.comments = Math.max(0, currentUser.comments - 1);
        
        res.redirect('/post/' + comment.postId);
    } catch (error) {
        console.error('Error deleting the comment:', error);
        res.status(500).send('Error deleting the comment');
    }
}

async function editComment(req, res) {
    try {
        const commentId = req.params.id;
        const { content } = req.body;
        const comment = await commentModel.getsinglecommentID(commentId);
        
        if (!comment) {
            return res.status(404).json({ success: false, error: 'Comment not found.' });
        }
        
        const currentUser = tempuserhehe.getcurrentUser(req);
        if (!currentUser) {
            return res.status(401).json({ success: false, error: 'login.. to edit comment.' });
        }
        
        if (comment.author !== currentUser.username) {
            return res.status(403).json({ success: false, error: 'cannot edit commet because you do not own comment (temp warning)' });
        }
        
        await commentModel.updateComment(commentId, content);
        
        res.json({ success: true });
    } catch (error) {
        console.error('error editing the comment:', error);
        res.status(500).json({ success: false, error: 'error edit comment function not working' });
    }
}

module.exports = {
    addComment,
    deleteComment,
    editComment
};