function toggleNav() { //side bar collapsible
    let sidebar = document.getElementById("mysidebar");
    let main = document.getElementById("main");

    if (sidebar.style.width === "250px") {
        sidebar.style.width = "0";
        main.style.marginLeft = "0";
    } else {
        sidebar.style.width = "250px";
        main.style.marginLeft = "250px";
    }
}

function toggleCategoriesbar() { //toggle category bar
    let categoriesbar = document.getElementById("categoriesbar");
    let membersbar = document.getElementById("membersbar");
    let profilebar = document.getElementById("profilebar");
    
    if (membersbar.style.width === "300px") {
        membersbar.style.width = "0";
    }
    if (profilebar.style.width === "300px") {
        profilebar.style.width = "0";
    }
    
    if (categoriesbar.style.width === "300px") {
        categoriesbar.style.width = "0";
    } else {
        categoriesbar.style.width = "300px";
    }
}

function toggleMembersbar() { //members bar toggle
        let membersbar = document.getElementById("membersbar");
        let categoriesbar = document.getElementById("categoriesbar");
        let profilebar = document.getElementById("profilebar");
    
        if (categoriesbar.style.width === "300px") {
            categoriesbar.style.width = "0";
        }
        if (profilebar.style.width === "300px") {
            profilebar.style.width = "0";
        }

    
        if (membersbar.style.width === "300px") {
            membersbar.style.width = "0";
        } else {
            membersbar.style.width = "300px";
        }
}

function toggleProfilebar() { //profile bar toggle
    let profilebar = document.getElementById("profilebar");
    let categoriesbar = document.getElementById("categoriesbar");
    let membersbar = document.getElementById("membersbar");

    if (categoriesbar.style.width === "300px") {
        categoriesbar.style.width = "0";
    }
    if (membersbar.style.width === "300px") {
        membersbar.style.width = "0";
    }


    if (profilebar.style.width === "300px") {
        profilebar.style.width = "0";
    } else {
        profilebar.style.width = "300px";
    }
}

function createPost(){ 
    document.getElementById("createpostbox").style.display = "flex";
}

function closePost(){ 
    document.getElementById("createpostbox").style.display = "none";
}

function toggleCommentbox(button) {
    const contentDiv = button.closest('.content');
    const commentbox = contentDiv.querySelector('.commentbox');
    
    if (commentbox.style.display === "block") {
        commentbox.style.display = "none";
    } else {
        commentbox.style.display = "block";
    }
}

function handleLike(postId) {
    // Send POST request to like the post
    fetch(`/post/like/${postId}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Update the like counter
            const content = document.querySelector(`.content button[onclick="handleLike('${postId}')"]`)
                .closest('.content');
            const voteCounter = content.querySelector('.vote-counter');
            voteCounter.textContent = parseInt(voteCounter.textContent) + 1;
        } else {
            console.error('Error liking post:', data.error);
        }
    })
    .catch(error => {
        console.error('Error:', error);
    });
}

function handleDislike(postId) {
    // Send POST request to dislike the post
    fetch(`/post/dislike/${postId}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // No need to update any counter for dislikes as it's not displayed
            console.log('Post disliked successfully');
        } else {
            console.error('Error disliking post:', data.error);
        }
    })
    .catch(error => {
        console.error('Error:', error);
    });
}

function editPost(postId) {
    // Redirect to edit post page
    window.location.href = `/post/edit/${postId}`;
}

function deletePost(postId) {
    if (confirm('Are you sure you want to delete this post?')) {
        // Create a form and submit it
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = `/post/delete/${postId}`;
        document.body.appendChild(form);
        form.submit();
    }
}

function editComment(commentId) {
    // Find the comment container
    const commentItem = document.querySelector(`.comment-item[data-comment-id="${commentId}"]`);
    
    // Show the edit box and hide the comment text
    commentItem.querySelector('.comment-actions').style.display = 'none';
    commentItem.querySelector('.comment-content').style.display = 'none';
    commentItem.querySelector('.edit-comment-box').style.display = 'block';
}

function cancelEdit(commentId) {
    // Find the comment container
    const commentItem = document.querySelector(`.comment-item[data-comment-id="${commentId}"]`);
    
    // Hide the edit box and show the comment text
    commentItem.querySelector('.comment-actions').style.display = 'inline-block';
    commentItem.querySelector('.comment-content').style.display = 'inline';
    commentItem.querySelector('.edit-comment-box').style.display = 'none';
}

function saveComment(commentId) {
    // Find the comment container
    const commentItem = document.querySelector(`.comment-item[data-comment-id="${commentId}"]`);
    
    // Get the edited content
    const editedContent = commentItem.querySelector('.edit-comment-textarea').value;
    
    // Send the update request
    fetch(`/comment/edit/${commentId}`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({ content: editedContent })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Update the displayed comment content
            commentItem.querySelector('.comment-content').textContent = editedContent;
            
            // Hide the edit box and show the comment text
            commentItem.querySelector('.comment-actions').style.display = 'inline-block';
            commentItem.querySelector('.comment-content').style.display = 'inline';
            commentItem.querySelector('.edit-comment-box').style.display = 'none';
        } else {
            console.error('Error updating comment:', data.error);
            alert('Failed to update comment');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        alert('Failed to update comment');
    });
}

function deleteComment(commentId) {
    if (confirm('Are you sure you want to delete this comment?')) {
        // Create a form and submit it
        const form = document.createElement('form');
        form.method = 'POST';
        form.action = `/comment/delete/${commentId}`;
        document.body.appendChild(form);
        form.submit();
    }
}