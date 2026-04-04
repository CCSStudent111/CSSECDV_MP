# CCAPDEV - MCO GROUP # 6 - Forum Web Application

## References/Links:

- https://docs.google.com/document/d/1pFlfcLxUMrRL4COr6hdW-7MrlG-6oGyRDSmDqSi5Ok4/edit?usp=sharing (MCO Specs, Draft)

## Overview

This is a forum web application, that would be inspired from the layouts/systems of Reddit, Studdit, Communites.Win and traditional forum sites.

The application can either be a general-interest forum or a specialized forum tailored to a specific interest group. Below are the features that maybe implemented for the project. 

These are not final yet, and subject to change as such.

## Expected Features

### 1. View Posts
- **Sorted By Posts**: See the latest (or most popular) 15-20 posts.
- **Pagination/Auto-load**: Navigate through posts via pages or auto-load.
- **View Post**: Click a post title to see the full content and comments.

### 2. Register & Login
- **Register**: Create an account (username, password).
- **Login**: Log in with a "remember me" option for 3 weeks.
- **Logout**: Logout and clear session data.

### 3. User Profile
- **Profile**: Public user profile with username, picture, and posts.
- **Edit Profile**: Users can update profile picture and description.

### 4. Create Posts & Comments
- **Create Post**: Logged-in users can create posts with titles and content.
- **Categorized Post**: The posts can either be done with an image, text, or poll.
- **Comment**: Add comments and replies to posts.

### 5. Post Management
- **Edit/Delete Post**: Edit or delete your posts.
- **Edit/Delete Comment**: Edit or delete your comments.

### 6. Voting
- **Upvote/Downvote**: Vote on posts and comments.

### 7. Search
- **Search**: Find posts by title or content, with filters.

### 8. General
- **User Experience**: Simple and easy-to-use interface.

## Instructions on Setup & Running:

### 1. Install Prerequisites
- **MongoDB Shell/Compasss**
- **NodeJS & Modules**:
  - mongodb
  - express-session
  - express-flash, connect-flash
  - --save-dev @types/node
  - toastr
  - bcrypt

### 2. Run app.js via Command Shell
 - `X:\(application directory)\> node app.js`

### 3. Check Application via NodeJS & Database via MongoDB URL
- Access the application by visiting:  
  `http://localhost:3000`
  
- Check the database connection using the MongoDB URL:  
  `mongodb://127.0.0.1:27017/`
