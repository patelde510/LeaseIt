DROP DATABASE IF EXISTS leaseit;
CREATE DATABASE leaseit;
\c leaseit;

CREATE TABLE users (
    user_id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    first_name VARCHAR(50),
    last_name VARCHAR(50),
    email VARCHAR(100),
    password_hash TEXT NOT NULL,
    phone VARCHAR(20),
    session_id text,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE leases (
    lease_id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(user_id) ON DELETE CASCADE,
    title VARCHAR(100) NOT NULL DEFAULT 'Lease Posting',
    description TEXT,
    price DECIMAL(10,2) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    property_type VARCHAR(50) CHECK (property_type IN ('apartment', 'house', 'student-housing', 'other')),
    shared_space BOOLEAN NOT NULL,
    furnished BOOLEAN NOT NULL,
    bathroom_type VARCHAR(20) CHECK (bathroom_type IN ('private', 'shared')),
    bedrooms INT NOT NULL CHECK (bedrooms >= 0),
    bathrooms INT NOT NULL CHECK (bathrooms >= 0),
    phone VARCHAR(20),
    email VARCHAR(100),
    status VARCHAR(20) DEFAULT 'available' CHECK (status IN ('available', 'taken', 'pending')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE addresses (
    address_id SERIAL PRIMARY KEY,
    lease_id INT UNIQUE REFERENCES leases(lease_id) ON DELETE CASCADE,
    street VARCHAR(255) NOT NULL,
    city VARCHAR(100) NOT NULL,
    state VARCHAR(50) NOT NULL,
    zip_code VARCHAR(10) NOT NULL,
    country VARCHAR(50) DEFAULT 'USA',
    latitude DECIMAL(9,6),
    longitude DECIMAL(9,6),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE amenities (
    amenity_id SERIAL PRIMARY KEY,
    lease_id INT REFERENCES leases(lease_id) ON DELETE CASCADE,
    amenity VARCHAR(50) CHECK (amenity IN (
        'gym', 'pool', 'washer-dryer', 'dishwasher', 'tv', 'full-kitchen', 
        'pet-friendly', 'free-parking', 'paid-parking', 'remote-lock', 'handicapped-access'
    ))
);

CREATE TABLE lease_images (
    image_id SERIAL PRIMARY KEY,
    lease_id INT REFERENCES leases(lease_id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE favorites (
    favorite_id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    user_id INTEGER NOT NULL,
    lease_id INTEGER NOT NULL,
    FOREIGN KEY (user_id) REFERENCES public.users(user_id) ON DELETE CASCADE,
    FOREIGN KEY (lease_id) REFERENCES public.leases(lease_id) ON DELETE CASCADE,
    UNIQUE (user_id, lease_id)
);