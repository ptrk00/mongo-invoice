const express = require('express');
const router = express.Router();

// Get all invoices
router.get('/', async (req, res) => {
    const db = req.app.locals.db;
    const invoices = await db.collection('invoices').find({}).toArray();
    res.render('index', { invoices });
});