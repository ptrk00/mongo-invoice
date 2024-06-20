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

const app = express();
const port = 3000;

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

// Set EJS as templating engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Serve static files from the "public" directory
app.use(express.static(path.join(__dirname, 'public')));

initializeDatabase().then((db) => {
    app.locals.db = db;


    // Configure Passport.js local strategy
    passport.use(new LocalStrategy(
        async (username, password, done) => {
            const user = await db.collection('users').findOne({ username: username });
            if (!user) {
                console.log('Incorrect username');
                return done(null, false, { message: 'Incorrect username.' });
            }
            const isMatch = await bcrypt.compare(password, user.password);
            if (!isMatch) {
                console.log('Incorrect password');
                return done(null, false, { message: 'Incorrect password.' });
            }

            console.log('User authenticated');
            return done(null, user);
        }
    ));

    passport.serializeUser((user, done) => {
        console.log('Serialize user:', user);
        done(null, user._id);
    });

    passport.deserializeUser(async (id, done) => {
        console.log(id)
        const user = await db.collection('users').findOne({ _id: new ObjectId(id) });
        console.log('Deserialize user:', user);
        done(null, user);
    });

    // routers
    app.use('/invoices', invoicesRouter);
    app.use('/user', usersRouter);

    app.listen(port, () => {
        console.log(`Server is running on http://localhost:${port}`);
    });
}).catch(err => {
    console.error('Failed to initialize the database', err);
});
