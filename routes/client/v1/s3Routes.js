/**
 * s3Routes.js
 * @description :: routes for S3 and video chunk operations
 */

const express = require('express');
const router = express.Router();
const s3Controller = require('../../../controller/client/v1/s3Controller');
const { PLATFORM } = require('../../../constants/authConstant');
const auth = require('../../../middleware/auth');
const multer = require('multer');

// Configure multer for file uploads
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 500 * 1024 * 1024 // 500MB limit
    }
});

/**
 * @description : upload single file to S3
 * @param {Object} req : request for file upload
 * @param {Object} res : response with upload result
 * @return {Object} : upload result
 */
router.post('/upload',
    auth(PLATFORM.CLIENT),
    upload.single('file'),
    s3Controller.uploadFile
);

/**
 * @description : upload multiple files to S3
 * @param {Object} req : request for multiple file upload
 * @param {Object} res : response with upload results
 * @return {Object} : upload results
 */
router.post('/upload-multiple',
    auth(PLATFORM.CLIENT),
    upload.array('files', 20), // Max 20 files
    s3Controller.uploadMultipleFiles
);

/**
 * @description : get signed URL for file access
 * @param {Object} req : request for signed URL
 * @param {Object} res : response with signed URL
 * @return {Object} : signed URL
 */
router.get('/signed-url/:fileKey',
    auth(PLATFORM.CLIENT),
    s3Controller.getSignedUrl
);

/**
 * @description : delete file from S3
 * @param {Object} req : request for file deletion
 * @param {Object} res : response with deletion result
 * @return {Object} : deletion result
 */
router.delete('/delete/:fileKey',
    auth(PLATFORM.CLIENT),
    s3Controller.deleteFile
);

/**
 * @description : list files in S3 bucket/folder
 * @param {Object} req : request for file listing
 * @param {Object} res : response with file list
 * @return {Object} : file list
 */
router.get('/list',
    auth(PLATFORM.CLIENT),
    s3Controller.listFiles
);

/**
 * @description : upload video chunks
 * @param {Object} req : request for video chunk upload
 * @param {Object} res : response with upload result
 * @return {Object} : video chunk upload result
 */
router.post('/video-chunks',
    auth(PLATFORM.CLIENT),
    upload.array('chunks', 100), // Max 100 chunks
    s3Controller.uploadVideoChunks
);

/**
 * @description : merge video chunks
 * @param {Object} req : request for video chunk merge
 * @param {Object} res : response with merge result
 * @return {Object} : video merge result
 */
router.post('/video-merge',
    auth(PLATFORM.CLIENT),
    s3Controller.mergeVideoChunks
);

/**
 * @description : get video chunk status
 * @param {Object} req : request for video chunk status
 * @param {Object} res : response with chunk status
 * @return {Object} : video chunk status
 */
router.get('/video-status/:sessionId/:questionId',
    auth(PLATFORM.CLIENT),
    s3Controller.getVideoChunkStatus
);

module.exports = router;
