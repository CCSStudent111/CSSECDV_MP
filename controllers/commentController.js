const commentModel = require('../models/commentModel');
const tempuserhehe = require('../models/tempuserhehe');
const userModel = require('../models/userModel');
const auditModel = require('../models/auditModel');

//add comment
async function addComment(req, res) {
    try {
        const { content, postId } = req.body;
        
        const currentUser = tempuserhehe.getcurrentUser(req);
        if (!currentUser) {
            return res.redirect('/login');
        }

        // Input validation (checklist 2.3)
        if (!content || content.trim().length === 0) {
            return res.redirect('/post/' + postId);
        }
        if (content.length > 5000) {
            return res.redirect('/post/' + postId + '?error=Comment too long');
        }

        await commentModel.createComment({
            postId,
            author: currentUser.username,
            content
        });
        
        await userModel.updateUser(currentUser.username, {
            comments: currentUser.comments + 1
        });
        currentUser.comments += 1;

        await auditModel.logEvent({
            userId: currentUser._id, username: currentUser.username, role: currentUser.role,
            action: auditModel.ACTIONS.COMMENT_CREATE,
            details: { postId: postId },
            ip: req.ip, success: true
        });
        
        res.redirect('/post/' + postId);
    } catch (error) {
        console.error('Error adding the comment:', error);
        res.status(500).render('error', { title: 'Error', message: 'Error adding comment.', layout: 'main' });
    }
}

//delete comment - owner or admin
async function deleteComment(req, res) {
    try {
        const cID = req.params.id;
        const comment = await commentModel.getsinglecommentID(cID);
        
        if (!comment) {
            return res.status(404).render('error', { title: 'Not Found', message: 'Comment not found.', layout: 'main' });
        }
        
        const currentUser = tempuserhehe.getcurrentUser(req);
        if (!currentUser) {
            return res.redirect('/login');
        }
        
        // Allow owner or admin to delete
        if (comment.author !== currentUser.username && currentUser.role !== 'admin') {
            await auditModel.logEvent({
                userId: currentUser._id, username: currentUser.username, role: currentUser.role,
                action: auditModel.ACTIONS.ACCESS_DENIED,
                details: { resource: 'comment', commentId: cID, action: 'delete' },
                ip: req.ip, success: false
            });
            return res.status(403).render('error', { title: 'Access Denied', message: 'You cannot delete this comment.', layout: 'main' });
        }
        
        await commentModel.deleteComment(cID);
        
        // Decrement the author's comment count
        const commentAuthor = await userModel.getuserUsername(comment.author);
        if (commentAuthor) {
            await userModel.updateUser(comment.author, {
                comments: Math.max(0, commentAuthor.comments - 1)
            });
        }
        if (currentUser.username === comment.author) {
            currentUser.comments = Math.max(0, currentUser.comments - 1);
        }

        await auditModel.logEvent({
            userId: currentUser._id, username: currentUser.username, role: currentUser.role,
            action: auditModel.ACTIONS.COMMENT_DELETE,
            details: { commentId: cID, postId: comment.postId, commentAuthor: comment.author },
            ip: req.ip, success: true
        });
        
        res.redirect('/post/' + comment.postId);
    } catch (error) {
        console.error('Error deleting the comment:', error);
        res.status(500).render('error', { title: 'Error', message: 'Error deleting comment.', layout: 'main' });
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
            return res.status(401).json({ success: false, error: 'Please log in to edit comments.' });
        }
        
        // Allow owner or admin to edit
        if (comment.author !== currentUser.username && currentUser.role !== 'admin') {
            await auditModel.logEvent({
                userId: currentUser._id, username: currentUser.username, role: currentUser.role,
                action: auditModel.ACTIONS.ACCESS_DENIED,
                details: { resource: 'comment', commentId: commentId, action: 'edit' },
                ip: req.ip, success: false
            });
            return res.status(403).json({ success: false, error: 'You cannot edit this comment.' });
        }

        // Validate content length
        if (!content || content.trim().length === 0 || content.length > 5000) {
            return res.status(400).json({ success: false, error: 'Invalid comment content.' });
        }
        
        await commentModel.updateComment(commentId, content);

        await auditModel.logEvent({
            userId: currentUser._id, username: currentUser.username, role: currentUser.role,
            action: auditModel.ACTIONS.COMMENT_UPDATE,
            details: { commentId: commentId, postId: comment.postId },
            ip: req.ip, success: true
        });
        
        res.json({ success: true });
    } catch (error) {
        console.error('error editing the comment:', error);
        res.status(500).json({ success: false, error: 'Error editing comment.' });
    }
}

module.exports = {
    addComment,
    deleteComment,
    editComment
};