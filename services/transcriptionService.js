const axios = require('axios');
const FormData = require('form-data');
const fs = require('fs');

class TranscriptionService {
    constructor() {
        this.whisperUrl = process.env.WHISPER_TRANSCRIBE_URL || 'https://ollama.havenify.ai/transcribe';
        this.aiGenerateUrl = process.env.AI_GENERATE_URL || 'https://ollama2.havenify.ai/api/generate';
    }

    /**
     * Transcribe audio using Ollama Whisper service
     * @param {string|Buffer} audioFile - Path to audio file or buffer
     * @param {Object} options - Additional options
     * @returns {Promise<Object>} Transcription result
     */
    async transcribeWithOllama(audioFile, options = {}) {
        try {
            const formData = new FormData();

            if (typeof audioFile === 'string') {
                // File path
                formData.append('file', fs.createReadStream(audioFile));
            } else {
                // Buffer
                formData.append('file', audioFile, { filename: 'audio.wav' });
            }

            // Add any additional parameters
            if (options.language) {
                formData.append('language', options.language);
            }
            if (options.model) {
                formData.append('model', options.model);
            }

            const response = await axios.post(this.whisperUrl, formData, {
                headers: {
                    ...formData.getHeaders(),
                    'Content-Type': 'multipart/form-data'
                },
                timeout: 60000 // 60 second timeout
            });

            return {
                success: true,
                transcription: response.data.text || response.data.transcription,
                confidence: response.data.confidence,
                language: response.data.language,
                segments: response.data.segments
            };
        } catch (error) {
            console.error('Ollama transcription error:', error);
            return {
                success: false,
                error: error.message,
                transcription: null
            };
        }
    }

    /**
     * Post-process transcription with AI improvements
     * @param {string} rawTranscription - Raw transcription text
     * @param {Object} context - Interview context
     * @returns {Promise<Object>} Improved transcription
     */
    async improveTranscription(rawTranscription, context = {}) {
        try {
            const prompt = `
        Improve the following interview transcription by:
        1. Fixing grammar and punctuation
        2. Adding proper capitalization
        3. Removing filler words (um, uh, like, you know)
        4. Ensuring technical terms are spelled correctly
        5. Maintaining the original meaning and tone
        
        Context: ${context.jobTitle || 'Technical Interview'}
        Question: ${context.question || 'Not provided'}
        
        Raw transcription:
        "${rawTranscription}"
        
        Improved transcription:
      `;

            const response = await axios.post(this.aiGenerateUrl, {
                model: 'llama3.1:8b',
                prompt: prompt,
                stream: false,
                options: {
                    temperature: 0.3,
                    top_p: 0.9,
                    max_tokens: 1000
                }
            });

            const improvedText = response.data.response || response.data.text;

            return {
                success: true,
                originalText: rawTranscription,
                improvedText: improvedText.trim(),
                improvements: {
                    grammarFixed: true,
                    fillerWordsRemoved: true,
                    capitalizedProperly: true
                }
            };
        } catch (error) {
            console.error('Transcription improvement error:', error);
            return {
                success: false,
                error: error.message,
                originalText: rawTranscription,
                improvedText: rawTranscription // Fallback to original
            };
        }
    }

    /**
     * Complete transcription pipeline
     * @param {string|Buffer} audioFile - Audio file to transcribe
     * @param {Object} context - Interview context
     * @returns {Promise<Object>} Complete transcription result
     */
    async processAudioTranscription(audioFile, context = {}) {
        try {
            // Step 1: Transcribe audio
            const transcriptionResult = await this.transcribeWithOllama(audioFile, {
                language: context.language || 'en'
            });

            if (!transcriptionResult.success) {
                return transcriptionResult;
            }

            // Step 2: Improve transcription
            const improvementResult = await this.improveTranscription(
                transcriptionResult.transcription,
                context
            );

            return {
                success: true,
                raw: {
                    transcription: transcriptionResult.transcription,
                    confidence: transcriptionResult.confidence,
                    language: transcriptionResult.language,
                    segments: transcriptionResult.segments
                },
                improved: {
                    transcription: improvementResult.improvedText,
                    improvements: improvementResult.improvements
                },
                metadata: {
                    processedAt: new Date().toISOString(),
                    context: context
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

    /**
     * Batch transcription for multiple audio files
     * @param {Array} audioFiles - Array of audio files
     * @param {Object} context - Shared context
     * @returns {Promise<Array>} Array of transcription results
     */
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
