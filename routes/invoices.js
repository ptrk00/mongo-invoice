const express = require('express');
const router = express.Router();
const ensureAuthenticated = require('../middleware')
const {ObjectId} = require('mongodb')
const logger = require('../logger');

// ensure auth
router.use(ensureAuthenticated);

// Get all invoices
router.get('/issued', async (req, res) => {
    const db = req.app.locals.db;
    const invoices = await db.collection('invoices').find({issuerId: new ObjectId(req.user._id)}, {projection: {invoiceNumber: 1}}).toArray();
    res.render('invoices', { invoices });
});

router.get('/received', async (req, res) => {
    const db = req.app.locals.db;
    const invoices = await db.collection('invoices').find({recipientId: new ObjectId(req.user._id)}).toArray();
    res.render('invoices', { invoices });
});

router.get('/details/:id', async (req, res) => {
    const db = req.app.locals.db;
    const invoice = await db.collection('invoices').findOne({
        $and: [
            {_id: new ObjectId(req.params.id)}, 
            {
                $or: [
                    {recipientId: new ObjectId(req.user._id)}, 
                    {issuerId: new ObjectId(req.user._id)}
                ]
            }
        ]
    });
    res.render('invoice', { invoice });
});


module.exports=router