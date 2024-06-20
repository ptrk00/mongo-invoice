const express = require('express');
const router = express.Router();
const ensureAuthenticated = require('../middleware')

// ensure auth
router.use(ensureAuthenticated);

// Get all invoices
router.get('/issued', async (req, res) => {
    const db = req.app.locals.db;
    const invoices = await db.collection('invoices').find({issuerId: req.user._id}).toArray();
    res.render('index', { invoices });
});

router.get('/received', async (req, res) => {
    const db = req.app.locals.db;
    const invoices = await db.collection('invoices').find({recipientId: req.user._id}).toArray();
    res.render('index', { invoices });
});

module.exports=router