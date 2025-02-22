const express = require("express");
const mysql = require("mysql2");
const { scrapWorkTime, convertSecondsIntoTime } = require("./scripts/workTimeScraper");

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
    password: "",
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
    if (err.code === "PROTOCOL_CONNECTION_LOST") {
      console.log("🔄 Reconnecting to database...");
      handleDisconnect();
    } else {
      throw err;
    }
  });
}



// Update Database Function with Debugging Logs
function updateInDatabase(date, hours, minutes, note, callback) {
  if(db==null){
    handleDisconnect();
  }
  console.log(`🔍 Checking database for existing record on date: ${date}`);
  let dateData = date.split("-");
  if (dateData[0].length < 3) {
    date = dateData[2] + "-" + dateData[1] + "-" + dateData[0];
  }
  console.log("📅 Date:", date);
  db.query("SELECT * FROM dailywork WHERE date = ?", [date], (err, result) => {
    if (err) {
      console.error("❌ Error fetching data from database:", err);
      return callback(err);
    }

    console.log("🔎 Query result:", result);

    if (result.length === 0) {
      console.log(`🆕 No record found for ${date}, inserting new record...`);
      const sqlInsert =
        "INSERT INTO dailywork (date, hour, minutes, detailedWork) VALUES (?, ?, ?, ?)";
      console.log("📌 SQL Insert:", sqlInsert, [date, hours, minutes, note]);

      db.query(sqlInsert, [date, hours, minutes, note], (insertErr) => {
        if (insertErr) {
          console.error("❌ Error inserting into database:", insertErr);
          return callback(insertErr);
        }
        console.log(`✅ Successfully inserted record for ${date}`);
        callback(null);
      });
    } else {
      console.log(`🔄 Updating existing record for ${date}...`);
      const sqlUpdate =
        "UPDATE dailywork SET hour = ?, minutes = ?, detailedWork = ? WHERE date = ?";
      console.log("📌 SQL Update:", sqlUpdate, [hours, minutes, note, date]);

      db.query(sqlUpdate, [hours, minutes, note, date], (updateErr) => {
        if (updateErr) {
          console.error("❌ Error updating database:", updateErr);
          return callback(updateErr);
        }
        console.log(`✅ Successfully updated record for ${date}`);
        callback(null);
      });
    }
  });
}
// API to get work data based on date range
app.get("/work-data", (req, res) => {
  let { startDate, endDate } = req.query;
  
  if (!startDate) {
    return res.status(400).json({ error: "Start date is required" });
  }
  
  let query = "SELECT * FROM dailywork WHERE date = ?";
  let params = [startDate];
  
  if (endDate) {
    query = "SELECT * FROM dailywork WHERE date BETWEEN ? AND ?";
    params = [startDate, endDate];
  }
  
  db.query(query, params, (err, results) => {
    if (err) {
      console.error("❌ Database query failed:", err);
      return res.status(500).json({ error: "Database query failed" });
    }
    res.json(results);
  });
});
// API Endpoint
app.get("/work-time", (req, res) => {
  let dates = req.query.dates ? req.query.dates.split(",") : [new Date().toISOString().split("T")[0]];
  let results = [];
  console.log(dates);
  dates.forEach((date) => {
    let dateData = date.split("-");
    if (dateData[0].length > 2) {
      date = dateData[2] + "-" + dateData[1] + "-" + dateData[0];
    }
    console.log(`📅 Processing work time for date: ${date}`);

    let { totalWorkedTime, totalWorkedTimeNote } = scrapWorkTime(date);
    let { hours, minutes, seconds } = convertSecondsIntoTime(totalWorkedTime);

    console.log(`🕒 Computed work time - Hours: ${hours}, Minutes: ${minutes}, Seconds: ${seconds}, Note: ${totalWorkedTimeNote}`);

    updateInDatabase(date, hours, minutes, JSON.stringify(totalWorkedTimeNote), (err) => {
      if (err) {
        console.error(`❌ Database update failed for ${date}`, err);
        return res.status(500).json({ error: `Database update failed for ${date}` });
      }
    });

    results.push({ date, hours, minutes, seconds, note: totalWorkedTimeNote });
  });

  res.json(results);
});

// Start Server
app.listen(port, () => {
  console.log("🚀 Server running on http://localhost:" + port);
});
