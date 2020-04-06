// Variabelen
const
    express = require('express'),
    app = express(),
    port = 3000,
    mongo = require('mongodb'),
    bodyParser = require('body-parser'),
    session = require('express-session'),
    flash = require('connect-flash'),
    cookieParser = require('cookie-parser');
let db,
    Gebruikers;

// Env bestand toepassen
require('dotenv').config();

// Middleware set-up
app
    .use(express.static('static'))
    .set('view engine', 'ejs')
    .use(bodyParser.json())
    .use(bodyParser.urlencoded({ extended: true }))
    .use(cookieParser())
    .use(session({
        secret: process.env.SESSION_SECRET,
        cookie: { maxAge: 60000 },
        resave: false,
        saveUninitialized: false,
        secure: true,
    }))
    .use(function(req, res, next) {
        res.locals.messages = require('express-messages')(req, res);
        next();
    })
    .use(flash());

// Database connectie via .env
let url = 'mongodb+srv://' + process.env.DB_USER + ':' + process.env.DB_PASS + '@' + process.env.DB_URL + process.env.DB_EN;

mongo.MongoClient
    .connect(url, { useUnifiedTopology: true }, function(err, client) {
        if (err) {
            console.log('Database is niet connected');
            console.log(err);

        } else if (client) {
            console.log('Connectie met database is live');
        }
        db = client.db(process.env.DB_NAME);
        Gebruikers = db.collection(process.env.DB_NAME);
        Gebruikers.createIndex({ email: 1 }, { unique: true });
    });

// Routing
app
    .get('/', goHome)
    // Registration
    .get('/registration', registreren)
    .post('/registrating', gebruikerMaken)
    // Inloggen
    .post('/log-in', inloggen)
    // Uitloggen
    .get('/logout', uitloggen)
    // Wachtwoord wijzigen
    .get('/edit-pass', wachtwoordform)
    .post('/edit', wachtwoordVeranderen)
    // account verwijderen
    .get('/delete', accountVerwijderen)
    // error404
    .get('/*', error404);

// Laat de registratiepagina zien en flasht de naam van de user naar de volgende pagina
function registreren(req, res) {
    if (req.session.loggedIN) {
        req.flash('succes', `Hoi ${req.session.userName}`);
        res.render('readytostart');
    } else {
        res.render('registration');
    }
}

// Gaat naar home als niet ingelogd is en anders naar profielpagina + de voornaam wordt geflasht naar die pagina
function goHome(req, res) {
    if (req.session.loggedIN) {
        req.flash('succes', 'Hoi ' + req.session.userName);
        res.render('readytostart');
    } else {
        res.render('index');
    }
}

// Maakt de gebruiker aan op post
function gebruikerMaken(req, res) {
    let data = {
        'voornaam': req.body.voornaam,
        'achternaam': req.body.achternaam,
        'geboortedatum': req.body.geboortedatum,
        'email': req.body.email,
        'wachtwoord': req.body.wachtwoord,
    };
    // Pusht de data + input naar database (gebruikers = collection('users'))
    Gebruikers
        .insertOne(data, function(err) {
            if (err) {
                req.flash('error', err);
                res.render('registration');
            } else {
                req.session.loggedIN = true;
                req.session.userId = data.email;
                req.session.userName = data.voornaam;
                req.flash('succes', 'Hoi ' + req.session.userName + ', jouw account is met succes aangemaakt');
                res.render('readytostart');
                console.log('Gebruiker toegevoegd');
            }
        });
}
// checkt of gebruiker bestaat en logt in door sessie aan te maken met de email als ID (omdat email uniek is)
// req.Flash('class voor de div', 'het bericht') geeft dat  error/succes bericht door naar de template en daar staat weer code die het omzet naar html
function inloggen(req, res) {
    Gebruikers
        .findOne({
            email: req.body.email
        })
        .then(data => {
            if (data) {
                if (data.wachtwoord === req.body.wachtwoord) {
                    req.session.loggedIN = true;
                    req.session.userId = data.email;
                    req.session.userName = data.voornaam;
                    req.flash('succes', 'Hoi ' + req.session.userName);
                    res.render('readytostart');
                    console.log('ingelogd als ' + req.session.userId);
                } else {
                    req.flash('error', 'Wachtwoord is incorrect');
                    res.render('index');
                    console.log('Wachtwoord is incorrect');
                }
            } else {
                req.flash('error', 'Account is niet gevonden');
                res.render('index');
                console.log('Account is niet gevonden');
            }
        })
        .catch(err => {
            console.log(err);
        });
}

function wachtwoordform(req, res) {
    res.render('edit-pass');
}


// Omdat ik geen sessie gebruik nog, moet ik het account eerst valideren door de gebruiker wachtwoord en email te laten opgeven om daarna pas deze functie uit te laten voeren
function wachtwoordVeranderen(req, res) {
    if (req.session.loggedIN) {
        Gebruikers
            .findOne({
                email: req.session.userId,
            })
            .then(data => {
                if (data) {
                    const query = { email: req.session.userId };
                    // Wat wil je aanpassen
                    const update = {
                        '$set': {
                            'email': req.session.userId,
                            'wachtwoord': req.body.nieuwwachtwoord,
                        }
                    };
                    const options = { returnNewDocument: true };
                    Gebruikers
                        .findOneAndUpdate(query, update, options)
                        .then(updatedDocument => {
                            if (updatedDocument) {
                                req.session.loggedIN = false;
                                req.flash('succes', 'Je wachtwoord is met succes veranderd. Log opnieuw in met uw nieuwe wachtwoord');
                                res.render('index');
                            }
                            return updatedDocument;
                        })
                        .catch(err => console.error(`Gefaald om het te updaten door error: ${err}`));
                }
            })
            .catch(err => {
                console.log(err);
            });
    } else {
        req.flash('error', 'U moet eerst inloggen');
        res.render('index');
        console.log('u bent niet ingelogd');
    }
}

// Omdat ik geen sessie gebruik nog, moet ik het account eerst valideren door de gebruiker wachtwoord en email te laten opgeven om daarna pas deze functie uit te laten voeren
function accountVerwijderen(req, res) {
    Gebruikers
        .findOne({ email: req.session.userId })
        .then(data => {
            Gebruikers
                .deleteOne({ email: req.session.userId })
                .then(result => console.log(`Heeft ${result.deletedCount} account verwijderd.`))
                .catch(err => console.error(`Delete failed with error: ${err}`));
            req.flash('succes', 'Uw account is met succes verwijderd');
            req.session.loggedIN = false;
            res.render('index');
            return data;
        })
        .catch(err => console.error(`Error: ${err}`));
}

// Uitloggen. Werkt nog niet, omdat ik nog geen sessie gebruik
function uitloggen(req, res) {
    req.session.loggedIN = false;
    req.flash('succes', 'U bent uitgelogd');
    res.render('index');
    console.log('U bent uitgelogd');
}

// Bij een 404
function error404(req, res) {
    res.render('404');
}
// Welke poort het live staat
app.listen(3000, () => console.log('App is listening on port', port));