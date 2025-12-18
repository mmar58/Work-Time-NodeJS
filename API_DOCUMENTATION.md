# Work-Time-NodeJS API Documentation

**Base URL:** `http://localhost:88`

## Overview

This API scrapes work time data from **StaffCounter** HTML logs (locally stored), processes it, and stores/retrieves it from a MySQL database. It also manages target work hours and hourly rate settings.

> **Note:** The scraper relies on log files located at `C:/Program Files (x86)/StaffCounter/logs/USER/`. Ensure this path exists and is accessible.

---

## Endpoints

### 1. `GET /`
- **Description:** Health check endpoint.
- **Response:** `"Hello, World!"`

---

### 2. `GET /work-data`
- **Description:** Retrieve work data for a specific date or date range.
- **Query Parameters:**
  - `startDate` (required): `YYYY-MM-DD`
  - `endDate` (optional): `YYYY-MM-DD`
- **Response:** Array of work records:
  ```json
  [
    {
      "date": "YYYY-MM-DD",
      "hours": Number,
      "minutes": Number,
      "seconds": Number,
      "detailedWork": "[{\"startTime\":\"...\",\"endTime\":\"...\",\"duration\":\"...\"}, ...]", // JSON String
      "extraminutes": Number
    }
  ]
  > **Note:** `detailedWork` is a JSON stringified array of objects containing work sessions.
  ```
- **Errors:**  
  - `400`: Start date is required  
  - `500`: Database query failed

---

### 3. `GET /worktime`
- **Description:** Scrape and process work time for one or more dates, update the database, and return results.
- **Query Parameters:**
  - `dates` (optional): Comma-separated list of dates (`YYYY-MM-DD`). Defaults to today if not provided.
- **Response:** Array of processed work time objects:
  ```json
  [
    {
      "date": "YYYY-MM-DD",
      "hours": Number,
      "minutes": Number,
      "seconds": Number,
      "detailedWork": "[{\"startTime\":\"HH:MM:SS\",\"endTime\":\"HH:MM:SS\",\"duration\":\"HH:MM:SS\"}, ...]" // JSON String
    }
  ]
  ```
- **Errors:**  
  - `500`: Database update failed

---

### 4. `GET /hourlyRate`
- **Description:** Get the latest hourly rate from the database.
- **Response:** Number (latest hourly rate)
- **Errors:**  
  - `500`: Database query failed

---

### 5. `GET /getTargetHours`
- **Description:** Get the target weekly work hours from `targetData.json`.
- **Response:** Number (target hours, default: 40)

---

### 6. `GET /setTargetHours`
- **Description:** Set the target weekly work hours in `targetData.json`.
- **Query Parameters:**
  - `hours` (required): Number
- **Response:** Number (new target hours)

---

## Internal Modules

### `scripts/workTimeScraper.js`
- **Functions:**
  - `scrapWorkTime(curDate)`: Scrapes and calculates total worked time and details from StaffCounter logs.
  - `convertSecondsIntoTime(totalSeconds)`: Converts seconds to `{ hours, minutes, seconds }`.

---

## Database Tables

- **`dailywork`**: Stores daily work records.
- **`hourrate`**: Stores hourly rate history.

---

## Dependencies

- express, mysql2, moment-timezone, cheerio, cors, fs, nodemon

---

## Example Usage

**Get today's work time:**
```
GET http://localhost:88/worktime
```

**Get work data for a range:**
```
GET http://localhost:88/work-data?startDate=2025-11-01&endDate=2025-11-30
```

**Set target hours:**
```
GET http://localhost:88/setTargetHours?hours=45
```

---

Let me know if you need this in OpenAPI/Swagger format or want to add more details!
