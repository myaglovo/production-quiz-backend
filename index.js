const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const cors = require("cors");
const fs = require("fs");
const Sequelize = require("sequelize");
const nodemailer = require("nodemailer");
const puppeteer = require("puppeteer");

const app = express();
app.use(express.static(path.join(__dirname, "public")));
const port = process.env.PORT || 5000;

app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

const sequelize = new Sequelize(
  "u2015014_default",
  "u2015014_user",
  "85bVPrkMpEs67RfS",
  {
    host: "server210.hosting.reg.ru",
    dialect: "mysql",
  }
);

const Record = sequelize.define("users", {
  name: Sequelize.STRING,
  email: Sequelize.STRING,
  score: Sequelize.INTEGER,
  status: Sequelize.STRING,
  pdf: Sequelize.BLOB,
});

// аутенификация sequalize
sequelize
  .authenticate()
  .then(() => {
    console.log("Connection has been established successfully.");
  })
  .catch((err) => {
    console.error("Unable to connect to the database:", err);
  });

// POST add user to DB
app.post("/", async (req, res) => {
  try {
    const { name, email, score } = req.body;

    await Record.create({
      name,
      email,
      score,
      status: "new",
    });

    res.status(200).send("Success");
  } catch (error) {
    console.log(error);
    res.status(500).send("Error saving data");
  }
});

app.listen(port, () => console.log("listening on port " + port));
