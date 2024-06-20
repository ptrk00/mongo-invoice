const express = require('express');
const passport = require('passport');
const bcrypt = require('bcryptjs');
const router = express.Router();

// Register endpoint

router.get('/register', (req, res) => {
    res.render('register');
});

router.post('/register', async (req, res) => {
    const db = req.app.locals.db;
    const { username, password } = req.body;

    const hashedPassword = await bcrypt.hash(password, 10);
    await db.collection('users').insertOne({ username: username, password: hashedPassword });
    res.redirect('login');
});

router.get('/login', (req, res) => {
    res.render('login');
});

// Login endpoint
router.post('/login', passport.authenticate('local', {
    successRedirect: 'profile',
    failureRedirect: 'login'
}));

// Profile endpoint
router.get('/profile', (req, res) => {
    if (!req.isAuthenticated()) {
        console.log("not authenticated")
        return res.redirect('login');
    }
    // console.log('user id =====', req.user._id)
    res.render('profile', { user: req.user });
});

// Logout endpoint
router.get('/logout', (req, res) => {
    req.logout(() => {
        res.redirect('login');
    });
});

module.exports = router;
