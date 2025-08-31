-- Sports Players Database Schema
-- Creates a comprehensive table for MLB, NBA, and NFL players

-- Drop existing table if it exists
DROP TABLE IF EXISTS players CASCADE;

-- Create the players table
CREATE TABLE players (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    league VARCHAR(20) NOT NULL CHECK (league IN ('MLB', 'NBA', 'NFL')),
    team VARCHAR(50) NOT NULL,
    age INTEGER NOT NULL CHECK (age >= 18 AND age <= 50),
    position VARCHAR(30) NOT NULL,
    rating DECIMAL(3,1) NOT NULL CHECK (rating >= 0.0 AND rating <= 100.0),
    salary DECIMAL(12,2) NOT NULL CHECK (salary >= 0),
    experience_years INTEGER NOT NULL CHECK (experience_years >= 0),
    height VARCHAR(10),
    weight INTEGER CHECK (weight >= 100 AND weight <= 400),
    college VARCHAR(100),
    draft_year INTEGER CHECK (draft_year >= 1990 AND draft_year <= 2030),
    draft_round INTEGER CHECK (draft_round >= 0 AND draft_round <= 50),
    draft_pick INTEGER CHECK (draft_pick >= 0 AND draft_pick <= 1000),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_players_league ON players(league);
CREATE INDEX IF NOT EXISTS idx_players_team ON players(team);
CREATE INDEX IF NOT EXISTS idx_players_position ON players(position);
CREATE INDEX IF NOT EXISTS idx_players_rating ON players(rating);
CREATE INDEX IF NOT EXISTS idx_players_salary ON players(salary);
CREATE INDEX IF NOT EXISTS idx_players_age ON players(age);

-- Insert sample test data
INSERT INTO players (name, league, team, age, position, rating, salary, experience_years, height, weight, college, draft_year, draft_round, draft_pick) VALUES
    -- NBA Players - Lakers
    ('Marcus Johnson', 'NBA', 'Lakers', 28, 'PG', 87.5, 25000000.00, 6, '6-3', 190, 'Duke', 2018, 1, 15),
    ('James Wilson', 'NBA', 'Lakers', 32, 'SG', 89.8, 32000000.00, 9, '6-6', 200, 'Kentucky', 2015, 1, 2),
    ('Michael Davis', 'NBA', 'Lakers', 25, 'SF', 85.2, 20000000.00, 4, '6-8', 220, 'UCLA', 2020, 1, 10),
    ('Robert Johnson', 'NBA', 'Lakers', 29, 'PF', 83.7, 18000000.00, 7, '6-10', 240, 'Michigan State', 2017, 2, 35),
    ('Thomas Brown', 'NBA', 'Lakers', 23, 'C', 81.9, 15000000.00, 2, '7-1', 260, 'Arizona', 2022, 2, 42),
    
    -- NBA Players - Warriors
    ('Tyler Brown', 'NBA', 'Warriors', 24, 'SF', 84.7, 18000000.00, 3, '6-7', 215, 'Kentucky', 2021, 1, 12),
    ('Stephen Curry', 'NBA', 'Warriors', 35, 'PG', 94.2, 48000000.00, 14, '6-3', 185, 'Davidson', 2009, 1, 7),
    ('Klay Thompson', 'NBA', 'Warriors', 33, 'SG', 88.1, 38000000.00, 12, '6-6', 215, 'Washington State', 2011, 1, 11),
    ('Draymond Green', 'NBA', 'Warriors', 33, 'PF', 85.6, 25000000.00, 11, '6-6', 230, 'Michigan State', 2012, 2, 35),
    ('Kevon Looney', 'NBA', 'Warriors', 27, 'C', 82.3, 12000000.00, 8, '6-9', 220, 'UCLA', 2015, 1, 30),
    
    -- NBA Players - Celtics
    ('Jordan Davis', 'NBA', 'Celtics', 26, 'SG', 89.1, 22000000.00, 4, '6-5', 200, 'North Carolina', 2019, 1, 8),
    ('Jayson Tatum', 'NBA', 'Celtics', 25, 'SF', 92.8, 32000000.00, 6, '6-8', 210, 'Duke', 2017, 1, 3),
    ('Jaylen Brown', 'NBA', 'Celtics', 27, 'SG', 88.9, 30000000.00, 7, '6-6', 223, 'California', 2016, 1, 3),
    ('Marcus Smart', 'NBA', 'Celtics', 29, 'PG', 84.2, 18000000.00, 9, '6-3', 220, 'Oklahoma State', 2014, 1, 6),
    ('Robert Williams', 'NBA', 'Celtics', 25, 'C', 85.7, 20000000.00, 5, '6-9', 237, 'Texas A&M', 2018, 1, 27),
    
    -- NBA Players - Heat
    ('Anthony Wilson', 'NBA', 'Heat', 30, 'PF', 86.3, 28000000.00, 8, '6-9', 235, 'Kansas', 2016, 1, 5),
    ('Jimmy Butler', 'NBA', 'Heat', 34, 'SF', 89.5, 45000000.00, 12, '6-7', 230, 'Marquette', 2011, 1, 30),
    ('Bam Adebayo', 'NBA', 'Heat', 26, 'C', 87.2, 30000000.00, 6, '6-9', 255, 'Kentucky', 2017, 1, 14),
    ('Tyler Herro', 'NBA', 'Heat', 23, 'SG', 84.1, 25000000.00, 4, '6-5', 195, 'Kentucky', 2019, 1, 13),
    ('Kyle Lowry', 'NBA', 'Heat', 37, 'PG', 82.8, 28000000.00, 17, '6-0', 196, 'Villanova', 2006, 1, 24),
    
    -- NBA Players - Nets
    ('Chris Martinez', 'NBA', 'Nets', 22, 'C', 82.4, 15000000.00, 2, '7-0', 250, 'Gonzaga', 2022, 1, 20),
    ('Kevin Durant', 'NBA', 'Nets', 35, 'SF', 93.1, 42000000.00, 16, '6-10', 240, 'Texas', 2007, 1, 2),
    ('Kyrie Irving', 'NBA', 'Nets', 31, 'PG', 88.7, 38000000.00, 12, '6-2', 195, 'Duke', 2011, 1, 1),
    ('Ben Simmons', 'NBA', 'Nets', 27, 'PG', 85.3, 35000000.00, 6, '6-10', 240, 'LSU', 2016, 1, 1),
    ('Nic Claxton', 'NBA', 'Nets', 24, 'C', 83.9, 18000000.00, 4, '6-11', 215, 'Georgia', 2019, 2, 31),
    
    -- NFL Players - Cowboys
    ('Jake Williams', 'NFL', 'Cowboys', 25, 'QB', 89.2, 35000000.00, 4, '6-4', 225, 'Alabama', 2020, 1, 3),
    ('Dak Prescott', 'NFL', 'Cowboys', 30, 'QB', 91.5, 40000000.00, 8, '6-2', 238, 'Mississippi State', 2016, 4, 135),
    ('Ezekiel Elliott', 'NFL', 'Cowboys', 28, 'RB', 87.3, 15000000.00, 7, '6-0', 225, 'Ohio State', 2016, 1, 4),
    ('CeeDee Lamb', 'NFL', 'Cowboys', 24, 'WR', 88.1, 17000000.00, 3, '6-2', 198, 'Oklahoma', 2020, 1, 17),
    ('Micah Parsons', 'NFL', 'Cowboys', 24, 'LB', 90.8, 20000000.00, 2, '6-3', 245, 'Penn State', 2021, 1, 12),
    
    -- NFL Players - Patriots
    ('Mike Thompson', 'NFL', 'Patriots', 29, 'WR', 86.3, 22000000.00, 7, '6-1', 195, 'Ohio State', 2017, 2, 45),
    ('Mac Jones', 'NFL', 'Patriots', 25, 'QB', 84.7, 18000000.00, 2, '6-3', 217, 'Alabama', 2021, 1, 15),
    ('Rhamondre Stevenson', 'NFL', 'Patriots', 25, 'RB', 85.9, 12000000.00, 2, '6-0', 231, 'Oklahoma', 2021, 4, 120),
    ('Matthew Judon', 'NFL', 'Patriots', 31, 'LB', 87.2, 25000000.00, 9, '6-3', 261, 'Grand Valley State', 2016, 5, 146),
    ('Kyle Dugger', 'NFL', 'Patriots', 27, 'S', 84.8, 15000000.00, 3, '6-1', 220, 'Lenoir-Rhyne', 2020, 2, 37),
    
    -- NFL Players - Eagles
    ('David Johnson', 'NFL', 'Eagles', 27, 'RB', 88.7, 18000000.00, 5, '5-11', 210, 'Georgia', 2019, 1, 22),
    ('Jalen Hurts', 'NFL', 'Eagles', 25, 'QB', 90.1, 25000000.00, 3, '6-1', 223, 'Oklahoma', 2020, 2, 53),
    ('A.J. Brown', 'NFL', 'Eagles', 26, 'WR', 89.3, 25000000.00, 4, '6-1', 226, 'Ole Miss', 2019, 2, 51),
    ('DeVonta Smith', 'NFL', 'Eagles', 24, 'WR', 86.8, 18000000.00, 2, '6-0', 170, 'Alabama', 2021, 1, 10),
    ('Haason Reddick', 'NFL', 'Eagles', 29, 'LB', 87.5, 20000000.00, 6, '6-1', 240, 'Temple', 2017, 1, 13),
    
    -- NFL Players - Steelers
    ('Robert Smith', 'NFL', 'Steelers', 31, 'LB', 85.9, 16000000.00, 9, '6-2', 240, 'Michigan', 2015, 3, 78),
    ('Kenny Pickett', 'NFL', 'Steelers', 25, 'QB', 83.2, 15000000.00, 1, '6-3', 220, 'Pittsburgh', 2022, 1, 20),
    ('Najee Harris', 'NFL', 'Steelers', 25, 'RB', 86.1, 18000000.00, 2, '6-1', 232, 'Alabama', 2021, 1, 24),
    ('George Pickens', 'NFL', 'Steelers', 22, 'WR', 84.7, 12000000.00, 1, '6-3', 200, 'Georgia', 2022, 2, 52),
    ('T.J. Watt', 'NFL', 'Steelers', 29, 'LB', 91.2, 28000000.00, 6, '6-4', 252, 'Wisconsin', 2017, 1, 30),
    
    -- NFL Players - Ravens
    ('Kevin Lee', 'NFL', 'Ravens', 24, 'CB', 87.1, 20000000.00, 3, '6-0', 185, 'LSU', 2021, 1, 18),
    ('Lamar Jackson', 'NFL', 'Ravens', 26, 'QB', 92.8, 52000000.00, 5, '6-2', 212, 'Louisville', 2018, 1, 32),
    ('Mark Andrews', 'NFL', 'Ravens', 28, 'TE', 88.5, 14000000.00, 5, '6-5', 247, 'Oklahoma', 2018, 3, 86),
    ('J.K. Dobbins', 'NFL', 'Ravens', 24, 'RB', 85.3, 12000000.00, 2, '5-10', 212, 'Ohio State', 2020, 2, 55),
    ('Marlon Humphrey', 'NFL', 'Ravens', 27, 'CB', 87.9, 20000000.00, 6, '6-0', 197, 'Alabama', 2017, 1, 16),
    
    -- MLB Players - Yankees
    ('Carlos Rodriguez', 'MLB', 'Yankees', 31, 'P', 92.1, 28000000.00, 8, '6-2', 210, 'Vanderbilt', 2015, 1, 7),
    ('Aaron Judge', 'MLB', 'Yankees', 31, 'OF', 94.8, 40000000.00, 7, '6-7', 282, 'Fresno State', 2013, 1, 32),
    ('Gerrit Cole', 'MLB', 'Yankees', 33, 'P', 93.2, 36000000.00, 10, '6-4', 220, 'UCLA', 2011, 1, 1),
    ('Giancarlo Stanton', 'MLB', 'Yankees', 33, 'OF', 88.7, 32000000.00, 14, '6-6', 245, 'Notre Dame', 2007, 2, 76),
    ('DJ LeMahieu', 'MLB', 'Yankees', 35, '2B', 86.3, 15000000.00, 12, '6-4', 220, 'LSU', 2009, 2, 79),
    
    -- MLB Players - Dodgers
    ('Tommy Anderson', 'MLB', 'Dodgers', 26, 'C', 88.5, 20000000.00, 4, '6-1', 195, 'Florida State', 2020, 1, 12),
    ('Mookie Betts', 'MLB', 'Dodgers', 31, 'OF', 93.5, 30000000.00, 9, '5-9', 180, 'Overton HS', 2011, 5, 172),
    ('Freddie Freeman', 'MLB', 'Dodgers', 34, '1B', 91.2, 27000000.00, 13, '6-5', 220, 'Cal State Fullerton', 2007, 2, 78),
    ('Clayton Kershaw', 'MLB', 'Dodgers', 35, 'P', 89.8, 20000000.00, 16, '6-3', 225, 'Highland Park HS', 2006, 1, 7),
    ('Will Smith', 'MLB', 'Dodgers', 28, 'C', 87.1, 18000000.00, 4, '6-0', 200, 'Louisville', 2016, 1, 32),
    
    -- MLB Players - Astros
    ('Ryan Garcia', 'MLB', 'Astros', 28, 'SS', 90.2, 25000000.00, 6, '6-0', 185, 'Arizona State', 2018, 1, 4),
    ('Jose Altuve', 'MLB', 'Astros', 33, '2B', 89.1, 26000000.00, 13, '5-6', 168, 'Venezuela', 2007, 0, 0),
    ('Yordan Alvarez', 'MLB', 'Astros', 26, 'OF', 91.8, 22000000.00, 4, '6-5', 225, 'Cuba', 2016, 0, 0),
    ('Framber Valdez', 'MLB', 'Astros', 29, 'P', 88.9, 20000000.00, 5, '6-0', 200, 'Dominican Republic', 2015, 0, 0),
    ('Kyle Tucker', 'MLB', 'Astros', 26, 'OF', 87.3, 18000000.00, 5, '6-4', 199, 'Florida', 2015, 1, 5),
    
    -- MLB Players - Red Sox
    ('Brandon White', 'MLB', 'Red Sox', 29, '1B', 86.8, 22000000.00, 7, '6-4', 230, 'Texas A&M', 2017, 2, 35),
    ('Rafael Devers', 'MLB', 'Red Sox', 26, '3B', 90.1, 31500000.00, 6, '6-0', 237, 'Dominican Republic', 2013, 0, 0),
    ('Trevor Story', 'MLB', 'Red Sox', 30, 'SS', 87.6, 20000000.00, 8, '6-2', 213, 'Irving HS', 2011, 1, 45),
    ('Chris Sale', 'MLB', 'Red Sox', 34, 'P', 88.3, 27500000.00, 12, '6-6', 183, 'Florida Gulf Coast', 2010, 1, 13),
    ('Masataka Yoshida', 'MLB', 'Red Sox', 30, 'OF', 84.9, 18000000.00, 1, '5-8', 176, 'Japan', 2022, 0, 0),
    
    -- MLB Players - Giants
    ('Alex Chen', 'MLB', 'Giants', 25, 'OF', 84.3, 18000000.00, 3, '6-2', 200, 'Stanford', 2021, 1, 25),
    ('Logan Webb', 'MLB', 'Giants', 26, 'P', 88.7, 20000000.00, 4, '6-1', 220, 'Rocklin HS', 2014, 4, 121),
    ('Thairo Estrada', 'MLB', 'Giants', 27, '2B', 85.2, 15000000.00, 5, '6-0', 185, 'Venezuela', 2015, 0, 0),
    ('Mike Yastrzemski', 'MLB', 'Giants', 33, 'OF', 83.8, 12000000.00, 4, '5-11', 178, 'Vanderbilt', 2013, 14, 422),
    ('Camilo Doval', 'MLB', 'Giants', 25, 'P', 86.1, 16000000.00, 2, '6-2', 185, 'Dominican Republic', 2017, 0, 0);

-- Display the created data
SELECT 
    name, 
    league, 
    team, 
    position, 
    rating, 
    salary::numeric(12,0) as salary
FROM players 
ORDER BY league, team, rating DESC;

-- Create a view for high-value players
CREATE OR REPLACE VIEW high_value_players AS
SELECT 
    name,
    league,
    team,
    position,
    rating,
    salary,
    ROUND((rating / salary * 1000000), 2) as value_per_million
FROM players 
WHERE salary > 20000000
ORDER BY value_per_million DESC;

-- Display high-value players
SELECT * FROM high_value_players;
