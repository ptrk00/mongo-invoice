const { MongoClient } = require('mongodb');
const logger = require('./logger')

const uri = 'mongodb://localhost:27017';
const client = new MongoClient(uri, {monitorCommands: true});

client.on('commandStarted', (event) => logger.info(`Querying database: ${JSON.stringify(event.command)}`))
client.on('commandSucceeded', (event) => logger.info(`Result from database: ${JSON.stringify(event.reply)}`))
client.on('commandFailed', (event) => logger.info(`Querying database: ${JSON.stringify(event)}`))
async function initializeDatabase() {
    logger.info('Connecting to MongoDB...');
    try {
        await client.connect();
        const db = client.db('invoices');

        // Schema validation setup for invoices
        await db.createCollection(
            "clients", {
                validator: {
                    $jsonSchema: {
                        bsonType: "object",
                        required: ["name", "contact", "billingInformation", "createdDate"],
                        properties: {
                            name: {
                                bsonType: "string",
                                description: "Client name must be a string and is required"
                            },
                            contact: {
                                bsonType: "object",
                                required: ["email", "phone", "address"],
                                properties: {
                                    email: {
                                        bsonType: "string",
                                        pattern: "^.+@.+$",
                                        description: "Must be a valid email address and is required"
                                    },
                                    phone: {
                                        bsonType: "string",
                                        description: "Phone number must be a string and is required"
                                    },
                                    address: {
                                        bsonType: "object",
                                        required: ["street", "city", "state", "zip", "country"],
                                        properties: {
                                            street: {
                                                bsonType: "string",
                                                description: "Street address must be a string and is required"
                                            },
                                            city: {
                                                bsonType: "string",
                                                description: "City must be a string and is required"
                                            },
                                            state: {
                                                bsonType: "string",
                                                description: "State must be a string and is required"
                                            },
                                            zip: {
                                                bsonType: "string",
                                                description: "ZIP code must be a string and is required"
                                            },
                                            country: {
                                                bsonType: "string",
                                                description: "Country must be a string and is required"
                                            }
                                        }
                                    }
                                }
                            },
                            billingInformation: {
                                bsonType: "object",
                                required: ["billingAddress", "paymentTerms", "preferredPaymentMethod"],
                                properties: {
                                    billingAddress: {
                                        bsonType: "string",
                                        description: "Billing address must be a string and is required"
                                    },
                                    paymentTerms: {
                                        bsonType: "string",
                                        description: "Payment terms must be a string and is required"
                                    },
                                    preferredPaymentMethod: {
                                        bsonType: "string",
                                        description: "Preferred payment method must be a string and is required"
                                    }
                                }
                            },
                            createdDate: {
                                bsonType: "date",
                                description: "Creation date must be a date and is required"
                            }
                        }
                    }
                }
        });

        // Schema validation setup for clients
        await db.createCollection("paymentProcessors", {
            validator: {
                $jsonSchema: {
                    bsonType: "object",
                    required: ["name", "type", "contact", "services", "createdDate"],
                    properties: {
                        name: {
                            bsonType: "string",
                            description: "Processor name must be a string and is required"
                        },
                        type: {
                            bsonType: "string",
                            description: "Processor type must be a string and is required"
                        },
                        contact: {
                            bsonType: "object",
                            required: ["email", "phone", "address"],
                            properties: {
                                email: {
                                    bsonType: "string",
                                    pattern: "^.+@.+$",
                                    description: "Must be a valid email address and is required"
                                },
                                phone: {
                                    bsonType: "string",
                                    description: "Phone number must be a string and is required"
                                },
                                address: {
                                    bsonType: "object",
                                    required: ["street", "city", "state", "zip", "country"],
                                    properties: {
                                        street: {
                                            bsonType: "string",
                                            description: "Street address must be a string and is required"
                                        },
                                        city: {
                                            bsonType: "string",
                                            description: "City must be a string and is required"
                                        },
                                        state: {
                                            bsonType: "string",
                                            description: "State must be a string and is required"
                                        },
                                        zip: {
                                            bsonType: "string",
                                            description: "ZIP code must be a string and is required"
                                        },
                                        country: {
                                            bsonType: "string",
                                            description: "Country must be a string and is required"
                                        }
                                    }
                                }
                            }
                        },
                        services: {
                            bsonType: "array",
                            items: {
                                bsonType: "string"
                            },
                            description: "Services must be an array of strings and is required"
                        },
                        createdDate: {
                            bsonType: "date",
                            description: "Creation date must be a date and is required"
                        }
                    }
                }
            }
        });

        // Schema validation setup for payments
        await db.createCollection(
            "invoices", {
                validator: {
                    $jsonSchema: {
                        bsonType: "object",
                        required: ["issuerId", "recipientId", "invoiceNumber", "items", "subtotal", "tax", "total", "status", "dueDate", "issueDate", "payments"],
                        properties: {
                            issuerId: {
                                bsonType: ["string", "objectId"],
                                description: "Issuer ID must be a string and is required"
                            },
                            recipientId: {
                                bsonType: ["string", "objectId"],
                                description: "Recipient ID must be a string and is required"
                            },
                            invoiceNumber: {
                                bsonType: "string",
                                description: "Invoice number must be a string and is required"
                            },
                            items: {
                                bsonType: "array",
                                items: {
                                    bsonType: "object",
                                    required: ["description", "quantity", "unitPrice", "totalPrice"],
                                    properties: {
                                        description: {
                                            bsonType: "string",
                                            description: "Item description must be a string and is required"
                                        },
                                        quantity: {
                                            bsonType: "int",
                                            minimum: 1,
                                            description: "Quantity must be an integer greater than 0 and is required"
                                        },
                                        unitPrice: {
                                            bsonType: "double",
                                            description: "Unit price must be a double and is required"
                                        },
                                        discount: {
                                            bsonType: "double",
                                            description: "Discount must be a double and is optional"
                                        },
                                        totalPrice: {
                                            bsonType: "double",
                                            description: "Total price must be a double and is required"
                                        }
                                    }
                                },
                                description: "Items must be an array of item objects and is required"
                            },
                            subtotal: {
                                bsonType: "double",
                                description: "Subtotal must be a double and is required"
                            },
                            tax: {
                                bsonType: "array",
                                items: {
                                    bsonType: "object",
                                    required: ["taxName", "taxRate", "taxAmount", "jurisdictionId"],
                                    properties: {
                                        taxName: {
                                            bsonType: "string",
                                            description: "Tax name must be a string and is required"
                                        },
                                        taxRate: {
                                            bsonType: "double",
                                            description: "Tax rate must be a double and is required"
                                        },
                                        taxAmount: {
                                            bsonType: "double",
                                            description: "Tax amount must be a double and is required"
                                        },
                                        jurisdictionId: {
                                            bsonType: "string",
                                            description: "Jurisdiction ID must be a string and is required"
                                        }
                                    }
                                },
                                description: "Tax must be an array of tax objects and is required"
                            },
                            total: {
                                bsonType: "double",
                                description: "Total must be a double and is required"
                            },
                            status: {
                                bsonType: "string",
                                enum: ["unpaid", "paid", "overdue"],
                                description: "Status must be a string and is required"
                            },
                            dueDate: {
                                bsonType: "date",
                                description: "Due date must be a date and is required"
                            },
                            issueDate: {
                                bsonType: "date",
                                description: "Issue date must be a date and is required"
                            },
                            paidDate: {
                                    anyOf: [
                                     { bsonType: "date" },
                                     { bsonType: "null" }
                                 ],    
                                description: "Paid date must be a date and is optional"
                            },
                            notes: {
                                bsonType: "string",
                                description: "Notes must be a string and is optional"
                            },
                            terms: {
                                bsonType: "string",
                                description: "Terms must be a string and is optional"
                            },
                            attachments: {
                                bsonType: "array",
                                items: {
                                    bsonType: "string"
                                },
                                description: "Attachments must be an array of strings and is optional"
                            },
                            payments: {
                                bsonType: "array",
                                items: {
                                    bsonType: "object",
                                    required: ["paymentId", "amount", "paymentDate", "paymentMethod", "transactionId", "processorId"],
                                    properties: {
                                        paymentId: {
                                            bsonType: "string",
                                            description: "Payment ID must be a string and is required"
                                        },
                                        amount: {
                                            bsonType: "double",
                                            description: "Amount must be a double and is required"
                                        },
                                        paymentDate: {
                                            bsonType: "date",
                                            description: "Payment date must be a date and is required"
                                        },
                                        paymentMethod: {
                                            bsonType: "string",
                                            description: "Payment method must be a string and is required"
                                        },
                                        transactionId: {
                                            bsonType: "string",
                                            description: "Transaction ID must be a string and is required"
                                        },
                                        processorId: {
                                            bsonType: ["string", "objectId"],
                                            description: "Processor ID must be a string and is required"
                                        },
                                        notes: {
                                            bsonType: "string",
                                            description: "Notes must be a string and is optional"
                                        }
                                    }
                                },
                                description: "Payments must be an array of payment objects and is required"
                            }
                        }
                    }
                }
        });

        logger.info('Connected to MongoDB and schema validators set');
        return db;
    } catch (err) {
        logger.error(err);
        process.exit(1);
    }
}

module.exports = { initializeDatabase, client };
