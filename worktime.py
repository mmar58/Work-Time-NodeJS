#!E:/Program Files/Python313/python.exe
from bs4 import BeautifulSoup
import sys,cgi,json
from datetime import date
sys.path.append("H:/MMARPythonLibrary")
from stringLib import stringFormatter
import mysql.connector as connector
# Creating the database connection
mydb=connector.connect(
    host="localhost",
    username="root",
    password="123456",
    database="job_report"
)
cursor=mydb.cursor()

hoursList=[]
class HoursData:
    def __init__(self,date,hours=0,minutes=0,seconds=0,note=""):
        self.date=date
        self.hours=hours
        self.minutes=minutes
        self.seconds=seconds
        self.note=note
    def to_dict(self):
        global extraMinutes
        return {"date": self.date,"hours":self.hours, "minutes": self.minutes,"seconds":self.seconds,"mote":self.note,"extraMinutes":extraMinutes}
print("Content-Type: text/html\n\n")
def convertToTime(timeText):
    data=timeText.split(":")
    totalTimeInSec=(int(data[0])*60+int(data[1]))*60+int(data[2])
    return totalTimeInSec
# Time maintaining options
startingTimeSet = False
startingTimeText = ""
startTime = 0
lastTimeAccessed = 0
lastTimeAccessedText=""
lastEndTime=0
# Result variables
totalWorkedTime = 0
totalWorkedTimeNote = ""
dateText=[]
extraMinutes=0
def setStartingTime(theTime):
    global startTime,lastTimeAccessed,startingTimeSet
    startTime = theTime
    lastTimeAccessed=theTime
    startingTimeSet=True

def addstartingTimeText(startText,endText,timeDifference):
    global totalWorkedTimeNote
    if totalWorkedTimeNote == "":
        totalWorkedTimeNote+=startText+"-"+endText+" "+convertSecondsIntoTimeText(timeDifference)
    else:
        totalWorkedTimeNote += "\n"+startText + "-" + endText + " " + convertSecondsIntoTimeText(timeDifference)

def scrapWorkTime(curTime):
    global startTime,startingTimeText,startingTimeSet,lastTimeAccessed,lastTimeAccessedText,totalWorkedTime,\
        totalWorkedTimeNote,dateText,lastEndTime
    totalWorkedTime=0
    totalWorkedTimeNote=""
    dateText=curTime.split("-")
    soup = BeautifulSoup(
        open("C:/Program Files (x86)/StaffCounter/logs/USER/"+curTime+".htm", "r", encoding="utf-8").read(),"html.parser")
    all_p = soup.findAll("p")
    for i in range(len(all_p)):
        # print("Counting "+str(i))
        if (i == 0):
            "j"
        elif (i == 1):
            if (all_p[i].text == "Monitoring resumed by the user"):
                timeDistance = convertToTime(all_p[i]["time"])
                timeData = all_p[i]["time"].split(":")
                if timeData[0] == "23":
                    setStartingTime(0)
                    startingTimeText = "00:00:00"
                else:
                    setStartingTime(convertToTime(all_p[i]["time"]))
                    startingTimeText = all_p[i]["time"]
            else:
                timeDistance = convertToTime(all_p[i]["time"])
                timeData = all_p[i]["time"].split(":")

                if timeDistance < 20 * 60 or timeData[0] == "23":
                    setStartingTime(0)
                    startingTimeText = "00:00:00"
                else:
                    setStartingTime(timeDistance)
                    startingTimeText = all_p[i]["time"]
        else:
            temptime = convertToTime(all_p[i]["time"])
            if startingTimeSet:
                if all_p[i].text == "Monitoring stopped by the user":
                    startingTimeSet = False
                    timedifference = temptime - startTime
                    totalWorkedTime += timedifference
                    lastTimeAccessed = temptime
                    addstartingTimeText(startingTimeText, all_p[i]["time"], timedifference)
                    lastEndTime=temptime
                else:
                    if i == len(all_p) - 1:
                        if 24 * 60 * 60 - temptime < 16 * 60:
                            startingTimeSet = False
                            lastEndTime = 24 * 60 * 60
                            timedifference = lastEndTime - startTime
                            totalWorkedTime += timedifference

                            addstartingTimeText(startingTimeText, "24:00:00", timedifference)
                        else:
                            if lastTimeAccessed>temptime:
                                temptime=lastTimeAccessed
                            startingTimeSet = False
                            timedifference = temptime - startTime
                            totalWorkedTime += timedifference
                            addstartingTimeText(startingTimeText, all_p[i]["time"], timedifference)
                            lastEndTime = temptime
                    elif temptime < startTime:
                        startTime = temptime
                        lastTimeAccessed = temptime
                    # If the time distance is greater than 30 min
                    elif temptime-lastTimeAccessed>30*60:
                        # print("this is accessed "+startingTimeText+" "+all_p[i]["time"])
                        timedifference = lastTimeAccessed - startTime
                        startTime=temptime
                        totalWorkedTime += timedifference
                        addstartingTimeText(startingTimeText, lastTimeAccessedText, timedifference)
                        startingTimeText = all_p[i]["time"]
                        lastEndTime = lastTimeAccessed
            else:
                if all_p[i].text == "Monitoring resumed by the user" or temptime > lastEndTime:
                    setStartingTime(temptime)
                    startingTimeText = all_p[i]["time"]
            lastTimeAccessed = temptime
            lastTimeAccessedText=all_p[i]["time"]
