const express = require("express");
const path = require("path");
const jwt = require("jsonwebtoken");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const bcrypt = require("bcrypt");

const app = express();
app.use(express.json());

const dbPath = path.join(__dirname, "goodreads.db");

let db = null;

const initializeDBAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    app.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error: ${e.message}`);
    process.exit(1);
  }
};
initializeDBAndServer();

// Get Books API
app.get("/books/", async (request, response) => {
  try {
    let jwtToken;
    const authHeader = request.header["authorization"];
    if (authHeader === undefined) {
      response.status(401);
      response.send("You are not authorized for this session");
    } else {
      jwtToken = authHeader.split(" ")[1];
      jwt.verify(jwtToken, "tesla", async (error, payload) => {
        if (error) {
          response.status(401).send("Invalid Token Access");
        } else {
          const getBooksQuery = `
                    SELECT
                        *
                    FROM
                        book
                    ORDER BY
                        book_id;`;
          const booksArray = await db.all(getBooksQuery);
          response.send(booksArray);
        }
      });
    }
  } catch (e) {
    console.log(`${e.message}`);
  }
});

// User Register API
app.post("/users/", async (request, response) => {
  const { username, name, password, gender, location } = request.body;
  const hashedPassword = await bcrypt.hash(password, 10);
  const selectUserQuery = `
    SELECT 
      * 
    FROM 
      user 
    WHERE 
      username = '${username}';`;
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
      );`;
    await db.run(createUserQuery);
    response.send("User created successfully");
  } else {
    response.status(400);
    response.send("User already exists");
  }
});

// User Login API
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
      const payload = { username: username };
      const jwtToken = jwt.sign(payload, "tesla");
      if (isPasswordMatched === true) {
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
