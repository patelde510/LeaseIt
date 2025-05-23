require("dotenv").config();
const express = require("express");
const path = require("path");
const bcrypt = require("bcrypt");
const { Pool } = require("pg");
const cookieParser = require("cookie-parser");
const { v4: uuidv4 } = require("uuid");
const multer = require("multer");
const AWS = require("aws-sdk");

const app = express();
const PORT = process.env.PORT || 8000;


const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT || 5432,
  // COMMENT OUT THE PART BELOW WHEN USING A LOCAL DATABASE
  ssl: {
   rejectUnauthorized: false
  }
});


const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID_S3,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY_S3,
  region: process.env.AWS_REGION
});

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
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

// Middleware to verify session and retrieve user information
async function verifySession(req, res, next) {
  const sessionId = req.cookies.session_id;
  if (!sessionId) {
    return res.status(401).send("Not logged in.");
  }

  try {
    const result = await pool.query("SELECT user_id FROM users WHERE session_id = $1", [sessionId]);
    const user = result.rows[0];

    if (user) {
      req.user = user;
      next();
    } else {
      return res.status(401).send("Session expired. Please log in again.");
    }
  } catch (error) {
    console.error("Error verifying session:", error);
    res.status(500).send("Session verification failed.");
  }
}

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
    const existingUser = await pool.query("SELECT * FROM users WHERE username = $1", [username]);
    if (existingUser.rows.length > 0) {
      return res.status(400).send("Username is already taken.");
    }

    // Insert user into the database
    await pool.query(
      "INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3)",
      [username, email, hashedPassword]
    );

    res.status(200).send("Signup successful! Please log in.");
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
    const result = await pool.query("SELECT * FROM users WHERE username = $1", [username]);
    const user = result.rows[0];

    if (!user) {
      return res.status(400).send("Invalid username or password.");
    }

    // Compare hashed passwords
    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(400).send("Invalid username or password.");
    }

    // Generate a session ID
    const sessionId = uuidv4();
    res.cookie("session_id", sessionId, cookieOptions);

    // Store session ID in database
    await pool.query("UPDATE users SET session_id = $1 WHERE username = $2", [sessionId, username]);

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
    const result = await pool.query("SELECT username FROM users WHERE session_id = $1", [sessionId]);
    const user = result.rows[0];

    if (user) {
      return res.status(200).send(`${user.username}`);
    } else {
      return res.status(401).send("Session expired. Please log in again.");
    }
  } catch (error) {
    console.error("Error checking session:", error);
    res.status(500).send("Session check failed.");
  }
});

// *Post Lease API*
app.post("/post-lease", verifySession, upload.array("images", 10), async (req, res) => {
  try {
    const user_id = req.user.user_id;
    const leaseData = JSON.parse(req.body.leaseData);

    const {
      title, description, price, start_date, end_date, property_type,
      shared_space, furnished, bathroom_type, bedrooms, bathrooms,
      street, city, state, zip, phone, email, amenities
    } = leaseData;

    if (!title || !price || !start_date || !end_date || !property_type ||
      !bedrooms || !bathrooms || !street || !city || !state || !zip || !phone || !email) {
      return res.status(400).json({ error: "Missing required fields" });
    }

    const leaseResult = await pool.query(`
      INSERT INTO leases (user_id, title, description, price, start_date, end_date, 
          property_type, shared_space, furnished, bathroom_type, bedrooms, bathrooms, phone, email, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, 'available')
      RETURNING lease_id
    `, [user_id, title, description, price, start_date, end_date, property_type,
      shared_space, furnished, bathroom_type, bedrooms, bathrooms, phone, email]);

    const lease_id = leaseResult.rows[0].lease_id;

    await pool.query(`
      INSERT INTO addresses (lease_id, street, city, state, zip_code)
      VALUES ($1, $2, $3, $4, $5)
    `, [lease_id, street, city, state, zip]);

    if (amenities && amenities.length > 0) {
      const amenityValues = amenities.map(amenity => `(${lease_id}, '${amenity}')`).join(",");
      await pool.query(`INSERT INTO amenities (lease_id, amenity) VALUES ${amenityValues}`);
    }

    if (req.files) {
      const imageLinks = [];
      for (const file of req.files) {
        const params = {
          Bucket: process.env.AWS_S3_BUCKET,
          Key: `LeaseImages/${lease_id}/${file.originalname}`,
          Body: file.buffer,
          ContentType: file.mimetype,
          ACL: 'public-read'
        };

        const uploadResult = await s3.upload(params).promise();
        imageLinks.push(uploadResult.Location);
      }

      if (imageLinks.length > 0) {
        const imageValues = imageLinks.map(link => `(${lease_id}, '${link}')`).join(",");
        await pool.query(`INSERT INTO lease_images (lease_id, image_url) VALUES ${imageValues}`);
      }
    }

    res.status(201).json({ message: "Lease posted successfully!", lease_id });
  } catch (err) {
    console.error("Error inserting lease:", err);
    res.status(500).json({ error: "Failed to post lease" });
  }
});


