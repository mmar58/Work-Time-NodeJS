-- Database Export: job_report
-- Generated on: 2025-12-25T06:17:06.591Z
-- MySQL Handler Export

CREATE DATABASE IF NOT EXISTS `job_report`;
USE `job_report`;

-- Table structure for `dailywork`
DROP TABLE IF EXISTS `dailywork`;
CREATE TABLE `dailywork` (
  `date` date NOT NULL,
  `hours` tinyint NOT NULL DEFAULT '0',
  `minutes` tinyint NOT NULL DEFAULT '0',
  `seconds` tinyint NOT NULL DEFAULT '0',
  `detailedWork` text CHARACTER SET utf8mb4 COLLATE utf8mb4_general_ci NOT NULL DEFAULT (_utf8mb4''),
  `extraminutes` int NOT NULL DEFAULT '0'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


-- Table structure for `hourrate`
DROP TABLE IF EXISTS `hourrate`;
CREATE TABLE `hourrate` (
  `date` date NOT NULL,
  `price` float NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_general_ci;


