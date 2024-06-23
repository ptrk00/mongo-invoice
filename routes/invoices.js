const express = require('express');
const router = express.Router();
const ensureAuthenticated = require('../middleware')
const {ObjectId, Double} = require('mongodb')
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
    let isIssuer = req.user._id.toString() === invoice.issuerId.toString()
    res.render('invoice', { invoice, isIssuer });
});

router.patch('/:id/items', async (req, res) => {
    try {
        const invoiceId = req.params.id;
        const newItem = req.body;

        logger.info(`request body: ${JSON.stringify(newItem)}`)

        // Validate and parse new item
        if (!newItem.description || !newItem.quantity || !newItem.unitPrice || typeof newItem.discount !== 'number') {
            return res.status(400).send('Invalid item data');
        }

        newItem._id = new ObjectId();

        const result = await req.app.locals.db.collection('invoices').updateOne(
            { _id: new ObjectId(invoiceId) },
            [
                // Create new entry to items array, compute totalPrice
                {
                    $set: {
                        newItem: {
                            _id: newItem._id,
                            description: newItem.description,
                            quantity: newItem.quantity,
                            unitPrice: new Double(newItem.unitPrice),
                            discount: new Double(newItem.discount),
                            totalPrice: { $multiply: [newItem.quantity, new Double(newItem.unitPrice)] }
                        }
                    }
                },

                // Add created entry to array
                {
                    $set: {
                        items: {
                            $concatArrays: ["$items", ["$newItem"]]
                        }
                    }
                },

                // Update subtotal pre tax sum field
                {
                    $set: {
                        subtotal: { $add: ["$subtotal", "$newItem.totalPrice"] }
                    }
                },

                // Recompute totalAmount field for every entry in tax
                {
                    $set: {
                        tax: {
                            $map: {
                                input: "$tax",
                                as: "taxEntry",
                                in: {
                                    $mergeObjects: [
                                        "$$taxEntry",
                                        {
                                            taxAmount: {
                                                $add: [
                                                    "$$taxEntry.taxAmount",
                                                    { $multiply: ["$newItem.totalPrice", "$$taxEntry.taxRate"] }
                                                ]
                                            }
                                        }
                                    ]
                                }
                            }
                        }
                    }
                },

                // Compute post tax total field
                {
                    $set: {
                        total: {
                            $add: [
                                "$subtotal",
                                { $sum: "$tax.taxAmount" }
                            ]
                        }
                    }
                },

                // Remove temp entry
                {
                    $unset: "newItem"
                }
            ]
        );

        if (result.modifiedCount === 0) {
            return res.status(404).send('Invoice not found');
        }

        res.send('Invoice updated successfully');
    } catch (error) {
        console.error('Error updating invoice:', error);
        res.status(500).send('Internal Server Error');
    }
});

router.patch('/:id/payments', async (req, res) => {
    try {
        const invoiceId = req.params.id;
        const newPayment = req.body;

        // Validate and parse new payment
        if (!newPayment.amount || !newPayment.paymentMethod ||  !newPayment.processorId) {
            return res.status(400).send('Invalid payment data');
        }

        newPayment.amount = new Double(newPayment.amount);
        newPayment.paymentDate = new Date();
        newPayment.paymentId = new ObjectId().toString();
        newPayment.transactionId = new ObjectId().toString();

        const result = await req.app.locals.db.collection('invoices').updateOne(
            { _id: new ObjectId(invoiceId) },
            [
                // Add payment to array
                {
                    $set: {
                        payments: {
                            $concatArrays: [
                                "$payments",
                                [newPayment]
                            ]
                        }
                    }
                },

                // Store temporary sum of payments
                {
                    $set: {
                        totalPaid: {
                            $sum: "$payments.amount"
                        }
                    }
                },

                // Check if we need to change status to 'paid' and set paidDate
                {
                    $set: {
                        newStatusAndDate: {
                            $cond: {
                                if: { $gte: ["$totalPaid", "$total"] },
                                then: {
                                    status: "paid",
                                    paidDate: new Date()
                                },
                                else: {
                                    status: "$status",
                                    paidDate: "$paidDate"
                                }
                            }
                        }
                    }
                },
                // Apply the new status and paidDate
                {
                    $set: {
                        status: "$newStatusAndDate.status",
                        paidDate: "$newStatusAndDate.paidDate"
                    }
                },
            
                // Remove temporary fields
                {
                    $project: {
                        totalPaid: 0,
                        newStatusAndDate: 0
                    }
                }
            ]
        );

        if (result.modifiedCount === 0) {
            return res.status(404).send('Invoice not found');
        }

        res.send('Payment added successfully');
    } catch (error) {
        console.error('Error updating invoice:', error);
        res.status(500).send('Internal Server Error');
    }
});

