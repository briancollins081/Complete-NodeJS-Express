const fs = require('fs');
const path = require('path');

const { validationResult } = require('express-validator');
const Post = require('../models/posts');
const User = require('../models/user');

exports.getPosts = (req, res, next) => {
    const currentPage = req.query.page || 1;
    const perPage = 2;
    let totalItems;
    Post.find()
        .countDocuments()
        .then(count => {
            totalItems = count;
            return Post.find()
                .skip((currentPage - 1) * perPage)
                .limit(perPage);
        })
        .then(posts => {
            res.status(200).json({
                message: 'Fetching posts succeeded',
                posts: posts,
                totalItems: totalItems
            });
        })
        .catch(err => {
            if (!err.statusCode) {
                err.statusCode = 500;
            }
            next(err);
        })
}
exports.createPost = (req, res, next) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const error = new Error('Validation failed, entered data is incorrect!');
        error.statusCode = 422; //custom property
        throw error;
    }
    if (!req.file) {//as stored by multer
        const error = new Error('No image provided!');
        error.statusCode = 422;
        throw error; //sync code - will reach next(err);
    }

    const title = req.body.title;
    const imageUrl = req.file.path; //as stored by multer
    const content = req.body.content;
    let creator;
    let createdPost;

    const post = new Post({
        title: title,
        imageUrl: imageUrl,
        content: content,
        creator: req.userId,
    });
    post.save()
        .then(result => {
            createdPost = result;
            return User.findById(req.userId)
        })
        .then(user => {
            user.posts.push(post);
            creator = user;
            return user.save();
        })
        .then(result => {
            // console.log(result);
            res.status(201).json({
                message: 'Post created successfully',
                post: createdPost,
                creator: {
                    _id: creator._id,
                    name: creator.name
                }
            });
        })
        .catch(err => {
            if (!err.statusCode) {
                err.statusCode = 500;
            }
            next(err); // since we are inside asyncronous code
        });
}

exports.getPost = (req, res, next) => {
    const postId = req.params.postId;
    Post.findById(postId)
        .then(post => {
            if (!post) {
                const err = new Error("Post with could not be found!");
                err.statusCode = 404;
                throw err;
            }
            res.status(200).json({ message: "Post fetched", post: post });
        })
        .catch(err => {
            if (!err.statusCode) {
                err.statusCode = 500;
            }
            next(err);
        })
}

exports.updatePost = (req, res, next) => {
    const postId = req.params.postId;
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
        const error = new Error('Validation failed, entered data is incorrect!');
        error.statusCode = 422; //custom property
        throw error;
    }
    const title = req.body.title;
    const content = req.body.content;
    let imageUrl = req.body.image;
    if (req.file) {
        imageUrl = req.file.path;
    }
    if (!imageUrl) {
        const err = new Error('No image file picked!');
        err.statusCode = 422;
        throw err;
    }
    Post.findById(postId)
        .then(post => {
            if (!post) {
                const err = new Error("Post does not exist!");
                err.statusCode = 404;
                throw err;
            }
            if (post.creator.toString() !== req.userId) {
                const error = new Error("Not authorised to update this post!");
                error.statusCode = 403;
                throw error;
            }
            if (imageUrl !== post.imageUrl) {
                clearImage(post.imageUrl);
            }
            post.title = title;
            post.imageUrl = imageUrl;
            post.content = content;
            return post.save();
        })
        .then(result => {
            res.status(200).json({ message: 'Post updated!', post: result });
        })
        .catch(err => {
            if (!err.statusCode) {
                err.statusCode = 500;
            }
            next(err);
        });
}

exports.deletePost = (req, res, next) => {
    const postId = req.params.postId;
    Post.findById(postId)
        .then(post => {
            if (!post) {
                const err = new Error("Post does not exist!");
                err.statusCode = 404;
                throw err;
            }

            if (post.creator.toString() !== req.userId) {
                const error = new Error("Not authorised to update this post!");
                error.statusCode = 403;
                throw error;
            }

            clearImage(post.imageUrl);
            return Post.findByIdAndRemove(postId);
        })
        .then(result => {
            return User.findById(req.userId);
        })
        .then(user => {
            user.posts.pull({ _id: postId });
            return user.save();
        })
        .then(result => {
            // console.log(result);
            res.status(200).json({ message: 'Deleted post successfully!' })
        })
        .catch(err => {
            if (!err.statusCode) {
                err.statusCode = 500;
            }
            next(err);
        });
}

const clearImage = filePath => {
    filePath = path.join(__dirname, '..', filePath);
    fs.unlink(filePath, err => console.log(err));
}