const postModel = require('../models/postModel');
const commentModel = require('../models/commentModel');
const userModel = require('../models/userModel');
const tempuserhehe = require('../models/tempuserhehe');
const auditModel = require('../models/auditModel');

//get post
async function viewallPost(req, res) {
    try {
        const posts = await postModel.viewallPost();
        const currentUser = tempuserhehe.getcurrentUser(req) || {
            username: 'Guest',
            email: 'guest@example.com',
            joinDate: new Date().toLocaleDateString(),
            posts: 0,
            comments: 0,
            role: 'guest'
        };
        
        res.render('index', { 
            title: 'Forum Home', 
            posts: posts,
            user: currentUser 
        });

    } catch (error) {
        console.error('Error getting the posts:', error);
        res.status(500).render('error', { title: 'Error', message: 'Error loading posts.', layout: 'main' });
    }
}

//get a single post (w/ comments)
async function getpostID(req, res) {
    try {
        const postId = req.params.id;
        const post = await postModel.getpostID(postId);
        
        if (!post) {
            return res.status(404).render('error', { title: 'Not Found', message: 'Post not found.', layout: 'main' });
        }
        const comments = await commentModel.getcommentsbyID(postId);
        const currentUser = tempuserhehe.getcurrentUser(req) || {
            username: 'Guest',
            email: 'guest@example.com',
            joinDate: new Date().toLocaleDateString(),
            posts: 0,
            comments: 0,
            role: 'guest'
        };
        res.render('post', { 
            title: post.title, 
            post: post,
            comments: comments,
            user: currentUser 
        });
    } catch (error) {
        console.error('Error getting post:', error);
        res.status(500).render('error', { title: 'Error', message: 'Error loading post.', layout: 'main' });
    }
}

// Create a new post
async function createPost(req, res) {
    try {
        const { title, content, category, tags } = req.body;
        
        const currentUser = tempuserhehe.getcurrentUser(req);
        if (!currentUser) {
            return res.redirect('/login');
        }

        // Input validation (checklist 2.3)
        if (!title || !content) {
            return res.redirect('/?error=Title and content are required');
        }
        if (title.length > 200) {
            return res.redirect('/?error=Title too long');
        }
        if (content.length > 10000) {
            return res.redirect('/?error=Content too long');
        }

        const Post = await postModel.createPost({
            title,
            content,
            author: currentUser.username,
            category,
            tags
        });
        
        await userModel.updateUser(currentUser.username, {
            posts: currentUser.posts + 1
        });
        currentUser.posts += 1;

        await auditModel.logEvent({
            userId: currentUser._id, username: currentUser.username, role: currentUser.role,
            action: auditModel.ACTIONS.POST_CREATE,
            details: { postTitle: title },
            ip: req.ip, success: true
        });
        
        res.redirect('/');
    } catch (error) {
        console.error('error creating the post:', error);
        res.status(500).render('error', { title: 'Error', message: 'Error creating post.', layout: 'main' });
    }
}

//update post
async function updatePost(req, res) {
    try {
        const postId = req.params.id;
        const { title, content, tags } = req.body;
        
        const currentUser = tempuserhehe.getcurrentUser(req);
        if (!currentUser) {
            return res.redirect('/login');
        }
        
        const post = await postModel.getpostID(postId);
        // Allow owner or admin
        if (post.author !== currentUser.username && currentUser.role !== 'admin') {
            await auditModel.logEvent({
                userId: currentUser._id, username: currentUser.username, role: currentUser.role,
                action: auditModel.ACTIONS.ACCESS_DENIED,
                details: { resource: 'post', postId: postId, action: 'update' },
                ip: req.ip, success: false
            });
            return res.status(403).render('error', { title: 'Access Denied', message: 'You cannot edit this post.', layout: 'main' });
        }
        
        await postModel.updatePost(postId, { title, content, tags });

        await auditModel.logEvent({
            userId: currentUser._id, username: currentUser.username, role: currentUser.role,
            action: auditModel.ACTIONS.POST_UPDATE,
            details: { postId: postId, postTitle: title },
            ip: req.ip, success: true
        });
        
        res.redirect('/post/' + postId);
    } catch (error) {
        console.error('Error updating the post:', error);
        res.status(500).render('error', { title: 'Error', message: 'Error updating post.', layout: 'main' });
    }
}

// delete post - owner or admin
async function deletePost(req, res) {
    try {
        const postId = req.params.id;
        
        const currentUser = tempuserhehe.getcurrentUser(req);
        if (!currentUser) {
            return res.redirect('/login');
        }
        
        const post = await postModel.getpostID(postId);
        if (post.author !== currentUser.username && currentUser.role !== 'admin') {
            await auditModel.logEvent({
                userId: currentUser._id, username: currentUser.username, role: currentUser.role,
                action: auditModel.ACTIONS.ACCESS_DENIED,
                details: { resource: 'post', postId: postId, action: 'delete' },
                ip: req.ip, success: false
            });
            return res.status(403).render('error', { title: 'Access Denied', message: 'You cannot delete this post.', layout: 'main' });
        }
        
        await postModel.deletePost(postId);
        
        // Decrement the author's post count
        const postAuthor = await userModel.getuserUsername(post.author);
        if (postAuthor) {
            await userModel.updateUser(post.author, {
                posts: Math.max(0, postAuthor.posts - 1)
            });
        }
        if (currentUser.username === post.author) {
            currentUser.posts = Math.max(0, currentUser.posts - 1);
        }

        await auditModel.logEvent({
            userId: currentUser._id, username: currentUser.username, role: currentUser.role,
            action: auditModel.ACTIONS.POST_DELETE,
            details: { postId: postId, postTitle: post.title, postAuthor: post.author },
            ip: req.ip, success: true
        });
        
        res.redirect('/');
    } catch (error) {
        console.error('Error deleting the post:', error);
        res.status(500).render('error', { title: 'Error', message: 'Error deleting post.', layout: 'main' });
    }
}

//like post
async function likePost(req, res) {
    try {
        const postId = req.params.id;
        await postModel.likePost(postId);
        res.json({ success: true });
    } catch (error) {
        console.error('Error liking the post:', error);
        res.status(500).json({ success: false, error: 'Error liking post.' });
    }
}

//dislike post
async function dislikePost(req, res) {
    try {
        const postId = req.params.id;
        await postModel.dislikePost(postId);
        res.json({ success: true });
    } catch (error) {
        console.error('Error disliking post:', error);
        res.status(500).json({ success: false, error: 'Error disliking post.' });
    }
}

async function editPost(req, res) {
    try {
        const postId = req.params.id;
        const post = await postModel.getpostID(postId);
        
        if (!post) {
            return res.status(404).render('error', { title: 'Not Found', message: 'Post not found.', layout: 'main' });
        }
        const currentUser = tempuserhehe.getcurrentUser(req);
        if (!currentUser) {
            return res.redirect('/login');
        }
        if (post.author !== currentUser.username && currentUser.role !== 'admin') {
            return res.status(403).render('error', { title: 'Access Denied', message: 'You cannot edit this post.', layout: 'main' });
        }
        
        res.render('editPost', { 
            title: 'Edit Post', 
            post: post,
            user: currentUser 
        });
    } catch (error) {
        console.error('Error getting the post for editing:', error);
        res.status(500).render('error', { title: 'Error', message: 'Error loading post for editing.', layout: 'main' });
    }
}

module.exports = {
    viewallPost,
    getpostID,
    createPost,
    updatePost,
    deletePost,
    likePost,
    dislikePost,
    editPost
};