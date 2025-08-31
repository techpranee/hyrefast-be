const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

class TranscriptionService {
    constructor() {
        this.whisperUrl = 'https://ollama.havenify.ai/transcribe';
        this.aiGenerateUrl = process.env.AI_GENERATE_URL || 'https://ollama2.havenify.ai/api/generate';
    }

    /**
     * Process single audio file with TTS context and retry logic
     * Adapted from your working Supabase implementation
     */
    async processSingleFile(audioBuffer, contextIntro = '', audioMimeType = 'audio/wav') {
        console.log(`🎵 Processing single file: ${Math.round(audioBuffer.byteLength / 1024 / 1024 * 100) / 100}MB`);

        let finalAudioBuffer = audioBuffer;

        // Add TTS context if available and formats match
        if (contextIntro && contextIntro.length > 0) {
            let ttsAudioBuffer = null;
            let ttsMimeType = 'audio/wav';

            // Try to request TTS in webm if original is webm
            if (audioMimeType === 'audio/webm') {
                try {
                    const ttsResponse = await axios.post('https://api.streamelements.com/kappa/v2/speech', {
                        voice: 'Brian',
                        text: contextIntro,
                        format: 'webm'
                    }, {
                        headers: { 'Content-Type': 'application/json' },
                        responseType: 'arraybuffer'
                    });

                    if (ttsResponse.status === 200 && ttsResponse.headers['content-type']?.includes('webm')) {
                        ttsAudioBuffer = ttsResponse.data;
                        ttsMimeType = 'audio/webm';
                        console.log('✅ Generated TTS context in webm');
                    } else {
                        console.log('⚠️ TTS API did not return webm, skipping TTS context for webm audio');
                    }
                } catch (e) {
                    console.log('⚠️ TTS webm generation failed:', e.message);
                }
            } else {
                // Default: use wav for non-webm
                ttsAudioBuffer = await this.generateTTSAudio(contextIntro);
                ttsMimeType = 'audio/wav';
            }

            if (ttsAudioBuffer && ttsAudioBuffer.byteLength > 0 && ttsMimeType === audioMimeType) {
                // Concatenate TTS + silence + audio (same format)
                const silenceBuffer = Buffer.alloc(4000, 0);
                finalAudioBuffer = Buffer.concat([
                    Buffer.from(ttsAudioBuffer),
                    silenceBuffer,
                    Buffer.from(audioBuffer)
                ]);
                console.log(`🎵 Enhanced with TTS context in ${ttsMimeType}`);
            } else if (audioMimeType === 'audio/webm') {
                console.log('⚠️ Skipping TTS context for webm audio (format mismatch)');
            } else if (ttsAudioBuffer && ttsAudioBuffer.byteLength > 0) {
                // For non-webm, allow wav TTS context
                const silenceBuffer = Buffer.alloc(4000, 0);
                finalAudioBuffer = Buffer.concat([
                    Buffer.from(ttsAudioBuffer),
                    silenceBuffer,
                    Buffer.from(audioBuffer)
                ]);
                console.log('🎵 Enhanced with TTS context (wav) for non-webm');
            }
        }

        // Retry logic for Whisper API calls
        const maxRetries = 3;
        let lastError = null;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log(`🔄 Processing attempt ${attempt}/${maxRetries}`);
                console.log(`📏 Sending audio buffer of size: ${finalAudioBuffer.byteLength} bytes`);

                // Call Whisper API with translate and language params to force English output
                const formData = new FormData();
                formData.append('audio', finalAudioBuffer, {
                    filename: 'interview-audio.wav',
                    contentType: 'audio/wav'
                });
                formData.append('translate', 'true'); // Force translation to English
                formData.append('language', 'en');    // Force output language to English

                const whisperResponse = await axios.post(this.whisperUrl, formData, {
                    headers: {
                        ...formData.getHeaders(),
                        'Accept': 'application/json'
                    },
                    timeout: 60000,
                    maxContentLength: Infinity,
                    maxBodyLength: Infinity
                });

                if (whisperResponse.status !== 200) {
                    const errorText = whisperResponse.data || 'No error details';
                    const error = new Error(`Whisper API failed (attempt ${attempt}): ${whisperResponse.status} - ${errorText}`);
                    console.error(`❌ ${error.message}`);

                    // If it's a 500 error and we have retries left, wait and try again
                    if (whisperResponse.status === 500 && attempt < maxRetries) {
                        const waitTime = Math.pow(2, attempt) * 1000; // Exponential backoff
                        console.log(`⏳ Waiting ${waitTime}ms before retry...`);
                        await new Promise(resolve => setTimeout(resolve, waitTime));
                        lastError = error;
                        continue;
                    }

                    throw error;
                }

                const whisperResult = whisperResponse.data;

                // Extract transcription
                let transcription = '';
                if (typeof whisperResult === 'string') {
                    transcription = whisperResult.trim();
                } else if (whisperResult && typeof whisperResult === 'object') {
                    if (whisperResult.transcription?.text) {
                        transcription = whisperResult.transcription.text.trim();
                    } else {
                        const possibleFields = ['text', 'result', 'transcript', 'output', 'data', 'content', 'message'];
                        for (const field of possibleFields) {
                            if (whisperResult[field] && typeof whisperResult[field] === 'string') {
                                transcription = whisperResult[field].trim();
                                break;
                            }
                        }
                    }
                }

                console.log(`✅ Transcription successful: ${transcription.length} characters`);
                return transcription;

            } catch (error) {
                lastError = error;
                console.error(`❌ Attempt ${attempt} failed:`, error.message);

                if (attempt < maxRetries) {
                    const waitTime = Math.pow(2, attempt) * 1000; // Exponential backoff
                    console.log(`⏳ Waiting ${waitTime}ms before retry...`);
                    await new Promise(resolve => setTimeout(resolve, waitTime));
                }
            }
        }

        // If all retries failed, throw the last error
        throw lastError || new Error('All transcription attempts failed');
    }

    /**
     * Generate TTS audio (placeholder - implement as needed)
     */
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

    /**
     * Main transcription method using the processSingleFile approach
     */
