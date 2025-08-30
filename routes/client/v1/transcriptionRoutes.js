/**
 * transcriptionRoutes.js
 * @description :: routes for transcription operations
 */

const express = require('express');
const router = express.Router();
const transcriptionController = require('../../../controller/client/v1/transcriptionController');
const { PLATFORM } = require('../../../constants/authConstant');
const auth = require('../../../middleware/auth');
const checkRolePermission = require('../../../middleware/checkRolePermission');
const { validateRegisterParams } = require('../../../utils/validation/userValidation');
const { validateRequest } = require('../../../utils/validateRequest');
const multer = require('multer');

// Configure multer for file uploads with better error handling
const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
        fileSize: 100 * 1024 * 1024 // 100MB limit
    },
    fileFilter: (req, file, cb) => {
        // Accept audio files
        if (file.mimetype.startsWith('audio/')) {
            cb(null, true);
        } else {
            cb(new Error('Only audio files are allowed'), false);
        }
    }
});

/**
 * @description : transcribe audio using Ollama
 * @param {Object} req : request for transcription
 * @param {Object} res : response for transcription
 * @return {Object} : transcription result
 */
router.post('/ollama-transcribe',
  
    upload.single('audioFile'), // ✅ Changed from 'audio' to 'audioFile'
    transcriptionController.ollamaAudioTranscription
);

/**
 * @description : post-interview transcription processing
 * @param {Object} req : request for post-interview transcription
 * @param {Object} res : response for transcription
 * @return {Object} : transcription result
 */
router.post('/post-interview',
    auth(PLATFORM.CLIENT),
    upload.single('audioFile'), // ✅ Changed from 'audio' to 'audioFile'
    transcriptionController.postInterviewTranscription
);

/**
 * @description : improve existing transcription
 * @param {Object} req : request for transcription improvement
 * @param {Object} res : response for improved transcription
 * @return {Object} : improved transcription result
 */
router.post('/improve',
    auth(PLATFORM.CLIENT),
    transcriptionController.improveTranscription
);

/**
 * @description : batch transcription processing
 * @param {Object} req : request for batch transcription
 * @param {Object} res : response for batch transcription
 * @return {Object} : batch transcription results
 */
router.post('/batch',
    auth(PLATFORM.CLIENT),
    upload.array('audioFiles', 10), // This is correct for batch
    transcriptionController.batchTranscription
);

/**
 * @description : get transcription status
 * @param {Object} req : request for transcription status
 * @param {Object} res : response with transcription status
 * @return {Object} : transcription status
 */
router.get('/status/:sessionId/:questionId',
    auth(PLATFORM.CLIENT),
    transcriptionController.getTranscriptionStatus
);

module.exports = router;
