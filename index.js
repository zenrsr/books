const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const dbPath = path.join(__dirname, "goodreads.db");
const app = express();

app.use(express.json());

let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({ filename: dbPath, driver: sqlite3.Database });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(-1);
  }
};
initializeDBAndServer();

// Middleware Function
const logger = (request, response, next) => {
  console.log("Middleware Function");
  next();
};
const authenticateToken = (request, response, next) => {
  try {
    const authHeader = request.headers["authorization"];
    if (authHeader === undefined) {
      response.status(401).send("Authorization not valid");
    } else {
      const jwtToken = authHeader.split(" ")[1];
      //   console.log(jwtToken);
      jwt.verify(jwtToken, "lee", async (error, payload) => {
        if (error) {
          response.status(401).send("Invalid access Token");
        } else {
          console.log(payload);
          request.username = payload.username;
          next();
        }
      });
    }
  } catch (e) {
    console.log(`${e.message}`);
  }
};

//Get Books API
app.get("/books/", authenticateToken, async (request, response) => {
  try {
    const getBooksQuery = `
                SELECT
                    *
                FROM
                    book
                ORDER BY
                    book_id;`;
    const booksArray = await db.all(getBooksQuery);
    response.send(booksArray);
  } catch (e) {
    console.log(`${e.message}`);
  }
});

//Get Book API
app.get("/books/:bookId/", async (request, response) => {
  const { bookId } = request.params;
  const getBookQuery = `
      SELECT
       *
      FROM
       book 
      WHERE
       book_id = ${bookId};
    `;
  const book = await db.get(getBookQuery);
  response.send(book);
});

//User Register API
app.post("/users/", async (request, response) => {
  const { username, name, password, gender, location } = request.body;
  const hashedPassword = await bcrypt.hash(request.body.password, 10);
  const selectUserQuery = `SELECT * FROM user WHERE username = '${username}'`;
  const dbUser = await db.get(selectUserQuery);
  if (dbUser === undefined) {
    const createUserQuery = `
      INSERT INTO 
        user (username, name, password, gender, location) 
      VALUES 
        (
          '${username}', 
          '${name}',
          '${hashedPassword}', 
          '${gender}',
          '${location}'
        )`;
    await db.run(createUserQuery);
    response.send(`User created successfully`);
  } else {
    response.status(400);
    response.send("User already exists");
  }
});

//User Login API
app.post("/login/", async (request, response) => {
  const { username, password } = request.body;
  const selectUserQuery = `
    SELECT
      *
    FROM
      user
    WHERE 
      username = '${username}';`;
  const dbUser = await db.get(selectUserQuery);

  try {
    if (dbUser === undefined) {
      response.status(400);
      response.send("Invalid User");
    } else {
      const isPasswordMatched = await bcrypt.compare(password, dbUser.password);
      if (isPasswordMatched === true) {
        const payload = { username: username };
        const jwtToken = await jwt.sign(payload, "lee");
        response.send({ jwtToken });
      } else {
        response.status(400);
        response.send("Invalid Password");
      }
    }
  } catch (e) {
    console.log(`${e.message}`);
  }
});

// Get Profile
app.get("/profile/", authenticateToken, async (request, response) => {
  try {
    const { username } = request;
    console.log(username);
    const getQuery = `SELECT * FROM user WHERE username = '${username}';`;
    const x = await db.get(getQuery);
    response.status(200).send(x);
  } catch (e) {
    console.log(`${e.message}`);
  }
});
