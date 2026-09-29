-- ============================================================
-- SQL Full Reset Script: resetdb.sql
-- Project: Contacts App
-- Description:
--   Recreates the ContactsAppDB Users and Contacts tables and
--   seeds the required default administrator account.
--
-- WARNING:
--   Running this script deletes all existing Users and Contacts data.
-- ============================================================

CREATE DATABASE IF NOT EXISTS `ContactsAppDB`
    DEFAULT CHARACTER SET utf8mb4
    DEFAULT COLLATE utf8mb4_0900_ai_ci;

USE `ContactsAppDB`;

DROP TABLE IF EXISTS `Contacts`;
DROP TABLE IF EXISTS `Users`;

CREATE TABLE `Users` (
    `ID` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `FirstName` VARCHAR(100) NOT NULL,
    `LastName` VARCHAR(100) NOT NULL,
    `Username` VARCHAR(100) NOT NULL,
    `Password` VARCHAR(255) NOT NULL,
    `Role` ENUM('Admin', 'User') NOT NULL DEFAULT 'User',
    `IsDisabled` TINYINT(1) NOT NULL DEFAULT 0,
    `DateCreated` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    `DateUpdated` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`ID`),
    UNIQUE KEY `UQ_Users_Username` (`Username`)
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE `Contacts` (
    `ID` INT UNSIGNED NOT NULL AUTO_INCREMENT,
    `Name` VARCHAR(200) NOT NULL,
    `EmailAddress` VARCHAR(255) DEFAULT NULL,
    `PhoneNumber` VARCHAR(30) DEFAULT NULL,
    `Category` ENUM(
        'Family',
        'Friends',
        'Work',
        'School',
        'Services',
        'Emergency',
        'Other'
    ) NOT NULL DEFAULT 'Other',
    `DateCreated` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
    `DateUpdated` TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP
        ON UPDATE CURRENT_TIMESTAMP,
    `UserID` INT UNSIGNED NOT NULL,
    PRIMARY KEY (`ID`),
    KEY `FK_Contacts_Users` (`UserID`),
    CONSTRAINT `FK_Contacts_Users`
        FOREIGN KEY (`UserID`)
        REFERENCES `Users` (`ID`)
        ON DELETE CASCADE
) ENGINE=InnoDB
  DEFAULT CHARSET=utf8mb4
  COLLATE=utf8mb4_0900_ai_ci;

INSERT INTO `Users`
    (`FirstName`, `LastName`, `Username`, `Password`, `Role`, `IsDisabled`)
VALUES
    (
        'Application',
        'Administrator',
        'root',
        '$2y$12$eSu5KPC2cmH6cSu5.9PazuYnvncLIBsqIIqlAlxip3QbUkTpePGUC',
        'Admin',
        0
    );
