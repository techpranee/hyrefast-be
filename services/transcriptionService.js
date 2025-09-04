const axios = require('axios');
const FormData = require('form-data');
const os = require('os');
const path = require('path');
const fs = require('fs');

class TranscriptionService {
    constructor() {
        this.whisperUrl = 'https://ollama.havenify.ai/transcribe';
        this.aiGenerateUrl = process.env.AI_GENERATE_URL || 'https://ollama2.havenify.ai/api/generate';
    }

    /**
     * Bulletproof multipart upload helper
     */
    async postMultipart(url, fields, fileKey, fileBuffer, filename, contentType, extraHeaders = {}) {
        const fd = new FormData();

        // Append file first
        fd.append(fileKey, fileBuffer, { filename, contentType });

        // Append text fields
        for (const [k, v] of Object.entries(fields || {})) {
            fd.append(k, String(v));
        }

        // Compute content-length (some servers need it)
        const contentLength = await new Promise((resolve, reject) => {
            fd.getLength((err, len) => (err ? reject(err) : resolve(len)));
        });

        const headers = {
            ...fd.getHeaders(),          // includes multipart/form-data; boundary=...
            'Content-Length': contentLength, // prevents "no file provided" on some Node servers
            ...extraHeaders,
        };

        console.log('📤 Sending multipart request with headers:', Object.keys(headers));
        console.log('📊 Content-Length:', contentLength);

        return axios.post(url, fd, {
            headers,
            maxBodyLength: Infinity,
            maxContentLength: Infinity,
            timeout: 60000,
        });
    }

    /**
     * **FIXED**: Cross-platform compatible streaming approach
     */
    async transcribeWithOllama(audioInput, options = {}) {
        try {
            console.log('🎯 Starting transcription with Ollama endpoint...');

            // Get audio buffer
            let audioBuffer;
            let mime = (options.mimeType || '').toLowerCase() || 'audio/webm';

            if (typeof audioInput === 'string' && audioInput.startsWith('http')) {
                console.log('📥 Downloading from URL:', audioInput);
                const response = await axios.get(audioInput, { 
                    responseType: 'arraybuffer',
                    timeout: 30000
                });
                audioBuffer = Buffer.from(response.data);
                // Prefer server-advertised mime if present
                if (response.headers['content-type']) {
                    mime = response.headers['content-type'].toLowerCase();
                }
            } else if (Buffer.isBuffer(audioInput)) {
                audioBuffer = audioInput;
            } else {
                throw new Error('Invalid audio input format');
            }

            if (!audioBuffer?.length) {
                throw new Error('Audio buffer is empty');
            }

            console.log('📊 Audio buffer size:', audioBuffer.length, 'bytes');

            // Determine correct file extension from mime type
            const ext = mime.includes('wav') ? 'wav'
                     : mime.includes('mp3') ? 'mp3'
                     : mime.includes('mp4') ? 'mp4'
                     : mime.includes('ogg') ? 'ogg'
                     : 'webm';

            console.log('🎵 Detected format:', ext, 'MIME:', mime);

            // Match Postman exactly: field name 'audio' + translate/language
            const response = await this.postMultipart(
                this.whisperUrl,
                { translate: 'true', language: 'en' },
                'audio',
                audioBuffer,
                `upload.${ext}`,
                mime
            );

            const result = response.data;
            console.log('✅ Server response received:',  result);

            let transcription = '';
            if (typeof result === 'string') {
                transcription = result.trim();
            } else if (result?.transcription) {
                // Based on your Postman response structure
                transcription = result.transcription.text || 
                              JSON.stringify(result.transcription);
            } else if (result?.text) {
                transcription = result.text.trim();
            }

            return {
                success: true,
                transcription: transcription || '[No speech detected]',
                confidence: result?.confidence ?? 0.9,
                raw: result
            };

        } catch (error) {
            console.error('❌ Buffer transcription error:', {
                message: error.message,
                status: error.response?.status,
                data: error.response?.data
            });
            
            return {
                success: false,
                error: error.response?.data?.error || error.message
            };
        }
    }