// *Search Lease*
app.post("/search-leases", async (req, res) => {
  try {
    const {
      address, monthStart, monthEnd, maxPrice,
      bedrooms, bathrooms, propertyType, sharedSpace, furnished, 
      bathroomType, amenities
    } = req.body;

    let query = `
      SELECT l.lease_id, l.title, l.description, l.price, l.bedrooms, l.bathrooms, l.shared_space, l.furnished, l.bathroom_type, l.email, l.property_type,
             a.street, a.city, a.state, a.zip_code,
             TO_CHAR(l.start_date, 'Month YYYY') || ' to ' || TO_CHAR(l.end_date, 'Month YYYY') AS lease_duration,
             ARRAY_AGG(DISTINCT li.image_url) FILTER (WHERE li.image_url IS NOT NULL) AS images,
             ARRAY_AGG(DISTINCT am.amenity) FILTER (WHERE am.amenity IS NOT NULL) AS amenities
      FROM leases l
      JOIN addresses a ON l.lease_id = a.lease_id
      LEFT JOIN lease_images li ON l.lease_id = li.lease_id
      LEFT JOIN amenities am ON l.lease_id = am.lease_id
      WHERE 1=1 
    `;
    query += ` AND l.status = 'available' `;

    let values = [];
    let counter = 1;

    if (address) {
      const addr = address.trim().toLowerCase();
      const parts = addr.split(",").map(p => p.trim());
    
      if (parts.length === 3) {
        // Full address: street, city, state zip 
        query += ` AND LOWER(a.street) LIKE $${counter}
                   AND LOWER(a.city) LIKE $${counter + 1}
                   AND LOWER(a.state) LIKE $${counter + 2}`;
        values.push(`%${parts[0]}%`);
        values.push(`%${parts[1]}%`);
        values.push(`%${parts[2].split(" ")[0]}%`); // handles "PA 19446"
        counter += 3;
      } else if (parts.length === 2) {
        // City, State
        query += ` AND LOWER(a.city) LIKE $${counter}
                   AND LOWER(a.state) LIKE $${counter + 1}`;
        values.push(`%${parts[0]}%`);
        values.push(`%${parts[1]}%`);
        counter += 2;
      } else {
        // Generic partial match
        query += ` AND (
          LOWER(a.street) LIKE $${counter} OR 
          LOWER(a.city) LIKE $${counter} OR 
          LOWER(a.state) LIKE $${counter} OR
          a.zip_code::text LIKE $${counter}
        )`;
        values.push(`%${addr}%`);
        counter++;
      }
    }
    
    
    
    
    // Fix: Exact Month & Year Matching
    if (monthStart) {
      query += ` AND TO_CHAR(l.start_date, 'YYYY-MM') = $${counter}`;
      values.push(monthStart);
      counter++;
    }
    if (monthEnd) {
      query += ` AND TO_CHAR(l.end_date, 'YYYY-MM') = $${counter}`;
      values.push(monthEnd);
      counter++;
    }

    // Max Price Filter
    if (maxPrice) {
      query += ` AND l.price <= $${counter}`;
      values.push(maxPrice);
      counter++;
    }

    // Bedrooms and Bathrooms
    if (bedrooms) {
      query += ` AND l.bedrooms = $${counter}`;
      values.push(bedrooms);
      counter++;
    }
    if (bathrooms) {
      query += ` AND l.bathrooms = $${counter}`;
      values.push(bathrooms);
      counter++;
    }

    // Property Type
    if (propertyType) {
      query += ` AND LOWER(l.property_type) = LOWER($${counter})`;
      values.push(propertyType.toLowerCase());
      counter++;
    }

    // Shared Space Filter
    if (sharedSpace) {
      query += ` AND l.shared_space = $${counter}`;
      values.push(sharedSpace === "yes");
      counter++;
    }

    // Furnished Filter
    if (furnished) {
      query += ` AND l.furnished = $${counter}`;
      values.push(furnished === "yes" ? true : false);
      counter++;
    }

    // **🔹 Bathroom Type Filter**
    if (bathroomType) {
      query += ` AND LOWER(l.bathroom_type) = LOWER($${counter})`;
      values.push(bathroomType.toLowerCase());
      counter++;
    }

    // **🔹 Fixed Amenities Filtering**
    if (amenities && amenities.length > 0) {
      const formattedAmenities = amenities.map(a =>
        a.toLowerCase().replace(/\s+/g, "-").replace("/", "-")
      );

      query += ` AND l.lease_id IN (
          SELECT lease_id FROM amenities
          WHERE LOWER(amenity) = ANY($${counter})
          GROUP BY lease_id
          HAVING COUNT(DISTINCT amenity) >= $${counter + 1}
        )`;
      values.push(formattedAmenities);
      values.push(formattedAmenities.length);
      counter += 2;
    }

    // **🔹 Grouping & Ordering**
    query += `
      GROUP BY l.lease_id, l.title, l.price, l.bedrooms, l.bathrooms, 
               a.street, a.city, a.state, a.zip_code, lease_duration
      ORDER BY l.price ASC;
    `;

    const result = await pool.query(query, values);
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching leases:", error);
    res.status(500).json({ error: "Server error fetching leases" });
  }
});

