const S3Service = require('../../../services/s3Service');
const VideoChunkService = require('../../../services/videoChunkService');
const { validationResult } = require('express-validator');
const crypto = require('crypto');

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
            folder = 'uploads',
            isPublic = true,
            metadata = {}
        } = req.body;

        const uploadResult = await s3Service.uploadFile(
            req.file,
            folder,
            {
                public: isPublic,
                metadata
            }
        );

        if (!uploadResult.success) {
            return res.internalServerError({ message: uploadResult.error });
        }

        return res.success({
            message: 'File uploaded successfully',
            data: uploadResult.data
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
            folder = 'uploads',
            isPublic = true,
            metadata = {}
        } = req.body;

        const uploadPromises = req.files.map(file =>
            s3Service.uploadFile(
                file,
                folder,
                {
                    public: isPublic,
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
                results: results.map(r => r.data),
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
 * NEW: Initiate S3 multipart upload
 */
const initiateMultipartUpload = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.badRequest({ message: errors.array() });
        }

        const { filename, contentType, metadata = {} } = req.body;

        if (!filename) {
            return res.badRequest({ message: 'Filename is required' });
        }

        // Generate unique key for the upload
        const timestamp = Date.now();
        const randomId = crypto.randomBytes(8).toString('hex');
        const key = `interviews/videos/${timestamp}/${randomId}/${filename}`;

        const result = await s3Service.initiateMultipartUpload(
            key,
            contentType || 'video/webm',
            metadata,
             req.body.isPublic || false 
        );

        if (!result.success) {
            return res.internalServerError({ message: result.error });
        }

        return res.success({
            message: 'Multipart upload initiated successfully',
            data: result.data
        });
    } catch (error) {
        console.error('❌ Initiate multipart upload error:', error);
        return res.internalServerError({ 
            message: `Failed to initiate multipart upload: ${error.message}` 
        });
    }
};

/**
 * NEW: Get presigned URL for uploading a part
 */
const getPartUploadUrl = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.badRequest({ message: errors.array() });
        }

        const { uploadId, key, partNumber } = req.body;

        if (!uploadId || !key || !partNumber) {
            return res.badRequest({ 
                message: 'uploadId, key, and partNumber are required' 
            });
        }

        if (partNumber < 1 || partNumber > 10000) {
            return res.badRequest({ 
                message: 'partNumber must be between 1 and 10000' 
            });
        }

        const result = await s3Service.generatePartUploadUrl(
            key,
            uploadId,
            parseInt(partNumber)
        );

        if (!result.success) {
            return res.internalServerError({ message: result.error });
        }

        return res.success({
            message: 'Presigned URL generated successfully',
            data: result.data
        });
    } catch (error) {
        console.error('❌ Get part upload URL error:', error);
        return res.internalServerError({ 
            message: `Failed to generate presigned URL: ${error.message}` 
        });
    }
};

/**
 * NEW: Complete S3 multipart upload
 */
const completeMultipartUpload = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.badRequest({ message: errors.array() });
        }

        const { uploadId, key, parts } = req.body;

        if (!uploadId || !key || !parts || !Array.isArray(parts)) {
            return res.badRequest({ 
                message: 'uploadId, key, and parts array are required' 
            });
        }

        if (parts.length === 0) {
            return res.badRequest({ 
                message: 'At least one part is required' 
            });
        }

        // Validate parts structure
        for (const part of parts) {
            if (!part.ETag || !part.PartNumber) {
                return res.badRequest({ 
                    message: 'Each part must have ETag and PartNumber' 
                });
            }
        }

        const result = await s3Service.completeMultipartUpload(key, uploadId, parts);

        if (!result.success) {
            return res.internalServerError({ message: result.error });
        }

        return res.success({
            message: 'Multipart upload completed successfully',
            data: result.data
        });
    } catch (error) {
        console.error('❌ Complete multipart upload error:', error);
        return res.internalServerError({ 
            message: `Failed to complete multipart upload: ${error.message}` 
        });
    }
};

