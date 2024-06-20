const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const { initializeDatabase } = require('./db');
const invoicesRouter = require('./routes/invoices');

const app = express();
const port = 3000;

app.use(bodyParser.json());

// Set EJS as templating engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, 'public')));

initializeDatabase().then((db) => {
    app.locals.db = db;

    app.use('/invoices', invoicesRouter);

    app.listen(port, () => {
        console.log(`Server is running on http://localhost:${port}`);
    });
}).catch(err => {
    console.error('Failed to initialize the database', err);
});
