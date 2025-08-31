/**
 * uploadRoutes.js
 * @description :: routes of upload/download attachment
 */

const express = require('express');
const router = express.Router();
const fileUploadController = require('../../../controller/client/v1/fileUploadController');
const mediaUploadController = require('../../../controller/client/v1/mediaUploadController');
const auth = require('../../../middleware/auth');
const { PLATFORM } =  require('../../../constants/authConstant'); 

router.post('/client/api/v1/upload',auth(PLATFORM.CLIENT),fileUploadController.upload);

router.post('/client/api/v1/upload/media', 
  mediaUploadController.upload.single('file'), // Use multer middleware
  mediaUploadController.uploadMedia
);

router.post('/client/api/v1/generate-pre-signed-url',auth(PLATFORM.CLIENT),fileUploadController.generatePreSignedURL);

module.exports = router;