const S3Service = require('../../../services/s3Service');
const VideoChunkService = require('../../../services/videoChunkService');
const { validationResult } = require('express-validator');

const s3Service = new S3Service();
const videoChunkService = new VideoChunkService();

/**
 * Upload file to S3
 */
const uploadFile = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.badRequest({ message: errors.array() });
    }

    if (!req.file) {
      return res.badRequest({ message: 'File is required' });
    }

    const {
      folder,
      isPublic = false,
      metadata = {}
    } = req.body;

    const uploadResult = await s3Service.uploadFile(
      req.file.buffer,
      req.file.originalname,
      {
        folder,
        contentType: req.file.mimetype,
        isPublic,
        metadata
      }
    );

    if (!uploadResult.success) {
      return res.internalServerError({ message: uploadResult.error });
    }

    return res.success({
      message: 'File uploaded successfully',
      data: uploadResult
    });
  } catch (error) {
    console.error('File upload error:', error);
    return res.internalServerError({ message: error.message });
  }
};

/**
 * Upload multiple files to S3
 */
const uploadMultipleFiles = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.badRequest({ message: errors.array() });
    }

    if (!req.files || req.files.length === 0) {
      return res.badRequest({ message: 'Files are required' });
    }

    const {
      folder,
      isPublic = false,
      metadata = {}
    } = req.body;

    const uploadPromises = req.files.map(file => 
      s3Service.uploadFile(
        file.buffer,
        file.originalname,
        {
          folder,
          contentType: file.mimetype,
          isPublic,
          metadata
        }
      )
    );

    const results = await Promise.all(uploadPromises);
    const successCount = results.filter(r => r.success).length;
    const failCount = results.length - successCount;

    return res.success({
      message: `Uploaded ${successCount} files successfully, ${failCount} failed`,
      data: {
        results,
        summary: {
          total: results.length,
          successful: successCount,
          failed: failCount
        }
      }
    });
  } catch (error) {
    console.error('Multiple file upload error:', error);
    return res.internalServerError({ message: error.message });
  }
};

/**
 * Get signed URL for file access
 */
const getSignedUrl = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.badRequest({ message: errors.array() });
    }

    const { fileKey } = req.params;
    const { expiresIn = 3600, operation = 'getObject' } = req.query;

    if (!fileKey) {
      return res.badRequest({ message: 'File key is required' });
    }

    const result = await s3Service.getSignedUrl(fileKey, {
      expiresIn: parseInt(expiresIn),
      operation
    });

    if (!result.success) {
      return res.internalServerError({ message: result.error });
    }

    return res.success({
      message: 'Signed URL generated successfully',
      data: result
    });
  } catch (error) {
    console.error('Signed URL error:', error);
    return res.internalServerError({ message: error.message });
  }
};

/**
 * Delete file from S3
 */
const deleteFile = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.badRequest({ message: errors.array() });
    }

    const { fileKey } = req.params;

    if (!fileKey) {
      return res.badRequest({ message: 'File key is required' });
    }

    const result = await s3Service.deleteFile(fileKey);

    if (!result.success) {
      return res.internalServerError({ message: result.error });
    }

    return res.success({
      message: 'File deleted successfully',
      data: result
    });
  } catch (error) {
    console.error('File deletion error:', error);
    return res.internalServerError({ message: error.message });
  }
};

/**
 * List files in S3 bucket/folder
 */
const listFiles = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.badRequest({ message: errors.array() });
    }

    const {
      prefix = '',
      maxKeys = 100,
      continuationToken
    } = req.query;

    const result = await s3Service.listFiles({
      prefix,
      maxKeys: parseInt(maxKeys),
      continuationToken
    });

    if (!result.success) {
      return res.internalServerError({ message: result.error });
    }

    return res.success({
      message: 'Files listed successfully',
      data: result
    });
  } catch (error) {
    console.error('File listing error:', error);
    return res.internalServerError({ message: error.message });
  }
};

/**
 * Upload video chunks
 */
const uploadVideoChunks = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.badRequest({ message: errors.array() });
    }

    if (!req.files || req.files.length === 0) {
      return res.badRequest({ message: 'Video chunks are required' });
    }

    const {
      sessionId,
      questionId,
      totalChunks,
      metadata = {}
    } = req.body;

    if (!sessionId || !questionId) {
      return res.badRequest({ 
        message: 'Session ID and Question ID are required' 
      });
    }

    const result = await videoChunkService.uploadVideoChunks(
      req.files,
      {
        sessionId,
        questionId,
        totalChunks: parseInt(totalChunks),
        metadata
      }
    );

    if (!result.success) {
      return res.internalServerError({ message: result.error });
    }

    return res.success({
      message: 'Video chunks uploaded successfully',
      data: result
    });
  } catch (error) {
    console.error('Video chunk upload error:', error);
    return res.internalServerError({ message: error.message });
  }
};

/**
 * Merge video chunks
 */
const mergeVideoChunks = async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.badRequest({ message: errors.array() });
    }

    const {
      sessionId,
      questionId,
      outputFormat = 'mp4'
    } = req.body;

    if (!sessionId || !questionId) {
      return res.badRequest({ 
        message: 'Session ID and Question ID are required' 
      });
    }

    const result = await videoChunkService.mergeVideoChunks(
      sessionId,
      questionId,
      { outputFormat }
    );

    if (!result.success) {
      return res.internalServerError({ message: result.error });
    }

    return res.success({
      message: 'Video chunks merged successfully',
      data: result
    });
  } catch (error) {
    console.error('Video chunk merge error:', error);
    return res.internalServerError({ message: error.message });
  }
};

/**
 * Get video chunk status
 */
const getVideoChunkStatus = async (req, res) => {
  try {
    const { sessionId, questionId } = req.params;

    if (!sessionId || !questionId) {
      return res.badRequest({ 
        message: 'Session ID and Question ID are required' 
      });
    }

    const result = await videoChunkService.getChunkStatus(sessionId, questionId);

    if (!result.success) {
      return res.internalServerError({ message: result.error });
    }

    return res.success({
      message: 'Video chunk status retrieved',
      data: result
    });
  } catch (error) {
    console.error('Video chunk status error:', error);
    return res.internalServerError({ message: error.message });
  }
};

module.exports = {
  uploadFile,
  uploadMultipleFiles,
  getSignedUrl,
  deleteFile,
  listFiles,
  uploadVideoChunks,
  mergeVideoChunks,
  getVideoChunkStatus
};