app.get("/all-leases", async (req, res) => {
  try {
    const query = `
      SELECT 
        l.lease_id, l.title, l.description, l.price, l.bedrooms, l.bathrooms, 
        l.property_type, l.shared_space, l.furnished, l.bathroom_type, l.email,
        a.street, a.city, a.state, a.zip_code,
        TO_CHAR(l.start_date, 'Month YYYY') || ' to ' || TO_CHAR(l.end_date, 'Month YYYY') AS lease_duration,
        ARRAY_AGG(DISTINCT li.image_url) FILTER (WHERE li.image_url IS NOT NULL) AS images,
        ARRAY_AGG(DISTINCT am.amenity) FILTER (WHERE am.amenity IS NOT NULL) AS amenities
      FROM leases l
      JOIN addresses a ON l.lease_id = a.lease_id
      LEFT JOIN lease_images li ON l.lease_id = li.lease_id
      LEFT JOIN amenities am ON l.lease_id = am.lease_id
      WHERE l.status = 'available'
      GROUP BY 
        l.lease_id, l.title, l.price, l.bedrooms, l.bathrooms,
        l.property_type, l.shared_space, l.furnished, l.bathroom_type, l.email,
        a.street, a.city, a.state, a.zip_code, lease_duration
      ORDER BY l.price ASC;
    `;

    const result = await pool.query(query);
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching leases:", error);
    res.status(500).json({ error: "Server error fetching leases" });
  }
});

// API endpoint to add a lease to favorites
app.post("/api/favorites/add", verifySession, async (req, res) => {
  const { lease_id } = req.body;
  const user_id = req.user.user_id;

  if (!lease_id) {
    return res.status(400).json({ error: "Lease ID is required." });
  }

  try {
    const checkFavorite = await pool.query(
      "SELECT * FROM favorites WHERE user_id = $1 AND lease_id = $2",
      [user_id, lease_id]
    );

    if (checkFavorite.rows.length > 0) {
      return res.status(409).json({ message: "Lease is already in favorites." });
    }

    await pool.query(
      "INSERT INTO favorites (user_id, lease_id) VALUES ($1, $2)",
      [user_id, lease_id]
    );
    res.status(201).json({ message: "Lease added to favorites." });
  } catch (error) {
    console.error("Error adding to favorites:", error);
    res.status(500).json({ error: "Failed to add lease to favorites." });
  }
});

// API endpoint to remove a lease from favorites
app.delete("/api/favorites/remove", verifySession, async (req, res) => {
  const { lease_id } = req.body;
  const user_id = req.user.user_id;

  if (!lease_id) {
    return res.status(400).json({ error: "Lease ID is required." });
  }

  try {
    const result = await pool.query(
      "DELETE FROM favorites WHERE user_id = $1 AND lease_id = $2",
      [user_id, lease_id]
    );

    if (result.rowCount > 0) {
      res.json({ message: "Lease removed from favorites." });
    } else {
      res.status(404).json({ message: "Lease not found in your favorites." });
    }
  } catch (error) {
    console.error("Error removing from favorites:", error);
    res.status(500).json({ error: "Failed to remove lease from favorites." });
  }
});

