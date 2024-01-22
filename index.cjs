const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const bodyParser = require('body-parser');

// Allows us to access the .env
require('dotenv').config();

const app = express();
const port = process.env.PORT; // default port to listen

const corsOptions = {
   origin: '*', 
   credentials: true,  
   'access-control-allow-credentials': true,
   optionSuccessStatus: 200,
}

const pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

app.use(cors(corsOptions));

// Makes Express parse the JSON body of any requests and adds the body to the req object
app.use(bodyParser.json());

app.use(async (req, res, next) => {
  try {
    // Connecting to our SQL db. req gets modified and is available down the line in other middleware and endpoint functions
    req.db = await pool.getConnection();
    req.db.connection.config.namedPlaceholders = true;

    // Traditional mode ensures not null is respected for unsupplied fields, ensures valid JavaScript dates, etc.
    await req.db.query('SET SESSION sql_mode = "TRADITIONAL"');
    await req.db.query(`SET time_zone = '-8:00'`);

    // Moves the request on down the line to the next middleware functions and/or the endpoint it's headed for
    await next();

    // After the endpoint has been reached and resolved, disconnects from the database
    req.db.release();
  } catch (err) {
    // If anything downstream throw an error, we must release the connection allocated for the request
    console.log(err)
    // If an error occurs, disconnects from the database
    if (req.db) req.db.release();
    throw err;
  }
});

app.delete('/car/:id', async(req, res) => {
  const [deleted_flag] = await req.db.query(`
  UPDATE car SET deleted_flag = 1 WHERE id = :id
`, { id: req.params.id });

  const [cars] = await req.db.query(`SELECT * FROM car WHERE  deleted_flag = 0 ;`);

  res.json(cars)
})


// Creates a GET endpoint at <WHATEVER_THE_BASE_URL_IS>/students
app.get('/car', async (req, res) => {
  const [cars] = await req.db.query(`SELECT * FROM car WHERE  deleted_flag = 0 ;`);
console.log("everything is okay");
  // Attaches JSON content to the response
  res.json({ cars });
});



app.post('/car', async (req, res) => {
  const { 
    make,
    model,
    year,
    deleted_flag
   } = req.body;

  const [insert] = await req.db.query(`
    INSERT INTO car (make, model, year, deleted_flag)
    VALUES (:make, :model, :year, :deleted_flag);
  `, { 
    make, 
    model, 
    year, 
    deleted_flag
  });

  // Attaches JSON content to the response
  const [cars] = await req.db.query(`SELECT * FROM car WHERE  deleted_flag = 0 ;`);
  res.json(cars);
});



app.put('/car',  async(req, res) =>{

  const { id, make } = req.body;

  const [update] = await req.db.query(`
    UPDATE car 
    SET make = :make
    WHERE id = :id
  `, { id, make });

  const [cars] = await req.db.query(`SELECT * FROM car WHERE id = :id;`, { id });

  res.json({cars});
})




// Start the Express server
app.listen(port, () => {
  console.log(`server started at http://localhost:${port}`);
});
