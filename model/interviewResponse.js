/**
 * model/interviewResponse.js
 * @description :: model for interview responses
 */

const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');
let idValidator = require('mongoose-id-validator');

const myCustomLabels = {
    totalDocs: 'itemCount',
    docs: 'data',
    limit: 'perPage',
    page: 'currentPage',
    nextPage: 'next',
    prevPage: 'prev',
    totalPages: 'pageCount',
    pagingCounter: 'slNo',
    meta: 'paginator',
};
mongoosePaginate.paginate.options = { customLabels: myCustomLabels };

const Schema = mongoose.Schema;
const schema = new Schema({
    sessionId: {
        type: Schema.Types.ObjectId,
        ref: 'interviewSession',
        required: true
    },

    questionNumber: {
        type: Number,
        required: true
    },

    questionText: String,

    // Response data
    responseText: String,
    responseAudioUrl: String,
    responseVideoUrl: String,
    responseDuration: Number, // in seconds

    // Transcription
    transcriptionText: String,
    transcriptionSource: {
        type: String,
        enum: ['none', 'browser', 'whisper', 'manual'],
        default: 'none'
    },
    transcriptionQualityScore: {
        type: Number,
        default: 0
    },
    transcriptionAttempts: {
        type: Number,
        default: 0
    },

    // AI Analysis
    aiAnalysis: {
        score: Number,
        feedback: String,
        keyPoints: [String],
        concerns: [String],
        suggestions: [String],
        technicalAccuracy: Number,
        communicationClarity: Number,
        relevance: Number,
        confidence: Number
    },

    aiAnalysisSource: {
        type: String,
        enum: ['none', 'ollama', 'openai', 'manual'],
        default: 'none'
    },

    aiAnalysisAttempts: {
        type: Number,
        default: 0
    },

    aiAnalysisQualityScore: {
        type: Number,
        default: 0
    },

    // Processing flags
    immediateAnalysisCompleted: {
        type: Boolean,
        default: false
    },

    postInterviewAnalysisCompleted: {
        type: Boolean,
        default: false
    },

    isDeleted: {
        type: Boolean,
        default: false
    },

    isActive: {
        type: Boolean,
        default: true
    },

    createdAt: {
        type: Date
    },

    updatedAt: {
        type: Date
    },

    addedBy: {
        type: Schema.Types.ObjectId,
        ref: 'user'
    },

    updatedBy: {
        type: Schema.Types.ObjectId,
        ref: 'user'
    }
}, {
    timestamps: {
        createdAt: 'createdAt',
        updatedAt: 'updatedAt'
    }
});

schema.pre('save', async function (next) {
    this.updatedAt = new Date();
    next();
});

schema.plugin(mongoosePaginate);
schema.plugin(idValidator);

module.exports = mongoose.model('interviewResponse', schema, 'interviewResponse');