// API endpoint to get the current user's favorite leases
app.get("/api/favorites", verifySession, async (req, res) => {
  const user_id = req.user.user_id;

  try {
    let result = await pool.query(`
      SELECT l.lease_id, l.title, l.price, l.bedrooms, l.bathrooms,
             a.street, a.city, a.state, a.zip_code,
             TO_CHAR(l.start_date, 'Month<ctrl3348>') || ' to ' || TO_CHAR(l.end_date, 'Month<ctrl3348>') AS lease_duration,
             ARRAY_AGG(DISTINCT li.image_url) FILTER (WHERE li.image_url IS NOT NULL) AS images,
             ARRAY_AGG(DISTINCT am.amenity) FILTER (WHERE am.amenity IS NOT NULL) AS amenities
      FROM favorites f
      JOIN leases l ON f.lease_id = l.lease_id
      JOIN addresses a ON l.lease_id = a.lease_id
      LEFT JOIN lease_images li ON l.lease_id = li.lease_id
      LEFT JOIN amenities am ON l.lease_id = am.lease_id
      WHERE f.user_id = $1
      AND l.status = 'available'
      GROUP BY l.lease_id, l.title, l.price, l.bedrooms, l.bathrooms,
               a.street, a.city, a.state, a.zip_code, lease_duration
      ORDER BY l.price ASC;
    `, [user_id]);
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching favorite leases:", error);
    res.status(500).json({ error: "Failed to fetch favorite leases." });
  }
});

// Update /search-leases to return if a lease is favorited
app.post("/search-leases", verifySession, async (req, res) => {
  try {
    const {
      address, monthStart, monthEnd, maxPrice,
      bedrooms, bathrooms, propertyType, sharedSpace, furnished,
      bathroomType, amenities
    } = req.body;

    let query = `
      SELECT l.lease_id, l.title, l.price, l.bedrooms, l.bathrooms,
             a.street, a.city, a.state, a.zip_code,
             TO_CHAR(l.start_date, 'Month<ctrl3348>') || ' to ' || TO_CHAR(l.end_date, 'Month<ctrl3348>') AS lease_duration,
             ARRAY_AGG(DISTINCT li.image_url) FILTER (WHERE li.image_url IS NOT NULL) AS images,
             ARRAY_AGG(DISTINCT am.amenity) FILTER (WHERE am.amenity IS NOT NULL) AS amenities,
             CASE WHEN EXISTS (SELECT 1 FROM favorites WHERE user_id = $${values.length + 1} AND lease_id = l.lease_id) THEN true ELSE false END AS is_favorite
      FROM leases l
      JOIN addresses a ON l.lease_id = a.lease_id
      LEFT JOIN lease_images li ON l.lease_id = li.lease_id
      LEFT JOIN amenities am ON l.lease_id = am.lease_id
      WHERE 1=1
    `;

    let values = [];
    let counter = 1;
    const user_id = req.user ? req.user.user_id : null; // Get user ID if logged in

    if (address) {
      const addr = address.trim().toLowerCase();
      const parts = addr.split(",").map(p => p.trim());
    
      if (parts.length === 3) {
        // Full address: street, city, state zip 
        query += ` AND LOWER(a.street) LIKE $${counter}
                   AND LOWER(a.city) LIKE $${counter + 1}
                   AND LOWER(a.state) LIKE $${counter + 2}`;
        values.push(`%${parts[0]}%`);
        values.push(`%${parts[1]}%`);
        values.push(`%${parts[2].split(" ")[0]}%`); // handles "PA 19446"
        counter += 3;
      } else if (parts.length === 2) {
        // City, State
        query += ` AND LOWER(a.city) LIKE $${counter}
                   AND LOWER(a.state) LIKE $${counter + 1}`;
        values.push(`%${parts[0]}%`);
        values.push(`%${parts[1]}%`);
        counter += 2;
      } else {
        query += ` AND (LOWER(a.street) ILIKE LOWER($${counter})
                         OR LOWER(a.city) ILIKE LOWER($${counter})
                         OR LOWER(a.state) ILIKE LOWER($${counter}))`;
        values.push(`%${address.trim()}%`);
      }
      counter++;
    }

    // **🔹 Fix: Exact Month & Year Matching**
    if (monthStart) {
      query += ` AND TO_CHAR(l.start_date, 'YYYY-MM') = $${counter}`;
      values.push(monthStart);
      counter++;
    }
    if (monthEnd) {
      query += ` AND TO_CHAR(l.end_date, 'YYYY-MM') = $${counter}`;
      values.push(monthEnd);
      counter++;
    }

    // Max Price Filter
    if (maxPrice) {
      query += ` AND l.price <= $${counter}`;
      values.push(maxPrice);
      counter++;
    }

    // Bedrooms and Bathrooms
    if (bedrooms) {
      query += ` AND l.bedrooms = $${counter}`;
      values.push(bedrooms);
      counter++;
    }
    if (bathrooms) {
      query += ` AND l.bathrooms = $${counter}`;
      values.push(bathrooms);
      counter++;
    }

    // Property Type
    if (propertyType) {
      query += ` AND LOWER(l.property_type) = LOWER($${counter})`;
      values.push(propertyType.toLowerCase());
      counter++;
    }

    // Shared Space Filter
    if (sharedSpace) {
      query += ` AND l.shared_space = $${counter}`;
      values.push(sharedSpace === "yes");
      counter++;
    }

    // Furnished Filter
    if (furnished) {
      query += ` AND l.furnished = $${counter}`;
      values.push(furnished === "yes" ? true : false);
      counter++;
    }

    // **🔹 Bathroom Type Filter**
    if (bathroomType) {
      query += ` AND LOWER(l.bathroom_type) = LOWER($${counter})`;
      values.push(bathroomType.toLowerCase());
      counter++;
    }

    // **🔹 Fixed Amenities Filtering**
    if (amenities && amenities.length > 0) {
      const formattedAmenities = amenities.map(a =>
        a.toLowerCase().replace(/\s+/g, "-").replace("/", "-")
      );

      query += ` AND l.lease_id IN (
          SELECT lease_id FROM amenities
          WHERE LOWER(amenity) = ANY($${counter})
          GROUP BY lease_id
          HAVING COUNT(DISTINCT amenity) >= $${counter + 1}
        )`;
      values.push(formattedAmenities);
      values.push(formattedAmenities.length);
      counter += 2;
    }

    // **🔹 Grouping & Ordering**
    query += `
      GROUP BY l.lease_id, l.title, l.price, l.bedrooms, l.bathrooms,
               a.street, a.city, a.state, a.zip_code, lease_duration
      ORDER BY l.price ASC;
    `;

    if (user_id) {
      values.push(user_id); // Add user_id for the is_favorite check
    } else {
      query = query.replace(/user_id = \$\d+ AND /, ''); // Remove user_id condition if not logged in
    }

    const result = await pool.query(query, values);
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching leases:", error);
    res.status(500).json({ error: "Server error fetching leases" });
  }
});

