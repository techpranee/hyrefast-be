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
     * Initialize multipart upload
     * @param {string} key - S3 object key
     * @param {string} contentType - Content type
     * @param {Object} metadata - Additional metadata
     * @returns {Promise<Object>} Upload initiation result
     */
    async initiateMultipartUpload(key, contentType, metadata = {},isPublic) {
        try {
            const params = {
                Bucket: this.bucketName,
                Key: key,
                ContentType: contentType,
                 ACL: isPublic ? 'public-read' : 'private',
                Metadata: {
                    uploadType: 'multipart',
                    createdAt: new Date().toISOString(),
                    ...metadata
                }
            };

            console.log('🔄 Initiating multipart upload:', { key, contentType });
            const result = await this.s3.createMultipartUpload(params).promise();

            return {
                success: true,
                data: {
                    uploadId: result.UploadId,
                    key: result.Key,
                    bucket: result.Bucket
                }
            };
        } catch (error) {
            console.error('S3Service: Initiate multipart upload error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Generate presigned URL for part upload
     * @param {string} key - S3 object key
     * @param {string} uploadId - Upload ID
     * @param {number} partNumber - Part number
     * @param {number} expiresIn - URL expiration in seconds
     * @returns {Promise<Object>} Presigned URL result
     */
    async generatePartUploadUrl(key, uploadId, partNumber, expiresIn = 900) {
        try {
            const params = {
                Bucket: this.bucketName,
                Key: key,
                UploadId: uploadId,
                PartNumber: parseInt(partNumber),
                Expires: expiresIn
            };

            console.log(`🔗 Generating presigned URL for part ${partNumber}`);
            const url = this.s3.getSignedUrl('uploadPart', params);

            return {
                success: true,
                data: {
                    url,
                    partNumber: parseInt(partNumber),
                    expires: expiresIn
                }
            };
        } catch (error) {
            console.error('S3Service: Generate part upload URL error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Complete multipart upload
     * @param {string} key - S3 object key
     * @param {string} uploadId - Upload ID
     * @param {Array} parts - Array of parts with ETag and PartNumber
     * @returns {Promise<Object>} Completion result
     */
    async completeMultipartUpload(key, uploadId, parts) {
        try {
            // Sort parts by PartNumber to ensure correct order
            const sortedParts = parts.sort((a, b) => a.PartNumber - b.PartNumber);

            const params = {
                Bucket: this.bucketName,
                Key: key,
                UploadId: uploadId,
                MultipartUpload: {
                    Parts: sortedParts.map(part => ({
                        ETag: part.ETag,
                        PartNumber: part.PartNumber
                    }))
                }
            };

            console.log(`🎯 Completing multipart upload with ${sortedParts.length} parts`);
            const result = await this.s3.completeMultipartUpload(params).promise();

            return {
                success: true,
                data: {
                    location: result.Location,
                    url: result.Location,
                    etag: result.ETag,
                    key: result.Key,
                    bucket: result.Bucket
                }
            };
        } catch (error) {
            console.error('S3Service: Complete multipart upload error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Abort multipart upload
     * @param {string} key - S3 object key
     * @param {string} uploadId - Upload ID
     * @returns {Promise<Object>} Abort result
     */
    async abortMultipartUpload(key, uploadId) {
        try {
            const params = {
                Bucket: this.bucketName,
                Key: key,
                UploadId: uploadId
            };

            console.log('🚫 Aborting multipart upload:', { uploadId, key });
            await this.s3.abortMultipartUpload(params).promise();

            return {
                success: true,
                data: {
                    key,
                    uploadId,
                    status: 'aborted'
                }
            };
        } catch (error) {
            console.error('S3Service: Abort multipart upload error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * List parts of multipart upload
     * @param {string} key - S3 object key
     * @param {string} uploadId - Upload ID
     * @returns {Promise<Object>} Parts list result
     */
    async listMultipartParts(key, uploadId) {
        try {
            const params = {
                Bucket: this.bucketName,
                Key: key,
                UploadId: uploadId,
                MaxParts: 1000
            };

            console.log('📋 Listing multipart parts:', { uploadId, key });
            const result = await this.s3.listParts(params).promise();

            return {
                success: true,
                data: {
                    parts: result.Parts || [],
                    uploadId: result.UploadId,
                    key: result.Key,
                    maxParts: result.MaxParts,
                    isTruncated: result.IsTruncated
                }
            };
        } catch (error) {
            console.error('S3Service: List multipart parts error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Upload video chunk to S3 (legacy method - kept for compatibility)
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
     * Upload multiple chunks in batch with concurrency control
     * @param {Array} chunks - Array of chunk objects {buffer, key, options}
     * @param {number} concurrency - Maximum concurrent uploads
     * @returns {Promise<Object>} Batch upload result
     */
    async uploadChunksBatch(chunks, concurrency = 3) {
        try {
            const results = [];
            let index = 0;

            // Process chunks in batches with concurrency control
            const uploadPromises = [];
            
            for (let i = 0; i < Math.min(concurrency, chunks.length); i++) {
                uploadPromises.push(this.processChunkQueue(chunks, index++, results));
            }

            await Promise.all(uploadPromises);

            const successCount = results.filter(r => r.success).length;
            const failCount = results.length - successCount;

            return {
                success: failCount === 0,
                data: {
                    results,
                    summary: {
                        total: results.length,
                        successful: successCount,
                        failed: failCount
                    }
                },
                error: failCount > 0 ? `${failCount} chunks failed to upload` : null
            };
        } catch (error) {
            console.error('Batch chunk upload error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Process chunk upload queue
     * @param {Array} chunks - Chunks array
     * @param {number} startIndex - Starting index
     * @param {Array} results - Results array
     */
    async processChunkQueue(chunks, startIndex, results) {
        let currentIndex = startIndex;
        
        while (currentIndex < chunks.length) {
            const chunk = chunks[currentIndex];
            
            try {
                const uploadParams = {
                    Bucket: this.bucketName,
                    Key: chunk.key,
                    Body: chunk.buffer,
                    ContentType: chunk.options?.contentType || 'application/octet-stream',
                    Metadata: chunk.options?.metadata || {}
                };

                const result = await this.s3.upload(uploadParams).promise();
                
                results.push({
                    success: true,
                    chunkIndex: currentIndex,
                    data: {
                        key: result.Key,
                        location: result.Location,
                        etag: result.ETag,
                        size: chunk.buffer.length
                    }
                });
            } catch (error) {
                console.error(`Chunk ${currentIndex} upload failed:`, error);
                results.push({
                    success: false,
                    chunkIndex: currentIndex,
                    error: error.message
                });
            }
            
            currentIndex += 3; // Skip by concurrency amount
        }
    }

    /**
     * Upload chunk using buffer
     * @param {Buffer} buffer - Chunk buffer
     * @param {string} key - S3 key for the chunk
     * @param {Object} options - Upload options
     * @returns {Promise<Object>} Upload result
     */
    async uploadChunk(buffer, key, options = {}) {
        try {
            const uploadParams = {
                Bucket: this.bucketName,
                Key: key,
                Body: buffer,
                ContentType: options.contentType || 'application/octet-stream',
                Metadata: {
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
                    etag: result.ETag,
                    size: buffer.length
                }
            };
        } catch (error) {
            console.error('Chunk upload error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Complete chunked upload by assembling chunks
     * @param {string} uploadId - Upload session ID
     * @param {string} uploadKey - Base upload key
     * @param {Object} options - Completion options
     * @returns {Promise<Object>} Assembly result
     */
    async completeChunkedUpload(uploadId, uploadKey, options = {}) {
        try {
            const { sessionId, questionNumber, totalChunks, fileName } = options;
            
            // List all chunks for this upload
            const listParams = {
                Bucket: this.bucketName,
                Prefix: `${uploadKey}/chunk-`,
                MaxKeys: 1000
            };

            const listResult = await this.s3.listObjectsV2(listParams).promise();
            const chunks = listResult.Contents || [];

            if (chunks.length === 0) {
                throw new Error('No chunks found for this upload');
            }

            // Sort chunks by name to ensure correct order
            chunks.sort((a, b) => a.Key.localeCompare(b.Key));

            // Create final video file key
            const finalKey = `interviews/videos/${sessionId}/question-${questionNumber}/${fileName || `video-${uploadId}.webm`}`;

            // For actual video concatenation, you would use FFmpeg or similar
            // For now, we'll create a manifest file that references all chunks
            const manifest = {
                uploadId,
                sessionId,
                questionNumber,
                fileName,
                chunks: chunks.map(chunk => ({
                    key: chunk.Key,
                    size: chunk.Size,
                    lastModified: chunk.LastModified
                })),
                totalChunks: chunks.length,
                totalSize: chunks.reduce((sum, chunk) => sum + chunk.Size, 0),
                createdAt: new Date().toISOString(),
                status: 'completed'
            };

            // Upload manifest
            const manifestKey = `${finalKey}.manifest.json`;
            await this.s3.upload({
                Bucket: this.bucketName,
                Key: manifestKey,
                Body: JSON.stringify(manifest, null, 2),
                ContentType: 'application/json'
            }).promise();

            // Generate signed URL for access
            const videoUrl = await this.generateSignedUrl(finalKey, 86400); // 24 hours

            return {
                success: true,
                data: {
                    videoKey: finalKey,
                    manifestKey: manifestKey,
                    videoUrl: videoUrl,
                    totalChunks: chunks.length,
                    totalSize: manifest.totalSize,
                    uploadId,
                    sessionId,
                    questionNumber
                }
            };
        } catch (error) {
            console.error('Complete chunked upload error:', error);
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
