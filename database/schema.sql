-- Users
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL
);

-- User Profiles (CV / LinkedIn summary)
CREATE TABLE user_profiles (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    headline TEXT,
    profile_text TEXT
);

-- Skills
CREATE TABLE skills (
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL
);

-- User Skills (with proficiency)
CREATE TABLE user_skills (
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    skill_id INT REFERENCES skills(id) ON DELETE CASCADE,
    proficiency NUMERIC(3,2) DEFAULT 0,
    PRIMARY KEY (user_id, skill_id)
);

-- Career Paths
CREATE TABLE career_paths (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    avg_salary INT,
    lifestyle JSONB
);

-- User Career Progress
CREATE TABLE user_career_progress (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    career_id INT REFERENCES career_paths(id) ON DELETE CASCADE,
    started_at TIMESTAMP DEFAULT NOW()
);

-- Achievements
CREATE TABLE achievements (
    id SERIAL PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT,
    points INT
);

-- User Achievements
CREATE TABLE user_achievements (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    achievement_id INT REFERENCES achievements(id) ON DELETE CASCADE,
    unlocked_at TIMESTAMP DEFAULT NOW()
);