// Update /all-leases to return if a lease is favorited
app.get("/all-leases", verifySession, async (req, res) => {
  try {
    let query = `
      SELECT l.lease_id, l.title, l.price, l.bedrooms, l.bathrooms,
             a.street, a.city, a.state, a.zip_code,
             TO_CHAR(l.start_date, 'Month<ctrl3348>') || ' to ' || TO_CHAR(l.end_date, 'Month<ctrl3348>') AS lease_duration,
             ARRAY_AGG(DISTINCT li.image_url) FILTER (WHERE li.image_url IS NOT NULL) AS images,
             ARRAY_AGG(DISTINCT am.amenity) FILTER (WHERE am.amenity IS NOT NULL) AS amenities,
             CASE WHEN EXISTS (SELECT 1 FROM favorites WHERE user_id = $1 AND lease_id = l.lease_id) THEN true ELSE false END AS is_favorite
      FROM leases l
      JOIN addresses a ON l.lease_id = a.lease_id
      LEFT JOIN lease_images li ON l.lease_id = li.lease_id
      LEFT JOIN amenities am ON l.lease_id = am.lease_id
      GROUP BY l.lease_id, l.title, l.price, l.bedrooms, l.bathrooms,
               a.street, a.city, a.state, a.zip_code, lease_duration
      ORDER BY l.price ASC;
    `;

    const user_id = req.user ? req.user.user_id : null;
    const values = user_id ? [user_id] : [];

    const result = await pool.query(query, values);
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching leases:", error);
    res.status(500).json({ error: "Server error fetching leases" });
  }
});

// API endpoint to add a lease to favorites
app.post("/api/favorites/add", verifySession, async (req, res) => {
  const { lease_id } = req.body;
  const user_id = req.user.user_id;

  if (!lease_id) {
    return res.status(400).json({ error: "Lease ID is required." });
  }

  try {
    const checkFavorite = await pool.query(
      "SELECT * FROM favorites WHERE user_id = $1 AND lease_id = $2",
      [user_id, lease_id]
    );

    if (checkFavorite.rows.length > 0) {
      return res.status(409).json({ message: "Lease is already in favorites." });
    }

    await pool.query(
      "INSERT INTO favorites (user_id, lease_id) VALUES ($1, $2)",
      [user_id, lease_id]
    );
    res.status(201).json({ message: "Lease added to favorites." });
  } catch (error) {
    console.error("Error adding to favorites:", error);
    res.status(500).json({ error: "Failed to add lease to favorites." });
  }
});

