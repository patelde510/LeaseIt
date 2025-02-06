DROP DATABASE IF EXISTS leaseit;
CREATE DATABASE leaseit;
\c leaseit;

-- Create Users table
CREATE TABLE Users (
    UserID SERIAL PRIMARY KEY,
    Name VARCHAR(100) NOT NULL,
    Email VARCHAR(255) UNIQUE NOT NULL,
    Password VARCHAR(255) NOT NULL,
    AccountType VARCHAR(20) NOT NULL CHECK (AccountType IN ('Subletter', 'Sublessee')),
    SessionID UUID DEFAULT gen_random_uuid(),
    Token VARCHAR(255),
    Favorites JSONB,
    SecurityQuestion JSON
);

-- Create SubletListings table
CREATE TABLE SubletListings (
    ListingID SERIAL PRIMARY KEY,
    UserID INT NOT NULL REFERENCES Users(UserID) ON DELETE CASCADE,
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
    ReviewerID INT NOT NULL REFERENCES Users(UserID) ON DELETE CASCADE,
    RevieweeID INT REFERENCES Users(UserID) ON DELETE SET NULL,
    ListingID INT REFERENCES SubletListings(ListingID) ON DELETE CASCADE,
    Rating INT NOT NULL CHECK (Rating BETWEEN 1 AND 5)
);

-- Create LeaseTransfer table
CREATE TABLE LeaseTransfer (
    LeaseTransferID SERIAL PRIMARY KEY,
    ListingID INT NOT NULL REFERENCES SubletListings(ListingID) ON DELETE CASCADE,
    SubletterID INT NOT NULL REFERENCES Users(UserID) ON DELETE CASCADE,
    SublesseeID INT NOT NULL REFERENCES Users(UserID) ON DELETE CASCADE,
    TransferDate DATE NOT NULL
);

-- Create Amenities table
CREATE TABLE Amenities (
    AmenityID SERIAL PRIMARY KEY,
    ListingID INT NOT NULL REFERENCES SubletListings(ListingID) ON DELETE CASCADE,
    AmenityName VARCHAR(100) NOT NULL,
    IsAvailable BOOLEAN NOT NULL DEFAULT TRUE
);