// Endpoint to display invoice summary// Endpoint to display invoice summary
// Endpoint to display invoice summary
// Endpoint to display invoice summary
router.get('/summary', async (req, res) => {
    try {
        const db = req.app.locals.db;

        // Query to get total invoices per issuer
        const invoiceSummary = await db.collection('invoices').aggregate([
            {
                $group: {
                    _id: "$issuerId",
                    totalInvoices: { $sum: 1 }
                }
            },
            {
                $lookup: {
                    from: "clients",
                    localField: "_id",
                    foreignField: "_id",
                    as: "issuerDetails"
                }
            },
            { $unwind: "$issuerDetails" },
            {
                $project: {
                    _id: 0,
                    issuerId: "$issuerDetails._id",
                    issuerName: "$issuerDetails.name",
                    totalInvoices: 1
                }
            },
            {
                $sort: { totalInvoices: -1 }
            }
        ]).toArray();

        // Query to get total tax collected by jurisdiction
        const taxSummary = await db.collection('invoices').aggregate([
            { $unwind: "$tax" },
            {
                $group: {
                    _id: "$tax.jurisdictionId",
                    totalTaxCollected: { $sum: "$tax.taxAmount" }
                }
            },
            {
                $project: {
                    _id: 0,
                    jurisdiction: "$_id",
                    totalTaxCollected: 1
                }
            },
            {
                $sort: { totalTaxCollected: -1 }
            }
        ]).toArray();

        // Query to get overdue invoices
        const overdueInvoices = await db.collection('invoices').aggregate([
            {
                $match: {
                    status: "unpaid",
                    dueDate: { $lt: new Date() }
                }
            },
            {
                $lookup: {
                    from: "clients",
                    localField: "recipientId",
                    foreignField: "_id",
                    as: "clientDetails"
                }
            },
            { $unwind: "$clientDetails" },
            {
                $group: {
                    _id: "$clientDetails._id",
                    clientName: { $first: "$clientDetails.name" },
                    overdueInvoices: {
                        $push: {
                            invoiceNumber: "$invoiceNumber",
                            issueDate: "$issueDate",
                            dueDate: "$dueDate",
                            total: "$total"
                        }
                    },
                    totalOverdueAmount: { $sum: "$total" }
                }
            },
            {
                $sort: { totalOverdueAmount: -1 }
            }
        ]).toArray();

        // Query to get monthly revenue breakdown
        const monthlyRevenue = await db.collection('invoices').aggregate([
            {
                $match: {
                    issueDate: {
                        $gte: new Date("2023-01-01T00:00:00Z"),
                        $lt: new Date("2024-01-01T00:00:00Z")
                    },
                    status: "paid"
                }
            },
            {
                $group: {
                    _id: {
                        year: { $year: "$issueDate" },
                        month: { $month: "$issueDate" }
                    },
                    monthlyRevenue: { $sum: "$total" }
                }
            },
            {
                $sort: {
                    "_id.year": 1,
                    "_id.month": 1
                }
            }
        ]).toArray();

        res.render('summary', { title: 'Invoice Summary', invoiceSummary, taxSummary, overdueInvoices, monthlyRevenue });
    } catch (error) {
        console.error('Error fetching invoice summary:', error);
        res.status(500).send('Internal Server Error');
    }
});

module.exports = router;



module.exports=router