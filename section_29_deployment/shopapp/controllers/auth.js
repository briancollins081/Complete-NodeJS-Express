const crypto = require('crypto');

const bcrypt = require('bcryptjs');
const nodemailer = require('nodemailer');
const sendgridTransport = require('nodemailer-sendgrid-transport');
const { validationResult } = require('express-validator');

const User = require('../models/user');

const sendgrid_api_key = process.env.SENDGRID_API_KEY;

const transporter = nodemailer.createTransport(sendgridTransport({
    auth: {
        api_key: sendgrid_api_key
    }
}));

exports.getLogin = (req, res, next) => {
    let message = req.flash('error');
    if (message.length > 0) {
        message = message[0];
    } else {
        message = null;
    }
    res.render('auth/login', {
        path: '/login',
        pageTitle: 'Login',
        errorMessage: message,
        oldInput: {email: "", password: ""},
        validationErrors: []
    });
};

exports.getSignup = (req, res, next) => {
    let message = req.flash('error');
    if (message.length > 0) {
        message = message[0];
    } else {
        message = null;
    }
    res.render('auth/signup', {
        path: '/signup',
        pageTitle: 'Signup',
        errorMessage: message,
        oldInput: {email: "", password: "", confirmPassword: ""},
        validationErrors: []

    });
};

exports.postLogin = (req, res, next) => {
    const email = req.body.email;
    const password = req.body.password;

    const errors = validationResult(req);

    if(!errors.isEmpty()){
        console.log(errors);
        res.status(422).render('auth/login', {
            path: '/login',
            pageTitle: 'Login',
            errorMessage: errors.array()[0].msg,
            oldInput: {email: email, password: password},
            validationErrors: errors.array()
        });
    }
    User.findOne({ email: email })
        .then(user => {
            if (!user) {
                // req.flash('error', 'Invalid email or password.');
                return res.status(422).render('auth/login', {
                    path: '/login',
                    pageTitle: 'Login',
                    errorMessage: 'Invalid email or password.',
                    oldInput: {email: email, password: password},
                    validationErrors: errors.array()
                });
            }
            bcrypt.compare(password, user.password)
                .then(doMatch => {
                    if (doMatch) {
                        req.session.isLoggedIn = true;
                        req.session.user = user;
                        return req.session.save(err => {
                            console.log(err);
                            res.redirect('/');
                        });
                    } else {
                        // req.flash('error', 'Invalid email or password.');
                        return res.status(422).render('auth/login', {
                            path: '/login',
                            pageTitle: 'Login',
                            errorMessage: 'Invalid email or password.',
                            oldInput: {email: email, password: password},
                            validationErrors: errors.array()
                        });
                    }
                })
                .catch(err => {
                    console.log(err);
                });
        }).catch(err => {
            const error=new Error(err);
            error.httpStatus = 500;
            return next(error);
        });
};

exports.postSignup = (req, res, next) => {
    const email = req.body.email;
    const password = req.body.password;
    const confirmPassword = req.body.confirmPassword;
    const errors = validationResult(req);

    if(!errors.isEmpty()){
        console.log(errors.array());
        return res.status(422)
            .render('auth/signup', {
                path: '/signup',
                pageTitle: 'Signup',
                errorMessage: errors.array()[0].msg,
                oldInput: {email: email, password: password, confirmPassword: confirmPassword},
                validationErrors: errors.array()
            });
    }

    bcrypt.hash(password, 12)
        .then(hPassword => {
            const user = new User({
                email: email,
                password: hPassword,
                cart: { items: [] }
            });
            return user.save();
        })
        .then(result => {
            res.redirect("/login");
            return transporter.sendMail({
                to: email,
                from: 'shop@andere.nodejscourse.info',
                subject: 'Signup completed.',
                html: '<h1>You successfully signed up</h1>'
            });
        })
        .catch(err => {
            const error=new Error(err);
            error.httpStatus = 500;
            return next(error);
        });

};

exports.postLogout = (req, res, next) => {
    req.session.destroy(err => {
        console.log(err);
        res.redirect('/');
    });
};

exports.getReset = (req, res, next) => {
    let message = req.flash('error');
    if (message.length > 0) {
        message = message[0];
    } else {
        message = null;
    }
    res.render('auth/reset', {
        path: '/reset',
        pageTitle: 'Reset Password',
        errorMessage: message
    });
};
exports.postReset = (req, res, next) => {
    crypto.randomBytes(32, (err, buffer) => {
        if (err) {
            console.log(err);
            res.redirect('/reset');
        }
        const token = buffer.toString('hex');
        User.findOne({ email: req.body.email })
            .then(user => {
                if (!user) {
                    req.flash('error', 'No account with that email address found!');
                    res.redirect('/reset');
                }

                user.resetToken = token;
                user.resetTokenExpiration = Date.now() + 3600000;
                return user.save();
            })
            .then(result => {
                res.redirect('/');
                transporter.sendMail({
                    to: req.body.email,
                    from: 'shop@abcnodejs.co.ke',
                    subject: 'Password Reset',
                    html: `
                        <p>You requested a password reset</p>
                        <p>Click this <a href="http://localhost:3000/reset/${token}">link</a> to set a new password</p>
                        <hr/>
                        <b>If you did not request for the reset please ignore this email</b>
                    `
                });
            })
            .catch(err => {
                const error=new Error(err);
                error.httpStatus = 500;
                return next(error);
            });
    });
}
exports.getNewPassword = (req, res, next) => {
    const token = req.params.token;
    User.findOne({ resetToken: token, resetTokenExpiration: {$gt: Date.now()} })
        .then(user => {
            // console.log(user);
            let message = req.flash('error');
            if (message.length > 0) {
                message = message[0];
            } else {
                message = null;
            }
            res.render('auth/new-password', {
                path: '/new-password',
                pageTitle: 'New Password',
                errorMessage: message,
                userId: user._id,
                passwordToken: token
            });
        })
        .catch(err => {
            const error=new Error(err);
            error.httpStatus = 500;
            return next(error);
        });
}

exports.postNewPassword = (req, res, next)=>{
    const newPassword = req.body.password;
    const userId = req.body.userId;
    const passwordToken = req.body.passwordToken;
    let resetUser, userl;

    User.findOne({
        resetToken: passwordToken,
        resetTokenExpiration: {$gt: Date.now()},
        _id: userId
    })
    .then(user=>{
        resetUser=user;
        userl=user;
        return bcrypt.hash(newPassword, 12);
    })
    .then(password=>{
        resetUser.password=password;
        resetUser.resetToken=undefined;
        resetUser.resetTokenExpiration=undefined;
        return resetUser.save();
    })
    .then(result=>{
        res.redirect('/login');
        transporter.sendMail({
            to: userl.email,
            from: 'shop@andere.nodejscourse.info',
            subject: 'Password Reset',
            html: `
                <h1>Your password was reset successfully</h1>
                <hr>
                <p>If you did not perform this action please contact our customer care</p>
            `
        });
    })
    .catch(err => {
        const error=new Error(err);
        error.httpStatus = 500;
        return next(error);
    });
}