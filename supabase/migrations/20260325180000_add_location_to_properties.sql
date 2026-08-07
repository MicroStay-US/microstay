/*
  # Add Location Coordinates to Properties

  1. Updates:
  - Adds latitude and longitude columns to the properties table to support the "Motels Near You" radius search and Map view functionality.
*/

ALTER TABLE properties 
ADD COLUMN IF NOT EXISTS latitude numeric,
ADD COLUMN IF NOT EXISTS longitude numeric;
