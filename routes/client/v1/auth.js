/**
 * auth.js
 * @description :: routes of authentication APIs
 */

const express =  require("express");
const router  =  express.Router();
const auth = require('../../../middleware/auth');
const authController =  require("../../../controller/client/v1/authController");
const { PLATFORM } =  require("../../../constants/authConstant");   

router.route("/register").post(authController.register);
router.post("/send_otp_2fa",authController.sendOtpForTwoFA);
router.post("/login_with_2fa",authController.loginWithTwoFA);
router.route("/forgot-password").post(authController.forgotPassword);
router.route("/validate-otp").post(authController.validateResetPasswordOtp);
router.route("/reset-password").put(authController.resetPassword);
router.route('/logout').post(auth(PLATFORM.CLIENT), authController.logout);
router.route("/push-notification/addPlayerId").post(authController.addPlayerId);
router.route("/push-notification/removePlayerId").post(authController.removePlayerId);   
router.get("/login/google",(req,res)=>{
    req.session.platform = 'client'
    res.redirect(`http://localhost:${process.env.PORT}/auth/google`);
})       
module.exports = router;