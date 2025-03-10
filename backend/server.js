import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import crypto from 'crypto';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';

dotenv.config()

const mongoUrl = process.env.MONGO_URL || "mongodb://localhost/project-auth";
mongoose.connect(mongoUrl, { useNewUrlParser: true, useUnifiedTopology: true });
mongoose.Promise = Promise;

const port = process.env.PORT || 8080;
const app = express();

const UserSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    unique: true
  },
  password: {
    type: String,
    required: true
  },
  accessToken: {
    type: String,
    default: () => crypto.randomBytes(128).toString('hex')
  }
})

const User = mongoose.model('User', UserSchema);

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  const Main = {
    About:
      "Backend for Sofia & Emma week 20 project",
    Routes: [
      {
        "/register": "to register new user",
        "/login": "to login existing user",
        "/content": "content only accessible for logged in users",
      },
    ],
  };
  res.send(Main);
});

app.post("/register", async (req, res) => {
  const { username, password } = req.body;
  
  try {
    const salt = bcrypt.genSaltSync();
    if (password.length < 8) {
      res.status(400).json({
        response: "password must be minimum 8 characters long",
        success: false
      })
    } else {
      const newUser = await new User({
        username,
        password: bcrypt.hashSync(password, salt)
      }).save();
      res.status(201).json({
        response: {
          username: newUser.username,
          accessToken: newUser.accessToken,
          userId: newUser._id
        },
        success: true
      })
    }

  } catch (error) {
    res.status(400).json({
      response: error,
      success: false
    })
  }
})

app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    const user = await User.findOne({username});

    if (user && bcrypt.compareSync(password, user.password)) {
      res.status(200).json({
        success: true,
        username: user.username,
        accessToken: user.accessToken,
        userId: user._id
      });
    } else {
      res.status(400).json({
        response: "username or password does not exist",
        success: false
      })
    }

  } catch (error) {
    res.status(400).json({
      response: error,
      success: false
    })
  }
});

const authenticateUser = async (req, res, next) => {
  const accessToken = req.header("Authorization");

  try {
    const user = await User.findOne({accessToken: accessToken});
    if (user) {
      next();
    } else {
      res.status(401).json({
        response: "You must be logged in to view this",
        success: false
      })
    }
  } catch (error) {
    res.status(400).json({
      response: error,
      success: false
    })
  }
}

app.get("/content", authenticateUser);
app.get("/content", (req, res) => {res.send("secret content")});

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`);
});
