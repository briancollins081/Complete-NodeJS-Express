const express = require('express');
const { check, body } = require('express-validator');

const authController = require('../controllers/auth');

const router = express.Router();

router.get('/login', authController.getLogin);

router.get('/signup', authController.getSignup);

router.post('/login', authController.postLogin);

router.post('/signup', 
        [
            check('email')
            .isEmail()
            .withMessage('Please enter a valid email address.')
            .custom((value, { req })=>{
                if(value ==='test@test.com'){
                    throw new Error('This email address is forbidden!');
                }
                return true;
            }),
            // check('password') or alternatively
            //check the error message can also be included as below
            body('password', 'Please enter a password with only text and numbers and at least 5 characters.')
                .isLength({min: 5})
                .isAlphanumeric()
        ], 
        authController.postSignup
);

router.post('/logout', authController.postLogout);

router.get('/reset', authController.getReset);

router.post('/reset', authController.postReset);

router.get('/reset/:token', authController.getNewPassword); 

router.post('/new-password', authController.postNewPassword);

module.exports = router;