var express = require('express');
var router = express.Router();
require("dotenv").config();
const { post } = require('jquery');
const { DateTime } = require("luxon");
//Necessary for google Calendar
const {google} = require('googleapis');
//Necessary for contact form
const cors = require("cors");
const nodemailer = require("nodemailer");
const multiparty = require("multiparty");
//Necessary for Tumblr
const tumblr = require('tumblr.js');

//Connnect to outlook via nodemailer
const transporter = nodemailer.createTransport({
  host: "smtp-mail.outlook.com", //replace with your email provider
  port: 587,
  auth: {
    user: process.env.EMAIL,
    pass: process.env.PASS,
  },
  tls: {
    // do not fail on invalid certs
    rejectUnauthorized: false
  },
});

//Verify connection configuration of nodemailer
transporter.verify(function (error, success) {
  if (error) {
    console.log(error);
  } else {
    console.log("Server is ready to take our messages");
  }
});

//Connect to google Calendar
// Provide the required configuration
function events(req,res,next){
const GREDENTIALS = JSON.parse(process.env.GREDENTIALS);
const calendarId = process.env.CALENDAR_ID;

// Google calendar API settings
const SCOPES = 'https://www.googleapis.com/auth/calendar';
const calendar = google.calendar({version : "v3"});

const auth = new google.auth.JWT(
    GREDENTIALS.client_email,
    null,
    GREDENTIALS.private_key,
    SCOPES
);

// Your TIMEOFFSET Offset
const TIMEOFFSET = '+05:30';

// Get date-time string for calender
const dateTimeForCalander = () => {

    let date = new Date();

    let year = date.getFullYear();
    let month = date.getMonth() + 1;
    if (month < 10) {
        month = `0${month}`;
    }
    let day = date.getDate();
    if (day < 10) {
        day = `0${day}`;
    }
    let hour = date.getHours();
    if (hour < 10) {
        hour = `0${hour}`;
    }
    let minute = date.getMinutes();
    if (minute < 10) {
        minute = `0${minute}`;
    }

    let newDateTime = `${year}-${month}-${day}T${hour}:${minute}:00.000${TIMEOFFSET}`;

    let event = new Date(Date.parse(newDateTime));

    let startDate = event;
    // Delay in end time is 1
    let endDate = new Date(new Date(startDate).setHours(startDate.getHours()+1));

    return {
        'start': startDate,
        'end': endDate
    }
};
// Get all the events between two dates
let getEvents = async (dateTimeStart, dateTimeEnd)=>{
  try {
    let response = await calendar.events.list({
        auth: auth,
        calendarId: calendarId,
        timeMin: dateTimeStart,
        timeMax: dateTimeEnd,
        timeZone: 'Asia/Kolkata'
    });
    let data = response['data'];
    let items = response['data']['items'];
    let titleOfCalendar=data.summary;
    res.locals.titleOfCalendar=titleOfCalendar;
    next();
} catch (error) {
    console.log(`Error at getEvents --> ${error}`);
    return 0;
}
};
 
  let start = '2020-10-03T00:00:00.000Z';
  let end = '2022-10-04T00:00:00.000Z';
  
  getEvents(start, end)
    .then((res) => {
        console.log(res);
    })
    .catch((err) => {
        console.log(err);
    });
  }

//Connect to tumblr.js
const tumblrClient = tumblr.createClient({
  credentials:{consumer_key: process.env.TCK,
  consumer_secret: process.env.TCS,
  token: process.env.TT,
  token_secret: process.env.TSS
}, returnPromises: true,});

//Retrieve latest articles tagged 'birdhouses' from Tumblr via tumblr.js
function birdhouses(req,res,next){
  tumblrClient.blogPosts('birdhousestudio', {type: 'text', tag: ['birdhouses']}).then(resp=>{
    res.locals.post=resp.posts;
    let dates=[];
    let titles=[];
    let headings=[];
    let links=[]
    resp.posts.forEach(parse);
    function parse(item){
      dates.push(DateTime.fromSQL(item.date).toLocaleString(DateTime.DATETIME_MED_WITH_WEEKDAY));
      titles.push(item.body);
      headings.push(item.title);
      links.push(item.post_url);
    }
    res.locals.date=dates; 
    res.locals.Imgtitles=titles
    res.locals.Imgheadings=headings
    res.locals.Imglinks=links
    next();
  }).catch(e => {
    console.log(e);
    });
}
//get news post from tumblr
function birdNews(req,res,next){
  tumblrClient.blogPosts('birdhousestudio', {type: 'text', tag: ['news']}).then(resp=>{
   //res.locals.posts=resp.posts;
    let newsTitles=[];
    let newsDates=[];
    let newsAuthors=[];
    let newsBodies=[];
    let newsTopics=[];
    let newsLinks=[];
    resp.posts.forEach(parse);
    function parse(item){
      newsTitles.push(item.title);
      newsDates.push(DateTime.fromSQL(item.date).toLocaleString(DateTime.DATETIME_MED_WITH_WEEKDAY));
      newsAuthors.push(item.post_author);
      newsBodies.push(item.body);
      newsTopics.push(item.tags);
      newsLinks.push(item.post_url);
    }
    res.locals.newsTitles=newsTitles; 
    res.locals.newsDates=newsDates;
    res.locals.newsAuthors=newsAuthors;
    res.locals.newsBodies=newsBodies;
    res.locals.newsTopics=newsTopics;
    res.locals.newsLinks=newsLinks;
    //console.log(res.locals.posts);
    next();
  }).catch(e => {
    console.log(e);
    });
}
//get events post from tumblr
function eventsPosters(req,res,next){
  tumblrClient.blogPosts('birdhousestudio', {type: 'text', tag: ['events']}).then(resp=>{
    let eventsPostersBodies=[];
    let eventsPostersLinks=[];
    resp.posts.forEach(parse);
    function parse(item){
      eventsPostersBodies.push(item.body);
      eventsPostersLinks.push(item.post_url);
    }
    res.locals.eventsPostersBodies=eventsPostersBodies;
    res.locals.eventsPostersLinks=eventsPostersLinks;
    next();
  }).catch(e => {
    console.log(e);
    });
}

  //GET home page
router.get('/',birdhouses, events, birdNews, eventsPosters,function(req, res, next) {
  res.render('index', {
    title: `Waterbury Hill`,
    description:`Birdhouse Studio`,
    sub:`Studios`,
    thisURL:`https://BirdhouseStudio.herokuapp.com/#news`});
    next()
});

//POST messages
router.post('/send', (req, res, ) => {
  let form = new multiparty.Form();
  let data = {};
  form.parse(req, function (err, fields) {
    Object.keys(fields).forEach(function (property) {
      data[property] = fields[property].toString();
    });
    console.log(data);
    const mail = {
      sender: `${data.name} <${data.address}>`,
      to: process.env.EMAIL, // receiver email,
      subject: data.subject,
      text: `From:\n${data.name} <email: ${data.address}> \n${data.message}`,
    };
    transporter.sendMail(mail, (err, data) => {
      if (err) {
        console.log(err);
        //res.status(500).send("Something went wrong.");
        res.render('yikes');
      } else {
        res.render('thanksForYourComment');
      }
    });
  });
});

module.exports = router;