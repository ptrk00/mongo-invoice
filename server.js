const express = require('express');
const bodyParser = require('body-parser');
const path = require('path');
const { initializeDatabase } = require('./db');
const invoicesRouter = require('./routes/invoices');
const usersRouter = require('./routes/users');
const {ObjectId} = require('mongodb')
const session = require('express-session');
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const bcrypt = require('bcryptjs');
const logger = require('./logger');
const expressLayouts = require('express-ejs-layouts');

const app = express();
const port = 3000;

app.use((req, res, next) => {
    const logMessage = `${req.method} ${req.url} ${res.statusCode}`;
    logger.info(logMessage);
    next();
});

// Set EJS as templating engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

// Initialize session
app.use(session({
    secret: 'your_secret_key',
    resave: false,
    saveUninitialized: false
}));

// Initialize Passport.js
app.use(passport.initialize());
app.use(passport.session());

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, 'public')));

initializeDatabase().then((db) => {
    app.locals.db = db;

    // Configure Passport.js local strategy
    passport.use(new LocalStrategy(
        async (username, password, done) => {
            const user = await db.collection('clients').findOne({ username: username });
            if (!user) {
                logger.error('Incorrect username');
                return done(null, false, { message: 'Incorrect username.' });
            }
            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                logger.error('Incorrect password');
                return done(null, false, { message: 'Incorrect password.' });
            }

            logger.info(`User ${user.username} authenticated`, );
            return done(null, user);
        }
    ));

    passport.serializeUser((user, done) => {
        done(null, {_id: user._id.toString(), username: user.username});
    });

    passport.deserializeUser(async (serializedUser, done) => {
        const user = await db.collection('clients').findOne(
            { _id: new ObjectId(serializedUser._id)},{ 
            projection: {
                _id: 1,
                username: 1
            } });
        done(null, user);
    });

    app.get('/', (req, res) => {
        res.render('home', { title: 'Home' });
    });

    // routers
    app.use('/invoices', invoicesRouter);
    app.use('/user', usersRouter);

    app.listen(port, () => {
        logger.info(`Server is running on http://localhost:${port}`);
    });
}).catch(err => {
    logger.error('Failed to initialize the database', err);
});

module.exports = logger;