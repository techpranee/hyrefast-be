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

// NEW S3 Multipart Upload Routes (replace your chunked upload routes)
/**
 * @description : initiate S3 multipart upload
 * @param {Object} req : request with filename, contentType, metadata
 * @param {Object} res : response with uploadId and key
 * @return {Object} : multipart upload initiation result
 */
router.post('/multipart/initiate',
    auth(PLATFORM.CLIENT),
    s3Controller.initiateMultipartUpload
);

/**
 * @description : get presigned URL for uploading a part
 * @param {Object} req : request with uploadId, key, partNumber
 * @param {Object} res : response with presigned URL for part upload
 * @return {Object} : presigned URL for part
 */
router.post('/multipart/part-url',
    auth(PLATFORM.CLIENT),
    s3Controller.getPartUploadUrl
);

/**
 * @description : complete S3 multipart upload
 * @param {Object} req : request with uploadId, key, parts array
 * @param {Object} res : response with final file location
 * @return {Object} : completed upload result
 */
router.post('/multipart/complete',
    auth(PLATFORM.CLIENT),
    s3Controller.completeMultipartUpload
);

/**
 * @description : abort S3 multipart upload
 * @param {Object} req : request with uploadId and key
 * @param {Object} res : response with abort result
 * @return {Object} : abort result
 */
router.post('/multipart/abort',
    auth(PLATFORM.CLIENT),
    s3Controller.abortMultipartUpload
);

/**
 * @description : list parts of multipart upload (for resume functionality)
 * @param {Object} req : request with uploadId and key
 * @param {Object} res : response with uploaded parts list
 * @return {Object} : parts list
 */
router.get('/multipart/list-parts/:uploadId/:key',
    auth(PLATFORM.CLIENT),
    s3Controller.listMultipartParts
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


router.post('/init-chunked-upload', auth(PLATFORM.CLIENT), s3Controller.initChunkedUpload);
router.post('/upload-chunk', auth(PLATFORM.CLIENT), upload.single('chunk'), s3Controller.uploadChunk);
router.post('/complete-chunked-upload', auth(PLATFORM.CLIENT), s3Controller.completeChunkedUpload);
/**
 * @description : upload multiple chunks in batch
 */
router.post('/upload-chunks-batch',
    auth(PLATFORM.CLIENT),
    upload.array('chunks', 10), // Max 10 chunks per batch
    s3Controller.uploadChunksBatch
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
