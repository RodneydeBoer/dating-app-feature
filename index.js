// Variabelen
const
    express = require('express'),
    app = express(),
    port = 3000,
    mongo = require('mongodb'),
    bodyParser = require('body-parser'),
    session = require('express-session');
let db,
    Gebruikers;

// Middleware set-up
app
    .use(express.static('static'))
    .set('view engine', 'ejs')
    .use(bodyParser.json())
    .use(bodyParser.urlencoded({ extended: true }))
    .use(
        session({
            secret: '343ji43j4n3jn4jk3n',
            resave: false,
            saveUninitialized: true,
            secure: true
        })
    );

// Database connectie via .env
require('dotenv').config();
let url = 'mongodb+srv://' + process.env.DB_USER + ':' + process.env.DB_PASS + '@' + process.env.DB_URL + process.env.DB_EN;
mongo.MongoClient.connect(url, { useUnifiedTopology: true }, function(err, client) {
    if (err) {
        console.log('Database is niet connected');
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


// Laat de registratiepagina zien
function registreren(req, res) {
    if (req.session.userId) {
        res.render('readytostart');
        console.log('U bent al ingelogd');
    } else {
        res.render('registration');
    }
}

// Gaat naar home
function goHome(req, res) {
    if (req.session.userId) {
        res.render('readytostart');
    } else {
        res.render('index');
    }
}
// Maakt de gebruiker aan op post
function gebruikerMaken(req, res) {

    let voornaam = req.body.voornaam;
    let achternaam = req.body.achternaam;
    let geboorteDatum = req.body.geboortedatum;
    let email = req.body.email;
    let wachtwoord = req.body.wachtwoord;

    let data = {
        'voornaam': voornaam,
        'achternaam': achternaam,
        'geboortedatum': geboorteDatum,
        'email': email,
        'wachtwoord': wachtwoord,
    };
    // Pusht de data + input naar database (gebruikers = collection('users'))
    Gebruikers
        .insertOne(data, function(err) {
            if (err) {
                throw err;
            } else {
                console.log('Gebruiker toegevoegd');
                req.session.userId = data.email;
                res.render('readytostart');
            }
        });
}
// checkt of gebruiker bestaat en logt in door sessie aan te maken met de email als ID (omdat email uniek is)
function inloggen(req, res) {
    Gebruikers
        .findOne({
            email: req.body.email
        })
        .then(data => {
            if (data) {
                if (data.wachtwoord === req.body.wachtwoord) {
                    res.render('readytostart');
                    req.session.userId = data.email;
                    console.log('ingelogd als ' + req.session.userId);
                } else {
                    console.log('Wachtwoord klopt niet');
                }
            } else {
                console.log('Email is niet gevonden of klopt niet');
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
    if (req.session.userId) {
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
                                console.log(`Dit document: ${updatedDocument}. is geupdated`);
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
        res.render('index');
        console.log('u bent niet ingelogd');
    }
}

// Omdat ik geen sessie gebruik nog, moet ik het account eerst valideren door de gebruiker wachtwoord en email te laten opgeven om daarna pas deze functie uit te laten voeren
function accountVerwijderen(req, res) {
    Gebruikers
        .findOne({ email: req.session.userId })
        .then(data => {
            if (data) {
                Gebruikers
                    .deleteOne({ email: req.session.userId })
                    .then(result => console.log(`Heeft ${result.deletedCount} account verwijderd.`))
                    .catch(err => console.error(`Delete failed with error: ${err}`));

                req.session.destroy();
                res.render('index');
            } else {
                console.log('account is niet bestaand');
            }
            return data;
        })
        .catch(err => console.error(`Error: ${err}`));
}

// Uitloggen. Werkt nog niet, omdat ik nog geen sessie gebruik
function uitloggen(req, res) {
    req.session.destroy();
    res.render('index');
}
// Bij een 404
function error404(req, res) {
    res.render('404');
}
// Welke poort het live staat
app.listen(3000, () => console.log('App is listening on port', port));