// API endpoint to remove a lease from favorites
app.delete("/api/favorites/remove", verifySession, async (req, res) => {
  const { lease_id } = req.body;
  const user_id = req.user.user_id;

  if (!lease_id) {
    return res.status(400).json({ error: "Lease ID is required." });
  }

  try {
    const result = await pool.query(
      "DELETE FROM favorites WHERE user_id = $1 AND lease_id = $2",
      [user_id, lease_id]
    );

    if (result.rowCount > 0) {
      res.json({ message: "Lease removed from favorites." });
    } else {
      res.status(404).json({ message: "Lease not found in your favorites." });
    }
  } catch (error) {
    console.error("Error removing from favorites:", error);
    res.status(500).json({ error: "Failed to remove lease from favorites." });
  }
});

// API endpoint to get the current user's favorite leases
app.get("/api/favorites", verifySession, async (req, res) => {
  const user_id = req.user.user_id;

  try {
    const result = await pool.query(`
      SELECT l.lease_id, l.title, l.price, l.bedrooms, l.bathrooms,
             a.street, a.city, a.state, a.zip_code,
             TO_CHAR(l.start_date, 'Month<ctrl3348>') || ' to ' || TO_CHAR(l.end_date, 'Month<ctrl3348>') AS lease_duration,
             ARRAY_AGG(DISTINCT li.image_url) FILTER (WHERE li.image_url IS NOT NULL) AS images,
             ARRAY_AGG(DISTINCT am.amenity) FILTER (WHERE am.amenity IS NOT NULL) AS amenities
      FROM favorites f
      JOIN leases l ON f.lease_id = l.lease_id
      JOIN addresses a ON l.lease_id = a.lease_id
      LEFT JOIN lease_images li ON l.lease_id = li.lease_id
      LEFT JOIN amenities am ON l.lease_id = am.lease_id
      WHERE f.user_id = $1
      GROUP BY l.lease_id, l.title, l.price, l.bedrooms, l.bathrooms,
               a.street, a.city, a.state, a.zip_code, lease_duration
      ORDER BY l.price ASC;
    `, [user_id]);
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching favorite leases:", error);
    res.status(500).json({ error: "Failed to fetch favorite leases." });
  }
});

