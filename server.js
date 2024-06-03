const express = require("express");
require("dotenv").config();
const PORT = process.env.PORT || 3007;
const ejs = require("ejs");
const multer = require("multer");
const flash = require("express-flash");
const cookieParser = require("cookie-parser");
const path = require("path");
const bodyParser = require("body-parser");
const session = require("express-session");
const nocache = require("nocache");
const mongoose = require("mongoose");
const userRoute = require("./routes/userRoute");
const adminRoute = require("./routes/adminRoute");

const app = express();

//Database connection

const mongoConnectionString = process.env.MONGO_STRING;

mongoose.connect(mongoConnectionString, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverSelectionTimeoutMS: 30000, // 30 seconds
  socketTimeoutMS: 45000, // 45 seconds
});

// Middlewares
app.use("/", express.static(path.join(__dirname, "public")));
app.use("/admin", express.static(path.join(__dirname, "public")));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ limit: "10mb", extended: true }));
app.use(cookieParser());
app.use(
  session({
    secret: "Key",
    reSave: false,
    saveUninitialized: true,
    cookie: { maxAge: 6000000 },
  })
);
app.use(flash());
app.use(nocache());

// view engine setup
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

//routes
app.use("/", userRoute);
app.use("/admin", adminRoute);

// server listening
app.listen(PORT, () => {
  console.log(`Server started running`);
  console.log("mongoConnectionString", mongoConnectionString);
  console.log(`User Side : http://localhost:${PORT}`);
  console.log(`Admin Side : http://localhost:${PORT}/admin/login`);
});
