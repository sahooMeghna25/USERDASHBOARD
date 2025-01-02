require("dotenv").config();
const express = require("express");
const mysql = require("mysql2");
const bodyParser = require("body-parser");
const bcrypt = require("bcryptjs");
const path = require("path");
const session = require("express-session");
const MySQLStore = require("express-mysql-session")(session);

const app = express();

// Database connection
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

db.connect((err) => {
  if (err) {
    console.error("Database connection failed:", err);
    process.exit(1);
  }
  console.log("Connected to database");
});

// Session store
const sessionStore = new MySQLStore({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});

// Middleware
app.use(express.static(path.join(__dirname, "public")));

app.use(bodyParser.urlencoded({ extended: false }));
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "public", "views"));
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: sessionStore,
    cookie: { maxAge: 3600000 },
  })
);

// Routes
app.get("/", (req, res) => res.render("index"));
app.get("/register", (req, res) => res.render("register"));

app.post("/register", (req, res) => {
  const { name, email, phone, education, password, experience } = req.body;
  const hashedPassword = bcrypt.hashSync(password, 10);

  const sql =
    "INSERT INTO users_inf (name, email, phone, education, password, experience) VALUES (?, ?, ?, ?, ?, ?)";
  db.query(
    sql,
    [name, email, phone, education, hashedPassword, experience],
    (err) => {
      if (err) {
        console.error(err);
        return res.status(500).send("Internal Server Error");
      }
      res.redirect("/login");
    }
  );
});

app.get("/login", (req, res) => res.render("login"));

app.post("/login", (req, res) => {
  const { email, password } = req.body;

  const sql = "SELECT * FROM users_inf WHERE email = ?";
  db.query(sql, [email], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).send("Internal Server Error");
    }

    if (results.length > 0) {
      const user = results[0];
      if (bcrypt.compareSync(password, user.password)) {
        req.session.userId = user.id;
        res.redirect(`/dashboard/${user.id}`);
      } else {
        res.send("Invalid credentials");
      }
    } else {
      res.send("User not found");
    }
  });
});

app.get("/dashboard/:id", (req, res) => {
  if (req.session.userId && req.session.userId == req.params.id) {
    const sql = "SELECT * FROM users_inf WHERE id = ?";
    db.query(sql, [req.params.id], (err, result) => {
      if (err) {
        console.error(err);
        return res.status(500).send("Internal Server Error");
      }
      res.render("dashboard", { user: result[0] });
    });
  } else {
    res.redirect("/login");
  }
});

app.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error(err);
      return res.status(500).send("Internal Server Error");
    }
    res.redirect("/login");
  });
});

// 404 handler
app.use((req, res) => res.status(404).send("Page Not Found"));

// Start server
app.listen(8080, () => {
  console.log("Server running on port 8080");
});