/**
 * NEW: Abort S3 multipart upload
 */
const abortMultipartUpload = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.badRequest({ message: errors.array() });
        }

        const { uploadId, key } = req.body;

        if (!uploadId || !key) {
            return res.badRequest({ 
                message: 'uploadId and key are required' 
            });
        }

        const result = await s3Service.abortMultipartUpload(key, uploadId);

        if (!result.success) {
            return res.internalServerError({ message: result.error });
        }

        return res.success({
            message: 'Multipart upload aborted successfully',
            data: result.data
        });
    } catch (error) {
        console.error('❌ Abort multipart upload error:', error);
        return res.internalServerError({ 
            message: `Failed to abort multipart upload: ${error.message}` 
        });
    }
};

/**
 * NEW: List parts of multipart upload
 */
const listMultipartParts = async (req, res) => {
    try {
        const { uploadId, key } = req.params;

        if (!uploadId || !key) {
            return res.badRequest({ 
                message: 'uploadId and key are required' 
            });
        }

        const decodedKey = decodeURIComponent(key);
        const result = await s3Service.listMultipartParts(decodedKey, uploadId);

        if (!result.success) {
            return res.internalServerError({ message: result.error });
        }

        return res.success({
            message: 'Multipart parts listed successfully',
            data: result.data
        });
    } catch (error) {
        console.error('❌ List multipart parts error:', error);
        return res.internalServerError({ 
            message: `Failed to list multipart parts: ${error.message}` 
        });
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

        const signedUrl = await s3Service.generateSignedUrl(
            fileKey,
            parseInt(expiresIn),
            operation
        );

        return res.success({
            message: 'Signed URL generated successfully',
            data: {
                url: signedUrl,
                expiresIn: parseInt(expiresIn),
                operation
            }
        });
    } catch (error) {
        console.error('Signed URL error:', error);
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
            maxKeys = 100
        } = req.query;

        const result = await s3Service.listObjects(prefix, parseInt(maxKeys));

        if (!result.success) {
            return res.internalServerError({ message: result.error });
        }

        return res.success({
            message: 'Files listed successfully',
            data: result.data
        });
    } catch (error) {
        console.error('File listing error:', error);
        return res.internalServerError({ message: error.message });
    }
};

/**
 * Initialize chunked upload
 */
const initChunkedUpload = async (req, res) => {
    try {
        const { fileName, fileType, totalChunks, sessionId, questionNumber, mediaType } = req.body;
        
        if (!fileName || !sessionId || !questionNumber) {
            return res.badRequest({ 
                message: 'fileName, sessionId, and questionNumber are required' 
            });
        }

        const uploadId = crypto.randomUUID();
        const uploadKey = `interviews/${sessionId}/question-${questionNumber}/${mediaType || 'media'}/${uploadId}`;
        
        return res.success({
            message: 'Chunked upload initialized',
            data: { 
                uploadId, 
                uploadKey, 
                totalChunks: totalChunks ? parseInt(totalChunks) : null,
                sessionId,
                questionNumber,
                mediaType
            }
        });
    } catch (error) {
        console.error('Init chunked upload error:', error);
        return res.internalServerError({ message: error.message });
    }
};

/**
 * Upload single chunk
 */
