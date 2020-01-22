const express = require('express');
const { body } = require('express-validator');

const authController = require('../controllers/auth');
const User = require('../models/user');

const router = express.Router();

router.put('/signup', [
    body('email')
        .isEmail()
        .withMessage('Please enter a valid email.')
        .custom((value, { req }) => {
            User.findOne({ email: value })
                .then(userDoc => {
                    if(userDoc){
                        return Promise.reject('Email address already exists');
                    }
                })
        })
        .normalizeEmail(),
    body('name')
        .trim()
        .isLength({min: 5}),
    body('password')
        .trim()
        .notEmpty()

], authController.signup);

module.exports = router;