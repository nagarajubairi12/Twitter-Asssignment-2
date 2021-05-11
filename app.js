const express = require("express");
const path = require("path");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

const app = express();
app.use(express.json());
const dbPath = path.join(__dirname, "twitterClone.db");

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

const authenticateToken = (request, response, next) => {
  let jwtToken;
  const authHeader = request.headers["authorization"];
  if (authHeader !== undefined) {
    jwtToken = authHeader.split(" ")[1];
  }
  if (jwtToken === undefined) {
    response.status(401);
    response.send("Invalid JWT Token");
  } else {
    jwt.verify(jwtToken, "MY_SECRET_TOKEN", async (error, payload) => {
      if (error) {
        response.status(401);
        response.send("Invalid JWT Token");
      } else {
        request.username = payload.username;
        next();
      }
    });
  }
};

const isValiedPassword = (password) => {
  return password.length > 6;
};

// API 1 user register

app.post("/register", async (request, response) => {
  const { username, password, name, gender } = request.body;
  const hashedPassword = await bcrypt.hash(password, 10);

  const selectUserQuery = `
  SELECT * FROM user WHERE username = '${username}'`;
  const dbUser = await db.get(selectUserQuery);

  if (dbUser === undefined) {
    const createUserQuery = `
  INSERT INTO
    user ( username, password, name, gender)
  VALUES
    (
      '${username}',
      '${hashedPassword}',
      '${name}',
      '${gender}'
    );`;

    if (isValiedPassword(password)) {
      const dbResponse = await db.run(createUserQuery);
      const user_id = dbResponse.lastID;
      response.send("User created successfully");
    } else {
      response.status(400);
      response.send("Password is too short");
    }
  } else {
    response.status(400);
    response.send("User already exists");
  }
});

// API 2 login

app.post("/login/", async (request, response) => {
  const { username, password } = request.body;
  const selectUserQuery = `SELECT * FROM user WHERE username = '${username}'`;
  const dbUser = await db.get(selectUserQuery);
  if (dbUser === undefined) {
    response.status(400);
    response.send("Invalid user");
  } else {
    const isPasswordMatched = await bcrypt.compare(password, dbUser.password);
    if (isPasswordMatched === true) {
      const payload = {
        username: username,
      };
      const jwtToken = jwt.sign(payload, "MY_SECRET_TOKEN");
      response.send({ jwtToken });
    } else {
      response.status(400);
      response.send("Invalid password");
    }
  }
});

app.get("/user/", async (request, response) => {
  const getUserQuery = `
  SELECT *
  FROM 
  user;`;
  const userArray = await db.all(getUserQuery);
  response.send(userArray);
});

// API 3

app.get("/user/tweets/feed/", authenticateToken, async (request, response) => {
  const userId = 2;
  const getUserQuery = `
  SELECT username, tweet, date_time AS dateTime 
  FROM 
  user INNER JOIN tweet ON user.user_id = tweet.user_id 
  ORDER BY dateTime DESC 
  LIMIT 4;`;
  const userArray = await db.all(getUserQuery);
  response.send(userArray);
});

app.get("/following/", async (request, response) => {
  const getUserQuery = `
  SELECT *
  FROM 
  follower
  ;`;
  const userArray = await db.all(getUserQuery);
  response.send(userArray);
});

// API 4

app.get("/user/following/", authenticateToken, async (request, response) => {
  const userId = 3;
  const getUserQuery = `
  SELECT name
  FROM 
  user INNER JOIN follower ON user.user_id = follower.following_user_id
  WHERE user_id = ${userId}
  
  ;`;
  const userArray = await db.all(getUserQuery);
  response.send(userArray);
});

// API 5

app.get("/user/followers/", authenticateToken, async (request, response) => {
  const userId = 2;

  const getUserQuery = `
  SELECT name
  FROM 
  user LEFT JOIN follower ON user.user_id = follower.follower_user_id
  WHERE user_id =${userId}
  ;`;
  const userArray = await db.all(getUserQuery);
  response.send(userArray);
});

// API 6

app.get("/tweets/:tweetId/", authenticateToken, async (request, response) =>{

}

// API 7

app.get("/tweets/:tweetId/likes/", authenticateToken, async (request, response) =>{

}

// API 8

app.get("/tweets/:tweetId/replies/", authenticateToken, async (request, response) =>{

}

// API 9

app.get("/user/tweets/", authenticateToken, async (request, response) =>{
    const userId = 2;

}


// API 10

app.post("/user/tweets/", authenticateToken, async (request, response) => {
  const { tweet } = request.body;
  const userId = 2;

  const userPostQuery = `
    INSERT INTO
    tweet ( tweet, user_id)
  VALUES
    (
      '${tweet}',
      ${userId}
      );`;

  const tweetResponse = await db.run(userPostQuery);
  const tweet_id = tweetResponse.lastID;
  response.send("Created a Tweet");
});

// API 11

app.delete(
  "/tweets/:tweetId/",
  authenticateToken,
  async (request, response) => {
    const { tweetId } = request.params;
    const userId = 2;
    const deleteId = `
    SELECT tweet_id from tweet WHERE user_id = ${userId} and tweet_id = ${tweetId}`;
    const deleteResponse = await db.get(deleteId);
    if (deleteResponse === undefined) {
      response.status(401);
      response.send("Invalid Request");
    } else {
      const deleteQuery = `
    DELETE FROM 
    tweet
    WHERE
    user_id = ${userId} and 
    tweet_id = '${tweetId}';`;

      const dbResponse = await db.run(deleteQuery);
      response.send("Tweet Removed");
    }
  }
);

module.exports = app;
