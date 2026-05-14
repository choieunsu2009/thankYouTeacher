CREATE DATABASE IF NOT EXISTS rolling_paper;
USE rolling_paper;

CREATE TABLE IF NOT EXISTS students (
  id INT AUTO_INCREMENT PRIMARY KEY,
  code VARCHAR(6) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  student_code VARCHAR(6) NOT NULL,
  name VARCHAR(50) NOT NULL,
  message TEXT NOT NULL,
  image_url VARCHAR(255) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (student_code) REFERENCES students(code)
);

-- Pre-seed 15 students with random 4-digit codes
INSERT IGNORE INTO students (code) VALUES
('3847'), ('1923'), ('5614'), ('8271'), ('4056'),
('7392'), ('2648'), ('9135'), ('6470'), ('3189'),
('8524'), ('1763'), ('4298'), ('6051'), ('9437');
