-- ====================================================
-- Database Additions for Art Gallery Upgrade
-- Feature: Sheet Size Auto-Suggestion Calculator
-- ====================================================

-- 1. Create the art_sheet_sizes table
CREATE TABLE IF NOT EXISTS `art_sheet_sizes` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `length` DECIMAL(10,2) NOT NULL,
  `width` DECIMAL(10,2) NOT NULL,
  `unit` VARCHAR(10) DEFAULT 'inches',
  `price` DECIMAL(10,2) DEFAULT 0.00,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 2. Populate it with standard framing glass sheet sizes (in inches)
INSERT INTO `art_sheet_sizes` (`name`, `length`, `width`, `unit`, `price`) VALUES
('Glass Sheet (24" x 18")', 24.00, 18.00, 'inches', 150.00),
('Glass Sheet (30" x 24")', 30.00, 24.00, 'inches', 250.00),
('Glass Sheet (36" x 24")', 36.00, 24.00, 'inches', 300.00),
('Glass Sheet (43" x 31")', 43.00, 31.00, 'inches', 460.00),
('Glass Sheet (48" x 36")', 48.00, 36.00, 'inches', 600.00),
('Glass Sheet (60" x 48")', 60.00, 48.00, 'inches', 1000.00),
('Glass Sheet (72" x 48")', 72.00, 48.00, 'inches', 1200.00),
('Glass Sheet (96" x 60")', 96.00, 60.00, 'inches', 2400.00);