// Update /search-leases to return if a lease is favorited
app.post("/search-leases", verifySession, async (req, res) => {
  try {
    const {
      address, monthStart, monthEnd, maxPrice,
      bedrooms, bathrooms, propertyType, sharedSpace, furnished,
      bathroomType, amenities
    } = req.body;

    let query = `
      SELECT l.lease_id, l.title, l.price, l.bedrooms, l.bathrooms,
             a.street, a.city, a.state, a.zip_code,
             TO_CHAR(l.start_date, 'Month<ctrl3348>') || ' to ' || TO_CHAR(l.end_date, 'Month<ctrl3348>') AS lease_duration,
             ARRAY_AGG(DISTINCT li.image_url) FILTER (WHERE li.image_url IS NOT NULL) AS images,
             ARRAY_AGG(DISTINCT am.amenity) FILTER (WHERE am.amenity IS NOT NULL) AS amenities,
             CASE WHEN EXISTS (SELECT 1 FROM favorites WHERE user_id = $${values.length + 1} AND lease_id = l.lease_id) THEN true ELSE false END AS is_favorite
      FROM leases l
      JOIN addresses a ON l.lease_id = a.lease_id
      LEFT JOIN lease_images li ON l.lease_id = li.lease_id
      LEFT JOIN amenities am ON l.lease_id = am.lease_id
      WHERE 1=1
    `;

    let values = [];
    let counter = 1;
    const user_id = req.user ? req.user.user_id : null; // Get user ID if logged in

    // **🔹 Address Filter (Zip, Street, City, State)**
    if (address) {
      if (/^\d{5}(-\d{4})?$/.test(address.trim())) {
        query += ` AND a.zip_code = $${counter}`;
        values.push(address.trim());
      } else {
        query += ` AND (LOWER(a.street) ILIKE LOWER($${counter})
                         OR LOWER(a.city) ILIKE LOWER($${counter})
                         OR LOWER(a.state) ILIKE LOWER($${counter}))`;
        values.push(`%${address.trim()}%`);
      }
      counter++;
    }

    // **🔹 Fix: Exact Month & Year Matching**
    if (monthStart) {
      query += ` AND TO_CHAR(l.start_date, 'YYYY-MM') = $${counter}`;
      values.push(monthStart);
      counter++;
    }
    if (monthEnd) {
      query += ` AND TO_CHAR(l.end_date, 'YYYY-MM') = $${counter}`;
      values.push(monthEnd);
      counter++;
    }

    // **🔹 Max Price Filter**
    if (maxPrice) {
      query += ` AND l.price <= $${counter}`;
      values.push(maxPrice);
      counter++;
    }

    // **🔹 Bedrooms and Bathrooms**
    if (bedrooms) {
      query += ` AND l.bedrooms = $${counter}`;
      values.push(bedrooms);
      counter++;
    }
    if (bathrooms) {
      query += ` AND l.bathrooms = $${counter}`;
      values.push(bathrooms);
      counter++;
    }

    // **🔹 Property Type**
    if (propertyType) {
      query += ` AND LOWER(l.property_type) = LOWER($${counter})`;
      values.push(propertyType.toLowerCase());
      counter++;
    }

    // **🔹 Shared Space Filter**
    if (sharedSpace) {
      query += ` AND l.shared_space = $${counter}`;
      values.push(sharedSpace === "yes");
      counter++;
    }

    // **🔹 Furnished Filter**
    if (furnished) {
      query += ` AND l.furnished = $${counter}`;
      values.push(furnished === "yes" ? true : false);
      counter++;
    }

    // **🔹 Bathroom Type Filter**
    if (bathroomType) {
      query += ` AND LOWER(l.bathroom_type) = LOWER($${counter})`;
      values.push(bathroomType.toLowerCase());
      counter++;
    }

    // **🔹 Fixed Amenities Filtering**
    if (amenities && amenities.length > 0) {
      const formattedAmenities = amenities.map(a =>
        a.toLowerCase().replace(/\s+/g, "-").replace("/", "-")
      );

      query += ` AND l.lease_id IN (
          SELECT lease_id FROM amenities
          WHERE LOWER(amenity) = ANY($${counter})
          GROUP BY lease_id
          HAVING COUNT(DISTINCT amenity) >= $${counter + 1}
        )`;
      values.push(formattedAmenities);
      values.push(formattedAmenities.length);
      counter += 2;
    }

    // **🔹 Grouping & Ordering**
    query += `
      GROUP BY l.lease_id, l.title, l.price, l.bedrooms, l.bathrooms,
               a.street, a.city, a.state, a.zip_code, lease_duration
      ORDER BY l.price ASC;
    `;

    if (user_id) {
      values.push(user_id); // Add user_id for the is_favorite check
    } else {
      query = query.replace(/user_id = \$\d+ AND /, ''); // Remove user_id condition if not logged in
    }

    const result = await pool.query(query, values);
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching leases:", error);
    res.status(500).json({ error: "Server error fetching leases" });
  }
});

// Update /all-leases to return if a lease is favorited
app.get("/all-leases", verifySession, async (req, res) => {
  try {
    let query = `
      SELECT l.lease_id, l.title, l.price, l.bedrooms, l.bathrooms,
             a.street, a.city, a.state, a.zip_code,
             TO_CHAR(l.start_date, 'Month<ctrl3348>') || ' to ' || TO_CHAR(l.end_date, 'Month<ctrl3348>') AS lease_duration,
             ARRAY_AGG(DISTINCT li.image_url) FILTER (WHERE li.image_url IS NOT NULL) AS images,
             ARRAY_AGG(DISTINCT am.amenity) FILTER (WHERE am.amenity IS NOT NULL) AS amenities,
             CASE WHEN EXISTS (SELECT 1 FROM favorites WHERE user_id = $1 AND lease_id = l.lease_id) THEN true ELSE false END AS is_favorite
      FROM leases l
      JOIN addresses a ON l.lease_id = a.lease_id
      LEFT JOIN lease_images li ON l.lease_id = li.lease_id
      LEFT JOIN amenities am ON l.lease_id = am.lease_id
      GROUP BY l.lease_id, l.title, l.price, l.bedrooms, l.bathrooms,
               a.street, a.city, a.state, a.zip_code, lease_duration
      ORDER BY l.price ASC;
    `;

    const user_id = req.user ? req.user.user_id : null;
    const values = user_id ? [user_id] : [];

    const result = await pool.query(query, values);
    res.json(result.rows);
  } catch (error) {
    console.error("Error fetching leases:", error);
    res.status(500).json({ error: "Server error fetching leases" });
  }
});

