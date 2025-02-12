DROP DATABASE IF EXISTS leaseit;
CREATE DATABASE leaseit;
\c leaseit;

-- Create Customers table
CREATE TABLE Customers (
    id SERIAL PRIMARY KEY,
    username VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    session_id TEXT,
    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create SubletListings table
CREATE TABLE SubletListings (
    ListingID SERIAL PRIMARY KEY,
    UserID INT NOT NULL REFERENCES Customers(id) ON DELETE CASCADE,
    Title VARCHAR(255) NOT NULL,
    Description TEXT,
    LeaseStartDate DATE NOT NULL,
    LeaseEndDate DATE NOT NULL,
    RentCost DECIMAL(10,2) NOT NULL,
    City VARCHAR(100) NOT NULL,
    State VARCHAR(50) NOT NULL,
    Zip INT NOT NULL CHECK (Zip > 0),
    Country VARCHAR(100) NOT NULL,
    AddressLine1 VARCHAR(255) NOT NULL,
    AddressLine2 VARCHAR(255),
    UtilitiesIncluded BOOLEAN NOT NULL,
    NumberOfBedrooms INT NOT NULL CHECK (NumberOfBedrooms >= 0),
    NumberOfBathrooms INT NOT NULL CHECK (NumberOfBathrooms >= 0),
    PhotoURL VARCHAR(255),
    Status BOOLEAN NOT NULL DEFAULT TRUE,
    Latitude DECIMAL(9,6) CHECK (Latitude BETWEEN -90 AND 90),
    Longitude DECIMAL(9,6) CHECK (Longitude BETWEEN -180 AND 180)
);

-- Create Reviews table
CREATE TABLE Reviews (
    ReviewID SERIAL PRIMARY KEY,
    ReviewerID INT NOT NULL REFERENCES Customers(id) ON DELETE CASCADE,
    RevieweeID INT REFERENCES Customers(id) ON DELETE SET NULL,
    ListingID INT REFERENCES SubletListings(ListingID) ON DELETE CASCADE,
    Rating INT NOT NULL CHECK (Rating BETWEEN 1 AND 5)
);

-- Create LeaseTransfer table
CREATE TABLE LeaseTransfer (
    LeaseTransferID SERIAL PRIMARY KEY,
    ListingID INT NOT NULL REFERENCES SubletListings(ListingID) ON DELETE CASCADE,
    SubletterID INT NOT NULL REFERENCES Customers(id) ON DELETE CASCADE,
    SublesseeID INT NOT NULL REFERENCES Customers(id) ON DELETE CASCADE,
    TransferDate DATE NOT NULL
);

-- Create Amenities table
CREATE TABLE Amenities (
    AmenityID SERIAL PRIMARY KEY,
    ListingID INT NOT NULL REFERENCES SubletListings(ListingID) ON DELETE CASCADE,
    AmenityName VARCHAR(100) NOT NULL,
    IsAvailable BOOLEAN NOT NULL DEFAULT TRUE
);