async transcribeWithOllama(audioInput, options = {}) {
    try {
        const formData = new FormData();

        // Get audio buffer
        let audioBuffer;
        if (typeof audioInput === 'string' && audioInput.startsWith('http')) {
            console.log('📥 Downloading from URL:', audioInput);
            const response = await axios.get(audioInput, { 
                responseType: 'arraybuffer',
                timeout: 30000
            });
            audioBuffer = Buffer.from(response.data);
        } else if (Buffer.isBuffer(audioInput)) {
            audioBuffer = audioInput;
        } else {
            throw new Error('Invalid audio input format');
        }

        if (audioBuffer.length === 0) {
            throw new Error('Audio buffer is empty');
        }

        console.log('📊 Audio buffer size:', audioBuffer.length, 'bytes');

        // ✅ Use correct FormData syntax
        formData.append('audio', audioBuffer, {
            filename: 'interview-audio.wav',
            contentType: 'audio/wav'
        });

        // Add required parameters
        formData.append('translate', 'true');
        formData.append('language', 'en');

        console.log('🔊 Sending to Ollama transcription service...');

        // ✅ FIX: Remove explicit Content-Type header - let Axios handle it automatically
        const response = await axios.post(this.whisperUrl, formData, {
            headers: {
                ...formData.getHeaders()
                // ❌ Remove this line: 'Accept': 'application/json'
                // ❌ Remove this line: 'Content-Type': 'multipart/form-data'
            },
            timeout: 60000,
            maxContentLength: Infinity,
            maxBodyLength: Infinity
        });

        const result = response.data;
        let transcription = '';

        // Extract transcription
        if (result.transcription && result.transcription.text !== undefined) {
            transcription = result.transcription.text.trim();
        } else if (result.text) {
            transcription = result.text.trim();
        }

        return {
            success: true,
            transcription: transcription || '[No speech detected]',
            confidence: result.confidence || 0.9
        };

    } catch (error) {
        console.error('❌ Transcription error:', {
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
     * Complete transcription pipeline
     */
    async processAudioTranscription(audioFile, context = {}) {
        try {
            const transcriptionResult = await this.transcribeWithOllama(audioFile, {
                language: context.language || 'en',
                contextIntro: context.contextIntro || '',
                mimeType: context.mimeType || 'audio/wav'
            });

            if (!transcriptionResult.success) {
                return transcriptionResult;
            }

            return {
                success: true,
                raw: {
                    transcription: transcriptionResult.transcription,
                    confidence: transcriptionResult.confidence,
                    language: transcriptionResult.language
                },
                metadata: {
                    processedAt: new Date().toISOString(),
                    context: context,
                    method: 'custom-ollama-endpoint'
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

    // Keep your other methods for AI analysis unchanged
    async improveTranscription(rawTranscription, context = {}) {
        // Your existing implementation
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