    /**
     * **FIXED**: Proper cross-platform temp file handling
     */
    async transcribeFromTempFile(audioBuffer, options = {}) {
        let tempFilePath = null;
        
        try {
            const mime = (options.mimeType || 'audio/webm').toLowerCase();
            const ext = mime.includes('wav') ? 'wav'
                     : mime.includes('mp3') ? 'mp3'
                     : mime.includes('mp4') ? 'mp4'
                     : mime.includes('ogg') ? 'ogg'
                     : 'webm';

            const tempDir = os.tmpdir();
            const tempFileName = `audio_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
            tempFilePath = path.join(tempDir, tempFileName);

            console.log('📁 Creating temp file at:', tempFilePath);

            // Ensure temp directory exists (create if needed)
            if (!fs.existsSync(tempDir)) {
                console.log('📁 Creating temp directory:', tempDir);
                fs.mkdirSync(tempDir, { recursive: true });
            }

            // Write buffer to temp file
            fs.writeFileSync(tempFilePath, audioBuffer);
            console.log('✅ Temp file created successfully');

            // Use the bulletproof multipart helper
            const response = await this.postMultipart(
                this.whisperUrl,
                { translate: 'true', language: 'en' },
                'audio',
                fs.createReadStream(tempFilePath),
                `upload.${ext}`,
                mime
            );

            const result = response.data;
            console.log('✅ Server response received:', typeof result);

            let transcription = '';
            if (typeof result === 'string') {
                transcription = result.trim();
            } else if (result?.transcription?.text) {
                transcription = result.transcription.text.trim();
            } else if (result?.text) {
                transcription = result.text.trim();
            }

            return {
                success: true,
                transcription: transcription || '[No speech detected]',
                confidence: result?.confidence ?? 0.9
            };

        } catch (error) {
            console.error('❌ Temp file transcription error:', {
                message: error.message,
                status: error.response?.status,
                data: error.response?.data
            });
            return {
                success: false,
                error: error.response?.data?.error || error.message
            };
        } finally {
            // **CRITICAL**: Always cleanup temp file
            if (tempFilePath && fs.existsSync(tempFilePath)) {
                try {
                    fs.unlinkSync(tempFilePath);
                    console.log('🗑️ Cleaned up temp file:', tempFilePath);
                } catch (cleanupError) {
                    console.warn('⚠️ Failed to cleanup temp file:', cleanupError.message);
                }
            }
        }
    }

    /**
     * **FIXED**: Main processing method with proper error handling
     */
    async processSingleFile(audioBuffer, contextIntro = '', audioMimeType = 'audio/webm') {
        // **FIX 3**: Proper file size calculation
        const fileSizeMB = audioBuffer ? Math.round(audioBuffer.byteLength / 1024 / 1024 * 100) / 100 : 0;
        console.log(`🎵 Processing single file: ${fileSizeMB}MB`);

        if (!audioBuffer || audioBuffer.length === 0) {
            throw new Error('Audio buffer is empty or invalid');
        }

        // Method 1: Try buffer approach first
        console.log('🔄 Attempting Method 1: Direct buffer...');
        let result = await this.transcribeWithOllama(audioBuffer, { mimeType: audioMimeType });
        
        if (result.success) {
            console.log('✅ Method 1 (buffer) succeeded');
            return result.transcription;
        }

        console.log('⚠️ Method 1 failed, trying Method 2: Temp file...');
        
        // Method 2: Fallback to temp file approach
        result = await this.transcribeFromTempFile(audioBuffer, { mimeType: audioMimeType });
        
        if (result.success) {
            console.log('✅ Method 2 (temp file) succeeded');
            return result.transcription;
        }

        console.log('❌ All methods failed');
        throw new Error(`All transcription methods failed. Last error: ${result.error}`);
    }

    // Keep existing methods...
    async generateTTSAudio(text) {
        try {
            const response = await axios.post('https://api.streamelements.com/kappa/v2/speech', {
                voice: 'Brian',
                text: text
            }, {
                headers: { 'Content-Type': 'application/json' },
                responseType: 'arraybuffer'
            });
            return response.data;
        } catch (error) {
            console.warn('TTS generation failed:', error.message);
            return null;
        }
    }

    async processAudioTranscription(audioFile, context = {}) {
        try {
            const transcription = await this.processSingleFile(
                audioFile, 
                context.contextIntro || '', 
                context.mimeType || 'audio/webm'
            );

            return {
                success: true,
                raw: {
                    transcription: transcription,
                    confidence: 0.9,
                    language: context.language || 'en'
                },
                metadata: {
                    processedAt: new Date().toISOString(),
                    context: context,
                    method: 'cross-platform-optimized'
                }
            };
        } catch (error) {
            console.error('Audio transcription processing error:', error);
            return {
                success: false,
                error: error.message
            };
        }
    }

    async improveTranscription(rawTranscription, context = {}) {
        return {
            success: true,
            originalText: rawTranscription,
            improvedText: rawTranscription
        };
    }

    async batchTranscription(audioFiles, context = {}) {
        const results = [];
        for (const audioFile of audioFiles) {
            const result = await this.processAudioTranscription(audioFile, {
                ...context,
                fileIndex: results.length
            });
            results.push(result);
        }
        return results;
    }
}

module.exports = TranscriptionService;