app.get("/login", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "login.html"));
});

app.get('/navbar.js', (req, res) => {
  res.sendFile(path.join(__dirname, 'navbar.js'));
});

app.get('/post.js', (req, res) => {
  res.sendFile(path.join(__dirname, 'post.js'));
});

app.get('/search.js', (req, res) => {
  res.sendFile(path.join(__dirname, 'search.js'));
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.get('/api/map-key', (req, res) => {
  res.json({ apiKey: process.env.MAP_API_KEY });
});

app.get("/suggest-addresses", async (req, res) => {
  try {
    const input = req.query.q?.toLowerCase().trim();
    if (!input || input.length < 2) {
      return res.status(400).json({ error: "Query too short" });
    }

    // Normalize city+state suggestions
    const cityStateResults = await pool.query(`
      SELECT DISTINCT ON (
        LOWER(REPLACE(CONCAT(city, ',', state), ' ', ''))
      ) CONCAT(city, ', ', state) AS suggestion
      FROM addresses
      WHERE LOWER(city) LIKE $1 OR LOWER(state) LIKE $1
      LIMIT 5
    `, [`%${input}%`]);

    // Normalize full address suggestions
    const fullAddressResults = await pool.query(`
      SELECT DISTINCT ON (
        LOWER(REPLACE(CONCAT(street, city, state, zip_code), ' ', ''))
      ) CONCAT(street, ', ', city, ', ', state, ' ', zip_code) AS suggestion
      FROM addresses
      WHERE LOWER(street) LIKE $1 OR LOWER(city) LIKE $1
      LIMIT 5
    `, [`%${input}%`]);

    // Add zip code suggestions
    const zipResults = await pool.query(`
      SELECT DISTINCT zip_code AS suggestion
      FROM addresses
      WHERE zip_code LIKE $1
      LIMIT 5
    `, [`%${input}%`]);

    // Merge all unique suggestions into a Set
    const suggestions = new Set([
      ...cityStateResults.rows.map(r => r.suggestion),
      ...fullAddressResults.rows.map(r => r.suggestion),
      ...zipResults.rows.map(r => r.suggestion)
    ]);

    res.json([...suggestions]);
  } catch (err) {
    console.error("Error suggesting addresses:", err);
    res.status(500).json({ error: "Suggestion fetch failed" });
  }
});

app.get('/my-listings.js', (req, res) => {
  res.sendFile(path.join(__dirname, 'my-listings.js'));
});

app.get('/my-listings', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'my-listings.html'));
});

// Endpoint to get the logged-in user's listings
app.get("/api/my-listings", verifySession, async (req, res) => {
    const user_id = req.user.user_id;

    try {
        const result = await pool.query(`
            SELECT l.lease_id, l.title, l.price,
                   TO_CHAR(l.start_date, 'Month YYYY') AS start_date,
                   TO_CHAR(l.end_date, 'Month YYYY') AS end_date,
                   l.status, a.street, a.city, a.state, a.zip_code
            FROM leases l
            JOIN addresses a ON l.lease_id = a.lease_id
            WHERE l.user_id = $1
            ORDER BY l.start_date DESC;
        `, [user_id]);
        res.json(result.rows);
    } catch (error) {
        console.error("Error fetching user's listings:", error);
        res.status(500).json({ error: "Failed to fetch your listings." });
    }
  
});

// API endpoint to remove a user's listing
app.delete("/api/my-listings/:lease_id/remove", verifySession, async (req, res) => {
  const { lease_id } = req.params;
  const user_id = req.user.user_id;

  try {
      // Verify that the listing belongs to the logged-in user
      const checkOwnership = await pool.query(
          "SELECT lease_id FROM leases WHERE lease_id = $1 AND user_id = $2",
          [lease_id, user_id]
      );

      if (checkOwnership.rows.length === 0) {
          return res.status(403).json({ error: "You do not have permission to remove this listing." });
      }

      const result = await pool.query(
          "UPDATE leases SET status = 'removed' WHERE lease_id = $1",
          [lease_id]
      );

      if (result.rowCount > 0) {
          res.json({ message: "Listing removed successfully." });
      } else {
          res.status(404).json({ message: "Listing not found." });
      }
  } catch (error) {
      console.error("Error removing listing:", error);
      res.status(500).json({ error: "Failed to remove the listing." });
  }
});


app.get('/favorites.js', (req, res) => {
  res.sendFile(path.join(__dirname, 'favorites.js'));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
