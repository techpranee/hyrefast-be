const AWS = require('aws-sdk');
const multer = require('multer');
const path = require('path');
const crypto = require('crypto');

class S3Service {
    constructor() {
        this.s3 = new AWS.S3({
            accessKeyId: process.env.AWS_S3_ACCESS_KEY_ID,
            secretAccessKey: process.env.AWS_S3_SECRET_ACCESS_KEY,
            region: process.env.AWS_S3_REGION || 'us-east-1'
        });
        this.bucketName = process.env.AWS_S3_BUCKET_NAME;
        this.urlExpiration = parseInt(process.env.AWS_URL_EXPIRATION) || 3600;
    }

    /**
     * Upload file to S3
     * @param {Object} file - File object from multer
     * @param {string} folder - S3 folder path
     * @param {Object} options - Additional upload options
     * @returns {Promise<Object>} Upload result
     */
    async uploadFile(file, folder = 'uploads', options = {}) {
        try {
            const fileName = options.fileName || this.generateFileName(file.originalname);
            const key = `${folder}/${fileName}`;

            const uploadParams = {
                Bucket: this.bucketName,
                Key: key,
                Body: file.buffer,
                ContentType: file.mimetype,
                ACL: options.public ? 'public-read' : 'private',
                Metadata: {
                    originalName: file.originalname,
                    uploadedAt: new Date().toISOString(),
                    ...options.metadata
                }
            };

            const result = await this.s3.upload(uploadParams).promise();

            return {
                success: true,
                data: {
                    key: result.Key,
                    location: result.Location,
                    bucket: result.Bucket,
                    fileName: fileName,
                    size: file.size,
                    contentType: file.mimetype,
                    url: options.public ? result.Location : null
                }
            };
        } catch (error) {
            console.error('S3 upload error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Upload video chunk to S3
     * @param {Buffer} chunkBuffer - Video chunk buffer
     * @param {string} sessionId - Interview session ID
     * @param {number} chunkIndex - Chunk index
     * @returns {Promise<Object>} Upload result
     */
    async uploadVideoChunk(chunkBuffer, sessionId, chunkIndex) {
        try {
            const key = `video-chunks/${sessionId}/chunk-${chunkIndex.toString().padStart(4, '0')}.webm`;

            const uploadParams = {
                Bucket: this.bucketName,
                Key: key,
                Body: chunkBuffer,
                ContentType: 'video/webm',
                Metadata: {
                    sessionId: sessionId,
                    chunkIndex: chunkIndex.toString(),
                    uploadedAt: new Date().toISOString()
                }
            };

            const result = await this.s3.upload(uploadParams).promise();

            return {
                success: true,
                data: {
                    key: result.Key,
                    location: result.Location,
                    chunkIndex: chunkIndex,
                    sessionId: sessionId
                }
            };
        } catch (error) {
            console.error('Video chunk upload error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Assemble video chunks into final video
     * @param {string} sessionId - Interview session ID
     * @param {Array} chunkKeys - Array of chunk keys in order
     * @returns {Promise<Object>} Assembly result
     */
    async assembleVideoChunks(sessionId, chunkKeys) {
        try {
            // For video assembly, we would typically use FFmpeg or similar
            // For now, we'll create a manifest file that lists all chunks
            const manifestKey = `videos/${sessionId}/manifest.json`;
            const manifest = {
                sessionId: sessionId,
                chunks: chunkKeys,
                totalChunks: chunkKeys.length,
                createdAt: new Date().toISOString(),
                status: 'assembled'
            };

            const manifestParams = {
                Bucket: this.bucketName,
                Key: manifestKey,
                Body: JSON.stringify(manifest, null, 2),
                ContentType: 'application/json',
                Metadata: {
                    sessionId: sessionId,
                    type: 'video-manifest'
                }
            };

            await this.s3.upload(manifestParams).promise();

            // Generate signed URL for video access
            const videoUrl = await this.generateSignedUrl(manifestKey, 86400); // 24 hours

            return {
                success: true,
                data: {
                    manifestKey: manifestKey,
                    videoUrl: videoUrl,
                    totalChunks: chunkKeys.length,
                    sessionId: sessionId
                }
            };
        } catch (error) {
            console.error('Video assembly error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Generate pre-signed URL for S3 object
     * @param {string} key - S3 object key
     * @param {number} expiresIn - Expiration time in seconds
     * @param {string} operation - Operation type (getObject, putObject)
     * @returns {Promise<string>} Signed URL
     */
    async generateSignedUrl(key, expiresIn = this.urlExpiration, operation = 'getObject') {
        try {
            const params = {
                Bucket: this.bucketName,
                Key: key,
                Expires: expiresIn
            };

            const url = await this.s3.getSignedUrlPromise(operation, params);
            return url;
        } catch (error) {
            console.error('Signed URL generation error:', error);
            throw error;
        }
    }

    /**
     * Generate pre-signed URL for upload
     * @param {string} fileName - File name
     * @param {string} contentType - Content type
     * @param {string} folder - S3 folder
     * @returns {Promise<Object>} Signed URL and metadata
     */
    async generateUploadUrl(fileName, contentType, folder = 'uploads') {
        try {
            const key = `${folder}/${this.generateFileName(fileName)}`;

            const params = {
                Bucket: this.bucketName,
                Key: key,
                ContentType: contentType,
                Expires: this.urlExpiration
            };

            const uploadUrl = await this.s3.getSignedUrlPromise('putObject', params);

            return {
                success: true,
                data: {
                    uploadUrl: uploadUrl,
                    key: key,
                    bucket: this.bucketName,
                    contentType: contentType
                }
            };
        } catch (error) {
            console.error('Upload URL generation error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Delete file from S3
     * @param {string} key - S3 object key
     * @returns {Promise<Object>} Delete result
     */
    async deleteFile(key) {
        try {
            const params = {
                Bucket: this.bucketName,
                Key: key
            };

            await this.s3.deleteObject(params).promise();

            return {
                success: true,
                message: 'File deleted successfully'
            };
        } catch (error) {
            console.error('S3 delete error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * List objects in S3 bucket
     * @param {string} prefix - Object key prefix
     * @param {number} maxKeys - Maximum number of keys to return
     * @returns {Promise<Object>} List result
     */
    async listObjects(prefix = '', maxKeys = 1000) {
        try {
            const params = {
                Bucket: this.bucketName,
                Prefix: prefix,
                MaxKeys: maxKeys
            };

            const result = await this.s3.listObjectsV2(params).promise();

            return {
                success: true,
                data: {
                    objects: result.Contents,
                    count: result.KeyCount,
                    isTruncated: result.IsTruncated
                }
            };
        } catch (error) {
            console.error('S3 list error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get object metadata
     * @param {string} key - S3 object key
     * @returns {Promise<Object>} Metadata result
     */
    async getObjectMetadata(key) {
        try {
            const params = {
                Bucket: this.bucketName,
                Key: key
            };

            const result = await this.s3.headObject(params).promise();

            return {
                success: true,
                data: {
                    contentLength: result.ContentLength,
                    contentType: result.ContentType,
                    lastModified: result.LastModified,
                    etag: result.ETag,
                    metadata: result.Metadata
                }
            };
        } catch (error) {
            console.error('S3 metadata error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Generate unique file name
     * @param {string} originalName - Original file name
     * @returns {string} Generated file name
     */
    generateFileName(originalName) {
        const ext = path.extname(originalName);
        const timestamp = Date.now();
        const random = crypto.randomBytes(6).toString('hex');
        return `${timestamp}-${random}${ext}`;
    }

    /**
     * Get multer storage configuration for memory storage
     * @returns {Object} Multer storage configuration
     */
    getMulterConfig() {
        return {
            storage: multer.memoryStorage(),
            limits: {
                fileSize: 100 * 1024 * 1024 // 100MB limit
            },
            fileFilter: (req, file, cb) => {
                // Allow common file types
                const allowedTypes = [
                    'image/jpeg',
                    'image/png',
                    'image/gif',
                    'video/mp4',
                    'video/webm',
                    'audio/mpeg',
                    'audio/wav',
                    'audio/ogg',
                    'application/pdf',
                    'text/plain'
                ];

                if (allowedTypes.includes(file.mimetype)) {
                    cb(null, true);
                } else {
                    cb(new Error('File type not allowed'), false);
                }
            }
        };
    }
}

module.exports = S3Service;
