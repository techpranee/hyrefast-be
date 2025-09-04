const TranscriptionService = require('../../../services/transcriptionService');
const { validationResult } = require('express-validator');

const transcriptionService = new TranscriptionService();

/**
 * Transcribe audio using Ollama
 */
const ollamaAudioTranscription = async (req, res) => {
    try {
        console.log('🎯 Transcription request received:', {
            hasFile: !!req.file,
            fileFieldname: req.file?.fieldname,
            fileSize: req.file?.size,
            bodyKeys: Object.keys(req.body || {}),
            hasContext: !!req.body.context
        });

        let audioInput;
        let context = {};
        
        if (req.file && req.file.buffer) {
            // ✅ File uploaded via FormData (this should be the primary path)
            console.log('✅ Using uploaded file buffer, size:', req.file.size);
            audioInput = req.file.buffer;
            context = req.body.context ? JSON.parse(req.body.context) : {};
        } else {
            // ❌ This should not happen if FormData is sent correctly
            console.log('❌ No file received in req.file');
            console.log('📋 Full request body:', req.body);
            
            return res.status(400).json({
                status: 'CLIENT_ERROR',
                message: 'No audio file received in multipart form data',
                data: {
                    expectedField: 'audioFile',
                    receivedFile: !!req.file,
                    receivedBodyKeys: Object.keys(req.body),
                    contentType: req.headers['content-type']
                }
            });
        }

        console.log('🎯 Processing transcription with buffer...');

        const result = await transcriptionService.transcribeWithOllama(audioInput, {
            language: context?.language || 'en',
            model: context?.model || 'whisper'
        });

        console.log('📊 Transcription result:', result);

        if (!result.success) {
            console.log('❌ Transcription service failed:', result.error);
            return res.status(500).json({
                status: 'SERVER_ERROR',
                message: `Transcription failed: ${result.error}`,
                data: null
            });
        }

        console.log('✅ Transcription successful:', {
            transcriptionLength: result.transcription?.length,
            confidence: result.confidence
        });

        return res.status(200).json({
            status: 'SUCCESS',
            message: 'Audio transcribed successfully',
            data: result
        });
    } catch (error) {
        console.error('❌ Transcription controller error:', error);
        return res.status(500).json({
            status: 'SERVER_ERROR',
            message: `Controller error: ${error.message}`,
            data: null
        });
    }
};


/**
 * Post-interview transcription processing
 */
const postInterviewTranscription = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.badRequest({ message: errors.array() });
        }

        const { audioFile, sessionId, questionId, context } = req.body;

        if (!audioFile && !req.file) {
            return res.badRequest({ message: 'Audio file is required' });
        }

        const audioInput = req.file ? req.file.buffer : audioFile;
        const transcriptionContext = {
            sessionId,
            questionId,
            jobTitle: context?.jobTitle,
            question: context?.question,
            language: context?.language || 'en'
        };

        const result = await transcriptionService.processAudioTranscription(
            audioInput,
            transcriptionContext
        );

        if (!result.success) {
            return res.internalServerError({ message: result.error });
        }

        // TODO: Save transcription to database
        // await saveTranscriptionToDatabase(sessionId, questionId, result);

        return res.success({
            message: 'Post-interview transcription completed',
            data: result
        });
    } catch (error) {
        console.error('Post-interview transcription error:', error);
        return res.internalServerError({ message: error.message });
    }
};

/**
 * Improve existing transcription
 */
const improveTranscription = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.badRequest({ message: errors.array() });
        }

        const { rawTranscription, context } = req.body;

        if (!rawTranscription) {
            return res.badRequest({ message: 'Raw transcription is required' });
        }

        const result = await transcriptionService.improveTranscription(
            rawTranscription,
            context || {}
        );

        if (!result.success) {
            return res.internalServerError({ message: result.error });
        }

        return res.success({
            message: 'Transcription improved successfully',
            data: result
        });
    } catch (error) {
        console.error('Transcription improvement error:', error);
        return res.internalServerError({ message: error.message });
    }
};

/**
 * Batch transcription processing
 */
const batchTranscription = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.badRequest({ message: errors.array() });
        }

        const { audioFiles, context } = req.body;

        if (!audioFiles || !Array.isArray(audioFiles) || audioFiles.length === 0) {
            return res.badRequest({ message: 'Audio files array is required' });
        }

        const results = await transcriptionService.batchTranscription(
            audioFiles,
            context || {}
        );

        const successCount = results.filter(r => r.success).length;
        const failCount = results.length - successCount;

        return res.success({
            message: `Batch transcription completed. ${successCount} successful, ${failCount} failed.`,
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
        console.error('Batch transcription error:', error);
        return res.internalServerError({ message: error.message });
    }
};

/**
 * Get transcription status
 */
const getTranscriptionStatus = async (req, res) => {
    try {
        const { sessionId, questionId } = req.params;

        // TODO: Get transcription status from database
        // const status = await getTranscriptionStatusFromDatabase(sessionId, questionId);

        const mockStatus = {
            sessionId,
            questionId,
            status: 'completed',
            transcription: 'Sample transcription text',
            confidence: 0.95,
            processedAt: new Date().toISOString()
        };

        return res.success({
            message: 'Transcription status retrieved',
            data: mockStatus
        });
    } catch (error) {
        console.error('Get transcription status error:', error);
        return res.internalServerError({ message: error.message });
    }
};

module.exports = {
    ollamaAudioTranscription,
    postInterviewTranscription,
    improveTranscription,
    batchTranscription,
    getTranscriptionStatus
};
