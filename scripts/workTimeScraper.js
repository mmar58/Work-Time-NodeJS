const fs = require("fs");
const cheerio = require("cheerio");
let totalWorkedTimeNote = [];

function addTotalWorkTimeNote(startTime,endTime,duration){
  totalWorkedTimeNote.push({startTime,endTime,duration})
}
function convertToTime(timeText) {
  let data = timeText.split(":").map(Number);
  return (data[0] * 60 + data[1]) * 60 + data[2];
}
function convertSecondsToTimeText(totalSeconds) {
  let time=convertSecondsIntoTime(totalSeconds)
  return `${time.hours}:${time.minutes}:${time.seconds}`;
}
function convertSecondsIntoTime(totalSeconds) {
  let minutes = Math.floor(totalSeconds / 60);
  let seconds = totalSeconds % 60;
  let hours = Math.floor(minutes / 60);
  minutes %= 60;
  return { hours, minutes, seconds };
}

function scrapWorkTime(curDate) {
  let totalWorkedTime = 0;
  let startTime = 0;
  let startingTimeSet = false;
  let lastTimeAccessed = 0;
  let lastEndTime = 0;
  let  startTimeText=""
  let filePath = `C:/Program Files (x86)/StaffCounter/logs/USER/${curDate}.htm`;
  totalWorkedTimeNote=[]
  try {
    let fileContent = fs.readFileSync(filePath, "utf-8");
    let $ = cheerio.load(fileContent);
    let all_p = $("p");

    all_p.each((i, el) => {
      let text = $(el).text();
      let time = $(el).attr("time");
      if (!time) return;

      let temptime = convertToTime(time);
      if (i === 1) {
        if (text === "Monitoring resumed by the user") {
          startTime = temptime;
          startTimeText=time
          startingTimeSet = true;
        } else {
          if (temptime < 20 * 60) {
            startTime = 0;
            startTimeText="00:00:00"
          } else {
            startTime = temptime;
            startTimeText=time
            startingTimeSet = true;
          }
        }
      } else if (startingTimeSet) {
        if (text === "Monitoring stopped by the user") {
          startingTimeSet = false;
          totalWorkedTime += temptime - startTime;
          lastEndTime = temptime;
          addTotalWorkTimeNote(startTimeText,time,convertSecondsToTimeText(temptime - startTime))
        } else {
          if (i === all_p.length - 1) {
            if (24 * 60 * 60 - temptime < 16 * 60) {
              totalWorkedTime += 24 * 60 * 60 - startTime;
              addTotalWorkTimeNote(startTimeText,"24:00:00",convertSecondsToTimeText(temptime - startTime))
            } else {
              totalWorkedTime += temptime - startTime;
              lastEndTime = temptime;
              addTotalWorkTimeNote(startTimeText,time,convertSecondsToTimeText(temptime - startTime))
            }
          } else if (temptime < startTime) {
            startTime = temptime;
            startTimeText=time
          } else if (temptime - lastTimeAccessed > 30 * 60) {
            totalWorkedTime += lastTimeAccessed - startTime;
            addTotalWorkTimeNote(startTimeText,convertSecondsToTimeText(lastTimeAccessed),convertSecondsToTimeText(lastTimeAccessed - startTime))
            startTime = temptime;
          }
        }
      } else if (text === "Monitoring resumed by the user" || temptime > lastEndTime) {
        startTime = temptime;
        startingTimeSet = true;
        startTimeText=time
      }
      lastTimeAccessed = temptime;
    });

    return { totalWorkedTime, totalWorkedTimeNote };
  } catch (err) {
    console.error("Error reading file:", err);
    return { totalWorkedTime: 0, totalWorkedTimeNote: "" };
  }
}

module.exports = { scrapWorkTime, convertSecondsIntoTime };
