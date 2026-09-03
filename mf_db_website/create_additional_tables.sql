-- ====================================================
-- Database Additions for Art Gallery Upgrade (CLEAN INSTALL)
-- Specs: ENGINE=InnoDB, CHARSET=utf8mb4
-- ====================================================

-- Drop tables in reverse order of dependencies to avoid FK errors
DROP TABLE IF EXISTS `art_order_items`;
DROP TABLE IF EXISTS `art_orders`;
DROP TABLE IF EXISTS `art_wall_styles`;

-- 1. Create the art_wall_styles table
CREATE TABLE `art_wall_styles` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `name` VARCHAR(100) NOT NULL,
  `image_url` VARCHAR(255) NOT NULL,
  `max_height_ft` DECIMAL(5,2) DEFAULT 10.00,
  `max_width_ft` DECIMAL(5,2) DEFAULT 12.00,
  `created_at` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Populate wall style presets
INSERT INTO `art_wall_styles` (`name`, `image_url`, `max_height_ft`, `max_width_ft`) VALUES
('Modern Living Room', 'assets/walls/living_room.jpg', 10.00, 12.00),
('Minimalist Studio', 'assets/walls/minimalist_studio.jpg', 10.00, 12.00),
('Cozy Bedroom', 'assets/walls/cozy_bedroom.jpg', 10.00, 12.00),
('Executive Office Boardroom', 'assets/walls/office_boardroom.jpg', 10.00, 12.00),
('Rustic Brick Wall', 'assets/walls/brick_wall.jpg', 10.00, 12.00),
('Dark Charcoal Accent Wall', 'assets/walls/charcoal_wall.jpg', 10.00, 12.00),
('Luxury Hallway', 'assets/walls/luxury_hallway.jpg', 10.00, 12.00),
('Classic Gallery White Wall', 'assets/walls/gallery_white.jpg', 10.00, 12.00),
('Industrial Concrete Wall', 'assets/walls/concrete_wall.jpg', 10.00, 12.00),
('Chic Dining Room', 'assets/walls/dining_room.jpg', 10.00, 12.00),
('Creative Design Studio', 'assets/walls/design_studio.jpg', 10.00, 12.00),
('Elegant Reception Lobby', 'assets/walls/reception_lobby.jpg', 10.00, 12.00);


-- 2. Create the main art_orders table
CREATE TABLE `art_orders` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `customer_name` VARCHAR(150) NOT NULL,
  `customer_email` VARCHAR(150) NOT NULL,
  `customer_phone` VARCHAR(50) DEFAULT NULL,
  `total_amount` DECIMAL(10,2) NOT NULL,
  `currency` VARCHAR(10) DEFAULT 'PKR',
  `stripe_charge_id` VARCHAR(100) NOT NULL,
  `payment_status` VARCHAR(50) DEFAULT 'paid',
  `order_date` TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;


-- 3. Create the art_order_items table
CREATE TABLE `art_order_items` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `order_id` INT NOT NULL,
  `artwork_id` CHAR(36) NOT NULL,
  `price` DECIMAL(10,2) NOT NULL,
  FOREIGN KEY (`order_id`) REFERENCES `art_orders`(`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
