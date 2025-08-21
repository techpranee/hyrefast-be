const TranscriptionService = require('../../../services/transcriptionService');
const { validationResult } = require('express-validator');

const transcriptionService = new TranscriptionService();

/**
 * Transcribe audio using Ollama
 */
const ollamaAudioTranscription = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.badRequest({ message: errors.array() });
        }

        const { audioFile, context } = req.body;

        if (!audioFile && !req.file) {
            return res.badRequest({ message: 'Audio file is required' });
        }

        // Use uploaded file if available, otherwise use provided audioFile
        const audioInput = req.file ? req.file.buffer : audioFile;

        const result = await transcriptionService.transcribeWithOllama(audioInput, {
            language: context?.language || 'en',
            model: context?.model || 'whisper'
        });

        if (!result.success) {
            return res.internalServerError({ message: result.error });
        }

        return res.success({
            message: 'Audio transcribed successfully',
            data: result
        });
    } catch (error) {
        console.error('Ollama transcription error:', error);
        return res.internalServerError({ message: error.message });
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
