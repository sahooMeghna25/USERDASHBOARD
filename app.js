const express = require("express");
const mysql = require("mysql2");
const bodyParser = require("body-parser");
const bcrypt = require("bcryptjs");
const path = require("path");
const session = require("express-session");

const app = express();

// Database connection
const db = mysql.createConnection({
  host: "localhost",
  user: "root",
  password: "meghna",
  database: "test",
});

db.connect((err) => {
  if (err) throw err;
  console.log("Connected to database");
});

// Middleware
app.use("/src", express.static("src"));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static(path.join(__dirname, "..", "views")));
app.set("view engine", "ejs");
app.use(
  session({
    secret: "secret-key",
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 3000 },
    
  })
);

// Routes
app.get("/", (req, res) => {
  res.render("index");
});

app.get("/register", (req, res) => {
  res.render("register");
});

app.post("/register", (req, res) => {
  const { name, email, phone, education, password, experience } = req.body;
  const hashedPassword = bcrypt.hashSync(password, 8);

  const sql =
    "INSERT INTO users_inf (name, email, phone, education, password,experience) VALUES (?, ?, ?, ?, ?,?)";
  db.query(
    sql,
    [name, email, phone, education, hashedPassword, experience],
    (err, result) => {
      if (err) throw err;
      res.redirect("/login");
    }
  );
});

app.get("/login", (req, res) => {
  res.render("login");
});

app.post("/login", (req, res) => {
  const { email, password } = req.body;

  const sql = "SELECT * FROM users_inf WHERE email = ?";
  db.query(sql, [email], (err, results) => {
    if (err) throw err;

    if (results.length > 0) {
      const user = results[0];

      if (bcrypt.compareSync(password, user.password)) {
        req.session.userId = user.id; // Store user ID in session
        //res.redirect(`/dashboard/${user.id}`);
        res.render("landing");
      } else {
        res.send("Invalid credentials");
      }
    } else {
      res.send("User not found");
    }
  });
});

app.get("/dashboard/:id", (req, res) => {
  if (req.session.userId) {
    console.log("start", req.session.userId);
    const sql = "SELECT * FROM users_inf WHERE id = ?";
    //res.send(`welcome ${req.session.userId}`);
    db.query(sql, [req.params.id], (err, result) => {
      if (err) throw err;

      res.render("dashboard", { user: result[0] });
    });
  } else {
    res.redirect("/index");
  }
});

app.get("/logout", (req, res) => {
  req.session.destroy((err) => {
    if (err) throw err;
    res.redirect("/login"); // Redirect to login page after logout
  });
});

app.listen(8080, () => {
  console.log("Server running on port 8080");
});
