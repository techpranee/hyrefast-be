// controllers/mediaUploadController.js
const fs = require('fs');
const path = require('path');
const formidable = require('formidable');
const AWS = require('aws-sdk');
const multer = require('multer');

// Configure multer for memory storage
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 500 * 1024 * 1024, // 500MB limit for video files
  },
  fileFilter: (req, file, cb) => {
    // Accept video and audio files
    if (file.mimetype.startsWith('video/') || file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Only video and audio files are allowed'), false);
    }
  }
});

/**
 * @description : Upload media files (audio/video) to S3
 * @param {Object} req : request with file data
 * @param {Object} res : response with file URL
 * @return {Object} : uploaded file URL and metadata
 */
const uploadMedia = async (req, res) => {
  try {
    if (!req.file) {
      return res.badRequest({ message: 'No file provided' });
    }

    const { sessionId, questionNumber, fileType } = req.body;
    
    if (!sessionId || !questionNumber || !fileType) {
      return res.badRequest({ 
        message: 'Missing required fields: sessionId, questionNumber, fileType' 
      });
    }

    console.log('📤 Uploading media file:', {
      originalName: req.file.originalname,
      mimeType: req.file.mimetype,
      size: req.file.size,
      sessionId,
      questionNumber,
      fileType
    });

    // Generate unique filename
    const timestamp = Date.now();
    const randomString = Math.random().toString(36).substring(2, 8);
    const fileExtension = path.extname(req.file.originalname) || '.webm';
    const fileName = `interviews/${sessionId}/q${questionNumber}_${fileType}_${timestamp}_${randomString}${fileExtension}`;

    const response = await uploadToS3Media(req.file, fileName);

    if (!response.status) {
      throw new Error(response.message);
    }

    console.log('✅ Media file uploaded successfully:', response.data);

    // Return the file URL and metadata
    return res.success({
      data: {
        url: response.data,
        fileName: fileName,
        fileSize: req.file.size,
        mimeType: req.file.mimetype,
        sessionId: sessionId,
        questionNumber: parseInt(questionNumber),
        fileType: fileType,
        uploadedAt: new Date().toISOString()
      },
      message: 'Media file uploaded successfully'
    });

  } catch (error) {
    console.error('❌ Error uploading media file:', error);
    return res.internalServerError({
      message: 'Failed to upload media file',
      error: error.message
    });
  }
};

/**
 * @description : upload media file to AWS S3
 * @param {Object} file : file buffer from multer
 * @param {string} fileName : name of file
 * @return {Object} : response for file upload to AWS S3
 */
const uploadToS3Media = async (file, fileName) => {
  let S3Config = {
    AWS_S3_ACCESS_KEY_ID: process.env.AWS_S3_ACCESS_KEY_ID,
    AWS_S3_SECRET_ACCESS_KEY: process.env.AWS_S3_SECRET_ACCESS_KEY,
    AWS_S3_REGION: process.env.AWS_S3_REGION,
    AWS_S3_BUCKET_NAME: process.env.AWS_S3_BUCKET_NAME,
  };

  const s3 = new AWS.S3({
    region: S3Config.AWS_S3_REGION,
    accessKeyId: S3Config.AWS_S3_ACCESS_KEY_ID,
    secretAccessKey: S3Config.AWS_S3_SECRET_ACCESS_KEY
  });

  let params = {
    Bucket: S3Config.AWS_S3_BUCKET_NAME,
    Body: file.buffer, // Use buffer instead of file stream
    Key: fileName,
    ContentType: file.mimetype,
    ACL: 'public-read',
    Metadata: {
      'upload-type': 'interview-media',
      'uploaded-at': new Date().toISOString()
    }
  };

  const response = await new Promise(async (resolve, reject) => {
    s3.putObject(params, function (error, data) {
      if (error) {
        resolve({
          status: false,
          message: error.message
        });
      } else {
        resolve({
          status: true,
          data: `https://${S3Config.AWS_S3_BUCKET_NAME}.s3.${S3Config.AWS_S3_REGION}.amazonaws.com/${fileName}`
        });
      }
    });
  });

  return response;
};

module.exports = {
  uploadMedia,
  upload // Export the multer middleware
};