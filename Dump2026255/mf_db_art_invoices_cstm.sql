-- MySQL dump 10.13  Distrib 8.0.40, for Win64 (x86_64)
--
-- Host: localhost    Database: mf_db
-- ------------------------------------------------------
-- Server version	8.0.40

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `art_invoices_cstm`
--

DROP TABLE IF EXISTS `art_invoices_cstm`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `art_invoices_cstm` (
  `id_c` varchar(100) NOT NULL DEFAULT '',
  `delivery_date_c` varchar(100) DEFAULT NULL,
  `payment_medium_c` varchar(100) DEFAULT NULL,
  `discount_c` decimal(10,2) DEFAULT NULL,
  `pending_c` decimal(10,2) DEFAULT NULL,
  `net_total_c` decimal(10,2) DEFAULT NULL,
  `paid_by_customer_c` varchar(100) DEFAULT NULL,
  `advance_c` decimal(10,2) DEFAULT NULL,
  `net_amount_to_be_paid_c` decimal(10,2) DEFAULT NULL,
  `customer_name_c` varchar(100) DEFAULT NULL,
  `customer_email_c` varchar(100) DEFAULT NULL,
  `customer_address_city_c` varchar(100) DEFAULT NULL,
  `customer_address_state_c` varchar(100) DEFAULT NULL,
  `customer_address_postalcode_c` varchar(100) DEFAULT NULL,
  `customer_address_country_c` varchar(100) DEFAULT NULL,
  `customer_address_c` varchar(100) DEFAULT NULL,
  `customer_phone_c` decimal(10,2) DEFAULT NULL,
  `art_customers_id_c` varchar(100) DEFAULT NULL,
  `new_customer_c` decimal(10,2) DEFAULT NULL,
  PRIMARY KEY (`id_c`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-05-25 23:24:45
