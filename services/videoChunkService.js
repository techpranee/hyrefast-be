const S3Service = require('./s3Service');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const path = require('path');

class VideoChunkService {
    constructor() {
        this.s3Service = new S3Service();
        this.tempDir = process.env.TEMP_DIR || './temp';

        // Ensure temp directory exists
        if (!fs.existsSync(this.tempDir)) {
            fs.mkdirSync(this.tempDir, { recursive: true });
        }
    }

    /**
     * Process and upload video chunk
     * @param {Buffer} chunkBuffer - Video chunk buffer
     * @param {Object} metadata - Chunk metadata
     * @returns {Promise<Object>} Processing result
     */
    async processVideoChunk(chunkBuffer, metadata) {
        try {
            const { sessionId, chunkIndex, totalChunks } = metadata;

            // Upload chunk to S3
            const uploadResult = await this.s3Service.uploadVideoChunk(
                chunkBuffer,
                sessionId,
                chunkIndex
            );

            if (!uploadResult.success) {
                return uploadResult;
            }

            // Store chunk metadata in database or cache
            await this.storeChunkMetadata(sessionId, {
                chunkIndex,
                s3Key: uploadResult.data.key,
                size: chunkBuffer.length,
                uploadedAt: new Date().toISOString(),
                totalChunks
            });

            return {
                success: true,
                data: {
                    chunkIndex,
                    sessionId,
                    s3Key: uploadResult.data.key,
                    size: chunkBuffer.length
                }
            };
        } catch (error) {
            console.error('Video chunk processing error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Assemble video chunks into final video
     * @param {string} sessionId - Interview session ID
     * @param {Object} options - Assembly options
     * @returns {Promise<Object>} Assembly result
     */
    async assembleVideoChunks(sessionId, options = {}) {
        try {
            // Get all chunks for the session
            const chunks = await this.getSessionChunks(sessionId);

            if (!chunks || chunks.length === 0) {
                return {
                    success: false,
                    error: 'No video chunks found for session'
                };
            }

            // Sort chunks by index
            chunks.sort((a, b) => a.chunkIndex - b.chunkIndex);

            if (options.useFFmpeg) {
                // Use FFmpeg for actual video concatenation
                return await this.assembleWithFFmpeg(sessionId, chunks);
            } else {
                // Use manifest-based approach for streaming
                return await this.createVideoManifest(sessionId, chunks);
            }
        } catch (error) {
            console.error('Video assembly error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Assemble video using FFmpeg
     * @param {string} sessionId - Session ID
     * @param {Array} chunks - Video chunks
     * @returns {Promise<Object>} Assembly result
     */
    async assembleWithFFmpeg(sessionId, chunks) {
        return new Promise((resolve, reject) => {
            try {
                const outputPath = path.join(this.tempDir, `${sessionId}_final.mp4`);
                const command = ffmpeg();

                // Add input chunks
                chunks.forEach(chunk => {
                    // Note: In production, you'd download chunks from S3 first
                    command.input(chunk.localPath || chunk.s3Key);
                });

                // Set output options
                command
                    .outputOptions([
                        '-c copy', // Copy streams without re-encoding
                        '-y' // Overwrite output file
                    ])
                    .output(outputPath)
                    .on('end', async () => {
                        try {
                            // Upload final video to S3
                            const finalVideoBuffer = fs.readFileSync(outputPath);
                            const uploadResult = await this.s3Service.uploadFile({
                                buffer: finalVideoBuffer,
                                originalname: `${sessionId}_interview.mp4`,
                                mimetype: 'video/mp4'
                            }, 'interviews');

                            // Clean up temp file
                            fs.unlinkSync(outputPath);

                            resolve({
                                success: true,
                                data: {
                                    videoUrl: uploadResult.data.location,
                                    s3Key: uploadResult.data.key,
                                    sessionId: sessionId,
                                    size: finalVideoBuffer.length
                                }
                            });
                        } catch (uploadError) {
                            reject({
                                success: false,
                                error: uploadError.message
                            });
                        }
                    })
                    .on('error', (err) => {
                        reject({
                            success: false,
                            error: err.message
                        });
                    })
                    .run();
            } catch (error) {
                reject({
                    success: false,
                    error: error.message
                });
            }
        });
    }

    /**
     * Create video manifest for streaming
     * @param {string} sessionId - Session ID
     * @param {Array} chunks - Video chunks
     * @returns {Promise<Object>} Manifest result
     */
    async createVideoManifest(sessionId, chunks) {
        try {
            const chunkKeys = chunks.map(chunk => chunk.s3Key);

            const manifestResult = await this.s3Service.assembleVideoChunks(
                sessionId,
                chunkKeys
            );

            if (!manifestResult.success) {
                return manifestResult;
            }

            // Update session with video status
            await this.updateSessionVideoStatus(sessionId, {
                status: 'assembled',
                manifestKey: manifestResult.data.manifestKey,
                totalChunks: chunks.length,
                assembledAt: new Date().toISOString()
            });

            return {
                success: true,
                data: {
                    sessionId: sessionId,
                    manifestKey: manifestResult.data.manifestKey,
                    videoUrl: manifestResult.data.videoUrl,
                    totalChunks: chunks.length,
                    playbackType: 'chunked'
                }
            };
        } catch (error) {
            console.error('Manifest creation error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get all chunks for a session
     * @param {string} sessionId - Session ID
     * @returns {Promise<Array>} Array of chunks
     */
    async getSessionChunks(sessionId) {
        try {
            // In production, this would query your database
            // For now, we'll list from S3
            const listResult = await this.s3Service.listObjects(`video-chunks/${sessionId}/`);

            if (!listResult.success) {
                return [];
            }

            const chunks = listResult.data.objects.map(obj => {
                const chunkMatch = obj.Key.match(/chunk-(\d+)\.webm$/);
                const chunkIndex = chunkMatch ? parseInt(chunkMatch[1]) : 0;

                return {
                    s3Key: obj.Key,
                    chunkIndex: chunkIndex,
                    size: obj.Size,
                    lastModified: obj.LastModified
                };
            });

            return chunks;
        } catch (error) {
            console.error('Error getting session chunks:', error);
            return [];
        }
    }

    /**
     * Store chunk metadata
     * @param {string} sessionId - Session ID
     * @param {Object} metadata - Chunk metadata
     * @returns {Promise<void>}
     */
    async storeChunkMetadata(sessionId, metadata) {
        try {
            // In production, this would store in your database
            // For now, we'll store in S3 as JSON
            const metadataKey = `video-chunks/${sessionId}/metadata/${metadata.chunkIndex}.json`;

            const uploadParams = {
                Bucket: this.s3Service.bucketName,
                Key: metadataKey,
                Body: JSON.stringify(metadata, null, 2),
                ContentType: 'application/json'
            };

            await this.s3Service.s3.upload(uploadParams).promise();
        } catch (error) {
            console.error('Error storing chunk metadata:', error);
        }
    }

    /**
     * Update session video status
     * @param {string} sessionId - Session ID
     * @param {Object} status - Video status
     * @returns {Promise<void>}
     */
    async updateSessionVideoStatus(sessionId, status) {
        try {
            // In production, this would update your database
            // For now, we'll store status in S3
            const statusKey = `videos/${sessionId}/status.json`;

            const uploadParams = {
                Bucket: this.s3Service.bucketName,
                Key: statusKey,
                Body: JSON.stringify(status, null, 2),
                ContentType: 'application/json'
            };

            await this.s3Service.s3.upload(uploadParams).promise();
        } catch (error) {
            console.error('Error updating video status:', error);
        }
    }

    /**
     * Delete session video data
     * @param {string} sessionId - Session ID
     * @returns {Promise<Object>} Deletion result
     */
    async deleteSessionVideo(sessionId) {
        try {
            // List all objects for the session
            const chunksList = await this.s3Service.listObjects(`video-chunks/${sessionId}/`);
            const videosList = await this.s3Service.listObjects(`videos/${sessionId}/`);

            const deletePromises = [];

            // Delete chunks
            if (chunksList.success) {
                chunksList.data.objects.forEach(obj => {
                    deletePromises.push(this.s3Service.deleteFile(obj.Key));
                });
            }

            // Delete video files
            if (videosList.success) {
                videosList.data.objects.forEach(obj => {
                    deletePromises.push(this.s3Service.deleteFile(obj.Key));
                });
            }

            await Promise.all(deletePromises);

            return {
                success: true,
                message: `All video data for session ${sessionId} deleted`
            };
        } catch (error) {
            console.error('Video deletion error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    /**
     * Get video playback URL
     * @param {string} sessionId - Session ID
     * @returns {Promise<Object>} Playback URL result
     */
    async getVideoPlaybackUrl(sessionId) {
        try {
            // Check if final video exists
            const finalVideoKey = `interviews/${sessionId}_interview.mp4`;
            const metadata = await this.s3Service.getObjectMetadata(finalVideoKey);

            if (metadata.success) {
                // Final video exists, return direct URL
                const url = await this.s3Service.generateSignedUrl(finalVideoKey, 86400);
                return {
                    success: true,
                    data: {
                        type: 'direct',
                        url: url,
                        sessionId: sessionId
                    }
                };
            } else {
                // Check for manifest
                const manifestKey = `videos/${sessionId}/manifest.json`;
                const manifestMetadata = await this.s3Service.getObjectMetadata(manifestKey);

                if (manifestMetadata.success) {
                    const manifestUrl = await this.s3Service.generateSignedUrl(manifestKey, 86400);
                    return {
                        success: true,
                        data: {
                            type: 'chunked',
                            manifestUrl: manifestUrl,
                            sessionId: sessionId
                        }
                    };
                }
            }

            return {
                success: false,
                error: 'No video found for session'
            };
        } catch (error) {
            console.error('Error getting playback URL:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }
}

module.exports = VideoChunkService;
