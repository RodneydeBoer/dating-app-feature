// Variabelen
const express = require('express');
const app = express();
const port = 3000;
const mongo = require('mongodb');
const bodyParser = require('body-parser');
const session = require('express-session');
let db;
let Gebruikers;


// Middleware set-up
app
    .use(express.static('static'))
    .set('view engine', 'ejs')
    .use(bodyParser.json())
    .use(bodyParser.urlencoded({
        extended: true
    }))
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


// Root
app.get('/', goHome);
// Registration
app.get('/registration', registreren);
app.post('/registrating', gebruikerMaken);
// Inloggen
app.post('/log-in', inloggen);
// Uitloggen
app.get('/logout', uitloggen);
// Wachtwoord wijzigen
app.get('/edit-pass', wachtwoordform);
app.post('/edit', wachtwoordVeranderen);
// account verwijderen
app.get('/delete', accountverwijderForm);
app.post('/delete', accountVerwijderen);
// error404
app.get('/*', error404);


// Laat de registratiepagina zien
function registreren(req, res) {
    res.render('registration');
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
    // Pusht de data + input naar database
    db.collection('users').insertOne(data, function(err, collection) {
        if (err) {
            throw err;
        } else {
            console.log('Gebruiker toegevoegd');
            req.session.userId = data._id;
            res.render('readytostart');
        }
    });
}
// checkt of gebruiker bestaat en logt in door sessie aan te maken met de email als ID (omdat email uniek is)
function inloggen(req, res) {
    Gebruikers
        .findOne({
            email: req.body.email,
            wachtwoord: req.body.wachtwoord
        })
        .then(data => {
            console.log('Uw account is ingelogd!');
            req.session.userId = data.email;
            if (data) {
                res.render('readytostart');
                console.log(req.session.userId);
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
    return db.collection('users').findOne({ email: req.body.email })
        .then(data => {
            if (data.email === req.body.email && data.wachtwoord !== req.body.wachtwoord) {
                console.log('email klopt, maar wachtwoord niet');
                res.render('index');
            } else if (data.email === req.body.email && data.wachtwoord === req.body.wachtwoord) {
                const query = { email: req.body.email };
                // Wat wil je aanpassen
                const update = {
                    '$set': {
                        'email': req.body.email,
                        'wachtwoord': req.body.nieuwwachtwoord,
                    }
                };
                // Return het geupdate document
                const options = { returnNewDocument: true };

                return db.collection('users').findOneAndUpdate(query, update, options)
                    .then(updatedDocument => {
                        if (updatedDocument) {
                            console.log(`Dit document: ${updatedDocument}. is geupdated`);
                            res.render('index');
                        } else {
                            console.log('Wachtwoord niet gevonden');
                        }
                        return updatedDocument;
                    })
                    .catch(err => console.error(`Gefaald om het te updaten door error: ${err}`));
            } else {
                console.log('account is niet gevonden');
            }
            return data;
        })
        .catch(err => console.error(`Error: ${err}`));
}

// Omdat ik geen sessie gebruik nog, moet ik het account eerst valideren door de gebruiker wachtwoord en email te laten opgeven om daarna pas deze functie uit te laten voeren
function accountVerwijderen(req, res) {
    return db.collection('users').findOne({ email: req.body.email })
        .then(data => {
            if (data.email === req.body.email && data.wachtwoord !== req.body.wachtwoord) {
                console.log('email klopt, maar wachtwoord niet');
                res.render('index');
            } else if (data.email === req.body.email && data.wachtwoord === req.body.wachtwoord) {
                db.collection('users').deleteOne({ email: req.body.email })
                    .then(result => console.log(`Heeft ${result.deletedCount} account verwijderd.`))
                    .catch(err => console.error(`Delete failed with error: ${err}`));
                res.render('index');
            } else {
                console.log('account is niet bekend');
            }
            return data;
        })
        .catch(err => console.error(`Error: ${err}`));
}

// Laat alleen het formulier zien om account te verwijderen
function accountverwijderForm(req, res) {
    res.render('delete-acc');
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