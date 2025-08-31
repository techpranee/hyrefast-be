/**
 * authConstant.js
 * @description :: constants used in authentication
 */

const JWT={
    CLIENT_SECRET:"myjwtclientsecret",
    EXPIRES_IN: 10000
}

const USER_TYPES = {
        Applicant:1,
        Recruiter:2,
}

const PLATFORM = {
    CLIENT:1,
}

let LOGIN_ACCESS ={
    [USER_TYPES.Applicant]:[PLATFORM.CLIENT],        
    [USER_TYPES.Recruiter]:[PLATFORM.CLIENT],        
}

const DEFAULT_USER_ROLE = 'Applicant'

const MAX_LOGIN_RETRY_LIMIT = 3;
const LOGIN_REACTIVE_TIME = 5;   

const SEND_LOGIN_OTP = {
        SMS:1,
}
const DEFAULT_SEND_LOGIN_OTP=SEND_LOGIN_OTP.SMS

const FORGOT_PASSWORD_WITH = {
  LINK: {
    email: true,
    sms: false
  },
  EXPIRE_TIME: 200
}

module.exports = {
    JWT,
    USER_TYPES,
    PLATFORM,
    MAX_LOGIN_RETRY_LIMIT,
    LOGIN_REACTIVE_TIME,
    SEND_LOGIN_OTP,
    DEFAULT_SEND_LOGIN_OTP,
    FORGOT_PASSWORD_WITH,
    LOGIN_ACCESS,
    DEFAULT_USER_ROLE,
}