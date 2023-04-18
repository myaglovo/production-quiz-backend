const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const pdf = require("html-pdf");
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

const createPDF = async (name, score, id, email) => {
  const browser = await puppeteer.launch();
  const page = await browser.newPage();
  await page.goto("http://localhost:5002/", { waitUntil: "networkidle0" });
  await page.evaluate(
    (name, score, id) => {
      const idElement = document.getElementById("id");
      const nameElement = document.getElementById("name");
      const scoreElement = document.getElementById("convertedScore");
      const convertedScore = Math.round((score / 18) * 100);
      nameElement.textContent = name;
      scoreElement.textContent = convertedScore;
      idElement.textContent = id;
    },
    name,
    score,
    id
  );
  const pdfBuffer = await page.pdf({
    format: "A4",
    printBackground: true,
    scale: 0.9,
  });
  fs.writeFileSync(`./${id}-${email}.pdf`, pdfBuffer);
  await browser.close();
  return pdfBuffer;
};

// POST add user to DB
app.post("/create-pdf", async (req, res) => {
  try {
    const { name, email, score } = req.body;

    const usersArray = await Record.findAll();
    let userId;
    if (usersArray.length > 0) {
      userId = usersArray[usersArray.length - 1].id;
      userId += 1;
    } else {
      userId = 1;
    }

    await createPDF(name, score, userId, email);
    const pdfBuffer = fs.readFileSync(`./${userId}-${email}.pdf`);

    await Record.create({
      name,
      email,
      score,
      status: "new",
      pdf: pdfBuffer,
    });

    const transporter = nodemailer.createTransport({
      host: "smtp.mail.ru",
      port: 465,
      secure: true,
      auth: {
        user: "team@salekhardpomnit.ru",
        pass: "DDcfBvbX5jUyDm58XjCh",
      },
    });

    // Настройте параметры сообщения
    const mailOptions = {
      from: "team@salekhardpomnit.ru",
      to: "team@salekhardpomnit.ru",
      subject: `Новая заявка ${name}`,
      text: `Детали заявки: ${name}, ${email} /n http://тест.салехардпоминт.рф/admin`,
    };

    await transporter.sendMail(mailOptions);
    res.status(200).send("Success");
  } catch (error) {
    console.log(error);
    res.status(500).send("Error saving data");
  }
});

app.get("/users", async (req, res) => {
  const result = await Record.findAll();
  res.json(result);
});

// POST update user to DB
app.post("/users", async (req, res) => {
  try {
    const { id, dataValue } = req.body;
    await updateUserInfo(id, dataValue);
    res.status(200).send("Success");
  } catch (err) {
    console.error(err);
  }
});
// ----------------------------------------------------------------
async function updateUserInfo(id, dataValue) {
  const status = dataValue === "submit" ? "sended" : "error";
  try {
    // Найдите запись по ID
    const user = await Record.findByPk(id);

    // Обновите его статус
    user.status = status;
    await user.save();
    if (status === "sended") {
      await sendEmail(id, user.email);
      console.log(`User with ID ${id} updated successfully`);
    }
  } catch (err) {
    console.error(err);
  }
}

// Функция для получения записи по ID и отправки письма на указанный адрес электронной почты
async function sendEmail(id, recipientEmail) {
  try {
    // Найдите запись по ID
    const result = await Record.findByPk(id);
    console.log(result.dataValues);
    const { email } = result.dataValues;

    const usersArray = await Record.findAll();
    let userId;
    if (usersArray.length > 1) {
      userId = usersArray[usersArray.length - 1].id;
      userId += 1;
    } else {
      userId = 1;
    }

    // Создайте объект транспорта для отправки письма через SMTP
    const transporter = nodemailer.createTransport({
      host: "smtp.mail.ru",
      port: 465,
      secure: true,
      auth: {
        user: "team@salekhardpomnit.ru",
        pass: "DDcfBvbX5jUyDm58XjCh",
      },
    });

    // Настройте параметры сообщения
    const mailOptions = {
      from: "team@salekhardpomnit.ru",
      to: recipientEmail,
      subject: `Диплом за прохождение теста`,
      text: 'Здравствуйте!\n\nВаш диплом за прохождение теста "Я помню. Я горжусь" готов.\n\nСпасибо за участие!\nКоманда проекта "Народная победа".',
      attachments: [
        {
          filename: "диплом.pdf",
          path: `./${userId}-${email}.pdf`,
        },
      ],
    };

    // Отправьте письмо
    const info = await transporter.sendMail(mailOptions);
    console.log(`Email sent: ${info.response}`);
  } catch (err) {
    console.error(err);
  }
}

// ----------------------------------------------------------------

app.listen(port, () => console.log("listening on port " + port));

// -- сверстать pdf файл
// сделать админку с авторизацией
// сделать get запрос всех клиентов в таблице + кнопка отправить
// сделать put запрос на отправку данных клиенту + пометку в БД (sended true);