const uploadChunk = async (req, res) => {
    try {
        const { uploadId, uploadKey, chunkIndex, totalChunks } = req.body;
        const chunkFile = req.file;
        
        if (!chunkFile) {
            return res.badRequest({ message: 'Chunk file is required' });
        }
        
        if (!uploadId || !uploadKey || chunkIndex === undefined) {
            return res.badRequest({ 
                message: 'uploadId, uploadKey, and chunkIndex are required' 
            });
        }
        
        const chunkKey = `${uploadKey}/chunk-${chunkIndex.toString().padStart(4, '0')}`;
        
        const result = await s3Service.uploadChunk(
            chunkFile.buffer,
            chunkKey,
            {
                contentType: chunkFile.mimetype,
                metadata: {
                    uploadId,
                    chunkIndex,
                    totalChunks,
                    originalName: chunkFile.originalname
                }
            }
        );
        
        if (!result.success) {
            return res.internalServerError({ message: result.error });
        }
        
        return res.success({
            message: `Chunk ${chunkIndex} uploaded successfully`,
            data: { 
                chunkIndex: parseInt(chunkIndex),
                etag: result.data.etag,
                key: result.data.key,
                size: result.data.size
            }
        });
    } catch (error) {
        console.error('Chunk upload error:', error);
        return res.internalServerError({ message: error.message });
    }
};

/**
 * Upload multiple chunks in batch
 */
const uploadChunksBatch = async (req, res) => {
    try {
        if (!req.files || req.files.length === 0) {
            return res.badRequest({ message: 'Chunk files are required' });
        }

        const { uploadId, uploadKey, startIndex } = req.body;
        
        if (!uploadId || !uploadKey || startIndex === undefined) {
            return res.badRequest({ 
                message: 'uploadId, uploadKey, and startIndex are required' 
            });
        }

        const chunks = req.files.map((file, index) => {
            const chunkIndex = parseInt(startIndex) + index;
            const chunkKey = `${uploadKey}/chunk-${chunkIndex.toString().padStart(4, '0')}`;
            
            return {
                buffer: file.buffer,
                key: chunkKey,
                options: {
                    contentType: file.mimetype,
                    metadata: {
                        uploadId,
                        chunkIndex,
                        originalName: file.originalname
                    }
                }
            };
        });

        const result = await s3Service.uploadChunksBatch(chunks, 3);
        
        if (!result.success) {
            return res.internalServerError({ message: result.error || 'Batch upload failed' });
        }

        return res.success({
            message: `Batch of ${chunks.length} chunks uploaded successfully`,
            data: result.data
        });
    } catch (error) {
        console.error('Batch chunk upload error:', error);
        return res.internalServerError({ message: error.message });
    }
};

/**
 * Complete chunked upload
 */
const completeChunkedUpload = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.badRequest({ message: errors.array() });
        }

        const { 
            uploadId, 
            uploadKey, 
            sessionId, 
            questionNumber, 
            fileType,
            totalChunks,
            fileName 
        } = req.body;
        
        if (!uploadId || !uploadKey || !sessionId || !questionNumber) {
            return res.badRequest({ 
                message: 'uploadId, uploadKey, sessionId, and questionNumber are required' 
            });
        }

        const result = await s3Service.completeChunkedUpload(uploadId, uploadKey, {
            sessionId,
            questionNumber,
            fileType,
            totalChunks,
            fileName,
            metadata: {
                uploadType: 'chunked',
                sessionId,
                questionNumber,
                uploadedAt: new Date().toISOString()
            }
        });

        if (!result.success) {
            return res.internalServerError({ message: result.error });
        }

        return res.success({
            message: 'Chunked upload completed successfully',
            data: result.data
        });
    } catch (error) {
        console.error('Complete chunked upload error:', error);
        return res.internalServerError({ message: error.message });
    }
};

/**
 * Upload video chunks (legacy method)
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

module.exports = {
    // Existing methods
    uploadFile,
    uploadMultipleFiles,
    getSignedUrl,
    deleteFile,
    listFiles,
    uploadVideoChunks,
    mergeVideoChunks,
    getVideoChunkStatus,
    initChunkedUpload,
    uploadChunk,
    completeChunkedUpload,
    uploadChunksBatch,
    
    // NEW multipart upload methods
    initiateMultipartUpload,
    getPartUploadUrl,
    completeMultipartUpload,
    abortMultipartUpload,
    listMultipartParts
};
