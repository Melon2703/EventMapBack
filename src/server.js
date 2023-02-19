const express = require("express");
const admin = require("firebase-admin");
const serviceAccount = require("./serviceAccountKey.json");
const bodyParser = require("body-parser");
const { v4: uuidv } = require("uuid");
const { Client } = require("pg");

const port = 3000;

const dataBase = new Client({
  host: process.env.DATABASE_HOST,
  port: process.env.DATABASE_PORT,
  user: process.env.DATABASE_USER,
  password: process.env.DATABASE_PASSWORD,
  database: process.env.DATABASE_NAME,
});

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL:
    "https://eventmap-2ba48-default-rtdb.europe-west1.firebasedatabase.app/",
});

const app = express();

app.use(bodyParser.urlencoded({ extended: true }));

app.use(bodyParser.json());

app.use(express.static("build"));

app.post("/login", async (req, res) => {
  const { accessToken } = req.body;

  try {
    const { uid, name, email } = await admin.auth().verifyIdToken(accessToken);

    dataBase.query(
      "SELECT * FROM users WHERE uid = $1",
      [uid],
      (error, results) => {
        if (error) {
          console.log({ error });

          res.status(400).send(error);
        } else {
          if (results.rows.length === 0) {
            dataBase.query(
              "INSERT INTO users (uid, email, name) VALUES ($1, $2, $3)",
              [uid, email, name],
              (error) => {
                if (error) {
                  console.log({ error });

                  res.status(400).send(error);
                }
              }
            );
          }

          res.json({ id: uid, email, name });
        }
      }
    );
  } catch (error) {
    console.log({ error });

    res.status(401).send("Unauthorized");
  }
});

app.post("/new-marker", (req, res) => {
  const { description, isPrivate, type, name, ownerId, position } = req.body;

  dataBase.query(
    "INSERT INTO markers (uid, description, is_private, type, name, owner_id, position) VALUES ($1, $2, $3, $4, $5, $6, $7)",
    [
      uuidv(),
      description,
      isPrivate,
      type,
      name,
      ownerId,
      JSON.stringify(position),
    ],
    (error) => {
      if (error) {
        console.log({ error });

        res.status(400).send(error);
      } else {
        res.send("Маркер успешно создан");
      }
    }
  );
});

app.delete("/remove-marker", (req, res) => {
  const { id } = req.query;

  dataBase.query("DELETE FROM markers WHERE uid = $1", [id], (error) => {
    if (error) {
      console.log({ error });

      res.status(400).send(error);
    } else {
      res.send("Маркер успешно удален");
    }
  });
});

app.get("/all-markers", (req, res) => {
  const { ownerId } = req.query;

  dataBase.query(
    "SELECT * FROM markers WHERE owner_id = $1",
    [ownerId],
    (error, result) => {
      if (error) {
        console.log({ error });

        res.status(400).send(error);
      } else {
        const markers = result.rows.map(
          ({
            description,
            is_private,
            type,
            name,
            owner_id,
            uid,
            position,
          }) => ({
            description,
            isPrivate: is_private,
            type,
            name,
            ownerId: owner_id,
            position,
            id: uid,
          })
        );

        res.send(markers);
      }
    }
  );
});

dataBase.connect().then(() =>
  app.listen(port, () => {
    console.log(`Server is listening on port ${port}`);
  })
);
