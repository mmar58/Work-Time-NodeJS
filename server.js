const express = require("express");
const mysql = require("mysql2");
const moment = require("moment-timezone");  // Add this at the top of your file
const userTimeZone = "Asia/Dhaka";  // Change this to your correct timezone, e.g., "Asia/Dhaka"
const { scrapWorkTime, convertSecondsIntoTime } = require("./scripts/workTimeScraper");
const fs = require("fs")
const app = express();
app.use(express.json());
const port = 88;
const cors = require("cors");
app.use(cors()); // Allow all origins
let db;

function handleDisconnect() {
  db = mysql.createConnection({
    host: "localhost",
    user: "root",
    password: "123456",
    database: "job_report",
  });

  db.connect((err) => {
    if (err) {
      console.error("❌ Database connection failed:", err);
      setTimeout(handleDisconnect, 2000); // Attempt to reconnect after 2 seconds
    } else {
      console.log("✅ Connected to database");
    }
  });

  db.on("error", (err) => {
    console.error("⚠️ Database error:", err);
    if (err.code === "PROTOCOL_CONNECTION_LOST" ||
      err.code === "PROTOCOL_ENQUEUE_AFTER_FATAL_ERROR" ||
      err.code === "PROTOCOL_ENQUEUE_AFTER_QUIT" ||
      err.code === "ETIMEDOUT" ||
      err.code === "ECONNRESET") {
      console.log("🔄 Reconnecting to database...");
      handleDisconnect();
    } else {
      console.log("Error in database connection", err)
      handleDisconnect()
    }
  });
}



// Update Database Function with Debugging Logs
function updateInDatabase(date, hours, minutes, seconds, note, callback) {
  if (db == null) {
    handleDisconnect();
  }
  // console.log(`🔍 Checking database for existing record on date: ${date}`);
  let dateData = date.split("-");
  if (dateData[0].length < 3) {
    date = dateData[2] + "-" + dateData[1] + "-" + dateData[0];
  }
  // console.log("📅 Date:", date);
  db.query("SELECT * FROM dailywork WHERE date = ?", [date], (err, result) => {
    if (err) {
      console.error("❌ Error fetching data from database:", err);
      return callback(err);
    }

    // console.log("🔎 Query result:", result);

    if (result.length === 0) {
      // console.log(`🆕 No record found for ${date}, inserting new record...`);
      const sqlInsert =
        "INSERT INTO dailywork (date, hours, minutes,seconds, detailedWork) VALUES (?, ?, ?, ?,?)";
      // console.log("📌 SQL Insert:", sqlInsert, [date, hours, minutes,seconds, note]);

      db.query(sqlInsert, [date, hours, minutes, seconds, note], (insertErr) => {
        if (insertErr) {
          console.error("❌ Error inserting into database:", insertErr);
          return callback(insertErr);
        }
        // console.log(`✅ Successfully inserted record for ${date}`);
        callback(null);
      });
    } else {
      // console.log(`🔄 Updating existing record for ${date}...`);
      const sqlUpdate =
        "UPDATE dailywork SET hours = ?, minutes = ?, seconds = ?, detailedWork = ? WHERE date = ?";
      // console.log("📌 SQL Update:", sqlUpdate, [hours, minutes, note, date]);

      db.query(sqlUpdate, [hours, minutes, seconds, note, date], (updateErr) => {
        if (updateErr) {
          console.error("❌ Error updating database:", updateErr);
          return callback(updateErr);
        }
        // console.log(`✅ Successfully updated record for ${date}`);
        callback(null);
      });
    }
  });
}
app.get("/", (req, res) => {
  res.send("Hello, World!");
});
// API to get work data based on date range
app.get("/work-data", (req, res) => {
  if (db == null) {
    handleDisconnect();
  }
  let { startDate, endDate } = req.query;

  if (!startDate) {
    return res.status(400).json({ error: "Start date is required" });
  }

  let query = "SELECT * FROM dailywork WHERE date = ?";
  let params = [startDate];

  if (endDate) {
    query = "SELECT DATE_FORMAT(date, '%Y-%m-%d') AS date, hours, minutes, seconds, detailedWork, extraminutes FROM dailywork WHERE date BETWEEN ? AND ?";
    params = [startDate, endDate];
  }
  // console.log("📌 Query:", params)
  db.query(query, params, (err, results) => {
    if (err) {
      console.error("❌ Database query failed:", err);
      return res.status(500).json({ error: "Database query failed" });
    }
    // console.log(results)
    res.json(results);
  });
});
// API Endpoint
app.get("/worktime", (req, res) => {
  let dates = req.query.dates
    ? req.query.dates.split(",")
    : [moment().tz(userTimeZone).format("YYYY-MM-DD")];
  let results = [];
  // console.log(dates);
  dates.forEach((date) => {
    let dateData = date.split("-");
    if (dateData[0].length > 2) {
      date = dateData[2] + "-" + dateData[1] + "-" + dateData[0];
    }
    // console.log(`📅 Processing work time for date: ${date}`);

    let { totalWorkedTime, totalWorkedTimeNote } = scrapWorkTime(date);
    let { hours, minutes, seconds } = convertSecondsIntoTime(totalWorkedTime);

    // console.log(`🕒 Computed work time - Hours: ${hours}, Minutes: ${minutes}, Seconds: ${seconds}, detailedWork: ${totalWorkedTimeNote}`);

    updateInDatabase(date, hours, minutes, seconds, JSON.stringify(totalWorkedTimeNote), (err) => {
      if (err) {
        console.error(`❌ Database update failed for ${date}`, err);
        return res.status(500).json({ error: `Database update failed for ${date}` });
      }
    });

    results.push({ date, hours, minutes, seconds, detailedWork: JSON.stringify(totalWorkedTimeNote) });
  });

  res.json(results);
});
app.get("/hourlyRate", (req, res) => {
  if (db == null) {
    handleDisconnect();
  }
  // console.log("Searching for hourly rate")
  let query = 'SELECT price FROM hourrate ORDER BY date DESC LIMIT 1'
  db.query(query, (err, results) => {
    if (err) {
      console.error("❌ Database query failed:", err);
      return res.status(500).json({ error: "Database query failed" });
    }
    res.json(results[0].price)
  })
})
let targetDatakey = "targetData.json"
app.get("/getTargetHours", (req, res) => {

  if (fs.existsSync(targetDatakey)) {
    let exitingData = fs.readFileSync(targetDatakey)
    exitingData = JSON.parse(exitingData)
    res.json(exitingData.targetHours)
  }
  else {
    res.json(40)
  }
})
app.get("/setTargetHours", (req, res) => {
  let targetHours = parseInt(req.query.hours)
  if (fs.existsSync(targetDatakey)) {
    let exitingData = fs.readFileSync(targetDatakey)
    exitingData = JSON.parse(exitingData)
    exitingData.targetHours = targetHours
    fs.writeFileSync(targetDatakey, JSON.stringify(exitingData))
  }
  else {
    fs.writeFileSync(targetDatakey, JSON.stringify({ targetHours }))
  }
  res.json(targetHours)
})
// Start Server
app.listen(port, () => {
  console.log("🚀 Server running on http://localhost:" + port);
});
