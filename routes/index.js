/**
 * index.js
 * @description :: index route of platforms
*/

const express = require("express")
const router =  express.Router()
const rateLimit=require('express-rate-limit');

const rateLimiter=rateLimit({
  windowMs:10*60*1000,
  max:100,
  message:"Rate limit exceeded, please try again after 10 minutes",
  skip: (req) => {
      if (req.url.includes('/swagger') || req.url.includes('/favicon')) {
        return true
      } else {
        return false
      }
  }
});

router.use(rateLimiter,require("./client/v1/index"));  
router.use(require("./googleLoginRoutes"));

module.exports =router