require('dotenv').config()

const path = require('path');
const express = require('express');
const handlebars = require('express-handlebars');
const multer = require('multer')
const passport = require('passport');
const session = require('express-session');
const MySQLStore = require('express-mysql-session')(session);
const mysql = require('mysql2/promise');
const bodyParser = require('body-parser');
const app = express();

const port = 5000;

// SESSIONS (STORE)
const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
    idleTimeout: 30000
});

// SESSIONS
const sessionStore = new MySQLStore({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER,
    password: process.env.DB_PASS,
    database: process.env.DB_NAME,
    createDatabaseTable: true,
    schema: {
        tableName: 'sessions',
        columnNames: {
            session_id: 'session_id',
            expires: 'expires',
            data: 'data',
        },
    },
});

app.use(session({
    store: sessionStore,
    key: 'sessionskey',
    secret: process.env.SECRET_SESSION || 'supersecretsessionkey',
    resave: false,
    saveUninitialized: false,
    cookie: {
        maxAge: 1000 * 60 * 60,
        secure: false,
        httpOnly: true
    }
}));


// Dir to upload
const upload = multer({ dest: 'uploads/' })

module.exports = upload

// PASSPORT
app.use(passport.initialize())
app.use(passport.session())
app.use(express.static('public'))
app.use(bodyParser.json({ limit: '10mb' }))
app.use(bodyParser.urlencoded({limit: '10mb' , extended: true}))

// HANDLEBARS && DIRS
app.set('views', path.join(__dirname, 'src', 'views'));

const hbs = handlebars.create({ defaultLayout: 'main' }, {allowProtoMethodsByDefault: true})
app.engine('handlebars', hbs.engine)
app.set('view engine', 'handlebars')

// ROUTES
const indexRoutes = require('./src/routes/index')
const authRoutes = require('./src/routes/auth')
const searchRoutes = require('./src/routes/search')
const adminRoutes = require('./src/routes/admin')

app.use('/', indexRoutes)
app.use('/auth', authRoutes)
app.use('/search', searchRoutes)
app.use('/admin', adminRoutes)

app.listen(port || 5000, () => {
    console.log('SERVER ARE RUNNING NORMALY...');
})