def convertSecondsIntoTime(tempseconds):
    tempMinute = int(tempseconds / 60)
    seconds = tempseconds - tempMinute * 60
    tempHours = int(tempMinute / 60)
    minutes = tempMinute - tempHours * 60
    hours = tempHours
    return [hours,minutes,seconds]
def convertSecondsIntoTimeText(tempseconds):
    tempMinute = int(tempseconds / 60)
    seconds = stringFormatter.getIntInDoubleText(tempseconds - tempMinute * 60)
    tempHours = int(tempMinute / 60)
    minutes = stringFormatter.getIntInDoubleText(tempMinute - tempHours * 60)
    hours = stringFormatter.getIntInDoubleText(tempHours)
    return hours + ":" + minutes + ":" + seconds
def updateInDatabase(date,hour,minute,note):
    global extraMinutes

    dateText=date.split("-")
    date=dateText[2]+"-"+dateText[1]+"-"+dateText[0]
    # Processing details
    cursor.execute("select * from dailywork	where date = '" + date+ "'")
    result = cursor.fetchall()
    
    if result==[]:
        extraMinutes=0
        #print("insert into dailywork (date,hour,minutes) values (%s,%s,%s)", (thisDate, hour, minute))
        cursor.execute("insert into dailywork (date,hours,minutes,detailedWork) values (%s,%s,%s,%s)",(date,str(hour),str(minute),note))
        mydb.commit()
    else:
        extraMinutes=result[0][len(result[0])-1]
        #print(
         #   "update dailywork set hour='" + hour + "', minutes = '" + minute + "' where date='" + thisDate + "'")
        cursor.execute("update dailywork set hours='"+str(hour)+"', minutes = '"+str(minute)+"', detailedWork='"+note+"' where date='"+date+"'")
        mydb.commit()
form = cgi.FieldStorage()
days=form.getvalue("dates")
# days="27-04-2024,28-04-2024"
if(days==None):
    today=date.today().strftime("%d-%m-%Y")
    # today="04-02-2025"
    scrapWorkTime(today)
    hoursData=convertSecondsIntoTime(totalWorkedTime)
    hoursData.append(totalWorkedTimeNote)
    updateInDatabase(today,hoursData[0],hoursData[1],hoursData[3])
    hoursList.append(HoursData(today,hoursData[0],hoursData[1],hoursData[2],hoursData[3]))
    
    print(json.dumps([hour.to_dict() for hour in hoursList]))
else:
    daysdata=days.split(",")
    for day in daysdata:
        try:
            scrapWorkTime(day)
            hoursData=convertSecondsIntoTime(totalWorkedTime)
            hoursData.append(totalWorkedTimeNote)
            updateInDatabase(day,hoursData[0],hoursData[1],hoursData[3])
            hoursList.append(HoursData(day,hoursData[0],hoursData[1],hoursData[3]))
            
        except:
            ""
    print(json.dumps([hour.to_dict() for hour in hoursList]))