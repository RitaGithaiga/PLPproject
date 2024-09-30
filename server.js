const express = require('express')
const bcrypt = require('bcrypt');
const path = require('path')
const mysql = require('mysql2')
const dotenv = require('dotenv')
const { check, validationResult } = require('express-validator');
const session = require("express-session")
const bodyParser = require('body-parser');

dotenv.config()

const app = express();

//configure middleware
app.use(express.static(__dirname));
app.use(express.json());
app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.urlencoded({ extended: true }));

app.use(session({
    secret: 'uwebuiwebciuwebcwecubweubweofbweofbowebfouwbfuowerb',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: process.env.NODE_ENV === 'production',
        secure: false,
        httpOnly: true,
        sameSite: 'strict'
     } 
}));

//create database connection
const connection  = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME

});

connection.connect((err) => {
    if(err){
        console.error('Error occured while connecting to the db server: ' + err.stack);
        return;
    }
    console.log('DB Server connected successfully.');
});

//route to registration form
app.get('/register', (request, response) => {
    response.sendFile(path.join(__dirname, 'register.html'));
});

//route to login page
app.get('/login', (request, response) => {
    response.sendFile(path.join(__dirname, "login.html"));
});


const User = {
    tableName: 'users',
    createUser: function(newUser, callback){
        connection.query('INSERT INTO ' + this.tableName + ' SET ?', newUser, callback);
    },
    getUserByEmail: function(email, callback){
        connection.query('SELECT * FROM ' + this.tableName + ' WHERE email = ?', email, callback);
    },
    getUserByUsername: function(username, callback){
        connection.query('SELECT * FROM ' + this.tableName + ' WHERE username = ?', username, callback);
    },
}

//registration route 
app.post('/register', [

    //validation check
    check('email').isEmail().withMessage('Provide valid email address.'),
    check('username').isAlphanumeric().withMessage('Invalid username. Provide aplhanumeric values.'),

    check('email').custom( async(value) => {
        const exist = await User.getUserByEmail(value);
        if(exist){
            throw new Error('Email already exists');
        }
    }),
    check('username').custom( async(value) => {
        const exist = await User.getUserByUsername(value);
        if(exist){
            throw new Error('Username already in use.');
        }
    })
], async (request, response) => {

    const errors = validationResult(request);
    if(!errors.isEmpty()){
        return response.status(400).json({ errors: errors.array() });
    }

    //hash password
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(request.body.password, saltRounds);

    const newUser = {
        email: request.body.email,
        username: request.body.username,
        password: hashedPassword
    }

    //save new user
    User.createUser(newUser, (error) => {
        if(error){
            console.error('An error occurred while saving the record: ' + error.message);
            return response.status(500).json({ error: error.message });
        }
        console.log('New user record saved!');
        response.status(201).send('Registration successful!');
    });

});

//login route
app.post('/login', (request, response) => {
    const { email, password } = request.body;

    connection.query('SELECT user_ID, email, username, password FROM users WHERE email = ?', [email], (err, results) => {
        if(err) return response.status(500).send('Server error');
        console.log('Query Results:', results); 

        if(results.length === 0) {
            response.status(401).send('Invalid email or password.');
        } else {
            const user = results[0];
            //compare passwords
            bcrypt.compare(password, user.password, (err, isMatch) => {
                if(err)return response.status(500).send('Server error');
                if(isMatch){
                    //storing user data to the session variable
                    request.session.user =  { id: user.user_ID, email: user.email, username: user.username }; 
                    console.log('Session set:', request.session.user); 
                    response.status(200).json({ message: 'Login successful' });
                } else {
                    response.status(401).send('Invalid username or password.');
                }
            }); 
        }
    });
});

//authorization
const userAuthenticated = (request, response, next) => {
    if(request.session.user){
        next();
    } else {
        response.redirect('/login');
    }
}


//adding an new record
app.get('/new_record', (request, response) => {
    response.sendFile(path.join(__dirname, "new_record.html"));
});

app.post('/new_record', async (req, res) => {
    console.log('Request body:', req.body);  
    console.log('Current session:', req.session); 


    const { date, time, recording, units } = req.body;
    const user_ID = req.session.user?.id; 
    console.log('Received values:', { date, time, recording, units, user_ID }); 
  
    if (!date || !time || recording == null || !units || !user_ID) {
      return res.status(400).json({ message: 'date, time, recording and units are required' });
    }
  
    const query = 'INSERT INTO records (date, time, recording, units, user_ID) VALUES (?, ?, ?, ?, ?)';
    const values = [date, time, recording, units, user_ID];
  
    connection.query(query, values, (error, results) => {
        if (error) {
            console.error('Error saving new record:', error);
            return res.status(500).json({ message: 'Server error', error });
        }
        res.status(201).json({ id: results.insertId, date, time, recording, units, user_ID});
    });
  });

  app.get('/summaries', (req, res) => {
    const { date } = req.query;
    const userId = req.session.user?.id; 

    const query = date ? 
        'SELECT * FROM records WHERE date = ? AND user_ID = ?' :
        'SELECT * FROM records WHERE user_ID = ?';

    const values = date ? [date, userId] : [userId];

    connection.query(query, values, (error, results) => {
        if (error) {
            console.error('Error fetching summaries:', error);
            return res.status(500).send('Error retrieving summaries');
        }
        res.json(results); 
    });
});
 
app.delete('/delete_record/:id', (req, res) => {
    const recordId = req.params.id; 
    const userId = req.session.user?.id; 

    console.log('Deleting record:', { recordId, userId });

    const query = 'DELETE FROM records WHERE recordId = ? AND user_ID = ?'; 
    const values = [recordId, userId];

    connection.query(query, values, (error, results) => {
        if (error) {
            console.error('Error deleting record:', error);
            return res.status(500).send('Error deleting record');
        }
        if (results.affectedRows === 0) {
            return res.status(404).send('Record not found');
        }
        res.status(200).send('Record deleted successfully');
    });
});

  
  app.get('/trends', userAuthenticated, (req, res) => {
    const userId = req.session.user.id; 
    const query = 'SELECT date, time, recording FROM records WHERE user_ID = ? ORDER BY time';
    
    connection.query(query, [userId], (error, results) => {
        if (error) {
            console.error('Error fetching trends:', error);
            return res.status(500).json({ message: 'Server error', error });
        }
        res.json(results); 
    });
});


//destroy session
app.get('/logout', (request, response) => {
    request.session.destroy(err => {
        if (err) {
            return response.status(500).send('Error during logout');
        }
        response.redirect('/login');
    });
});


app.listen(3000, () => {
    console.log('Server is running on port 3000');
});
