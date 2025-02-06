require("dotenv").config();
const express = require("express");
const path = require("path");
const bcrypt = require("bcrypt");
const { Pool } = require("pg");
const cookieParser = require("cookie-parser");
const { v4: uuidv4 } = require("uuid");

const app = express();
const PORT = process.env.PORT || 8000;

// PostgreSQL Database Connection
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432,
  ssl: {
    rejectUnauthorized: false
}
});

app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

const cookieOptions = {
  httpOnly: true,
  secure: false,
  sameSite: "strict",
};

// Register new user
app.post("/signup", async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password) {
    return res.status(400).send("All fields are required.");
  }

  try {
    // Hash password before storing
    const hashedPassword = await bcrypt.hash(password, 10);

    // Check if username already exists
    const existingUser = await pool.query("SELECT * FROM customers WHERE username = $1", [username]);
    if (existingUser.rows.length > 0) {
      return res.status(400).send("Username is already taken.");
    }

    // Insert user into the database
    await pool.query(
      "INSERT INTO customers (username, email, password_hash) VALUES ($1, $2, $3)",
      [username, email, hashedPassword]
    );

    res.status(201).send("Signup successful! Please log in.");
  } catch (error) {
    console.error("Error signing up:", error);
    res.status(500).send("Error signing up.");
  }
});

// Login existing user
app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).send("Username and password are required.");
  }

  try {
    // Check if the user exists
    const result = await pool.query("SELECT * FROM customers WHERE username = $1", [username]);
    const user = result.rows[0];

    if (!user) {
      return res.status(401).send("Invalid username or password.");
    }

    // Compare hashed passwords
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).send("Invalid username or password.");
    }

    // Generate a session ID
    const sessionId = uuidv4();
    res.cookie("session_id", sessionId, cookieOptions);

    // Store session ID in database
    await pool.query("UPDATE customers SET session_id = $1 WHERE username = $2", [sessionId, username]);

    res.send("Login successful!");
  } catch (error) {
    console.error("Error logging in:", error);
    res.status(500).send("Login failed.");
  }
});

// Logout existing user
app.get("/logout", (req, res) => {
  res.clearCookie("session_id", cookieOptions);
  res.send("Logged out successfully.");
});

// Check login session
app.get("/checkSession", async (req, res) => {
  const sessionId = req.cookies.session_id;
  if (!sessionId) {
    return res.status(401).send("Not logged in.");
  }

  try {
    const result = await pool.query("SELECT username FROM customers WHERE session_id = $1", [sessionId]);
    const user = result.rows[0];

    if (user) {
      return res.status(200).send(`Logged in as ${user.username}`);
    } else {
      return res.status(401).send("Session expired. Please log in again.");
    }
  } catch (error) {
    console.error("Error checking session:", error);
    res.status(500).send("Session check failed.");
  }
});

app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login.html"));
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
