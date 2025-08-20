/**
 * model/interviewSession.js
 * @description :: model for interview sessions
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
    // Participants
    candidateId: {
        type: Schema.Types.ObjectId,
        ref: 'user'
    },

    recruiterId: {
        type: Schema.Types.ObjectId,
        ref: 'user'
    },

    jobId: {
        type: Schema.Types.ObjectId,
        ref: 'job',
        required: true
    },

    templateId: {
        type: Schema.Types.ObjectId,
        ref: 'interviewTemplate',
        required: true
    },

    verificationId: {
        type: Schema.Types.ObjectId,
        ref: 'candidateVerification'
    },

    publicLinkId: {
        type: Schema.Types.ObjectId,
        ref: 'publicInterviewLink'
    },

    // Session metadata
    title: {
        type: String,
        default: 'AI Interview Session'
    },

    status: {
        type: String,
        enum: ['pending', 'scheduled', 'in_progress', 'completed', 'cancelled'],
        default: 'pending'
    },

    // Timing
    scheduledAt: Date,
    startedAt: Date,
    completedAt: Date,

    // Progress tracking
    totalQuestions: {
        type: Number,
        default: 0
    },

    currentQuestion: {
        type: Number,
        default: 0
    },

    // Configuration
    voiceEnabled: {
        type: Boolean,
        default: false
    },

    aiEndpoint: {
        type: String,
        default: 'ollama'
    },

    aiModel: {
        type: String,
        default: 'llama2'
    },

    // Analysis results
    candidateAnalysisStatus: {
        type: String,
        enum: ['pending', 'in_progress', 'completed', 'failed'],
        default: 'pending'
    },

    candidateAnalysisData: {
        overallScore: Number,
        categoryScores: {
            technicalCompetency: Number,
            communicationSkills: Number,
            problemSolving: Number,
            culturalFit: Number
        },
        strengths: [String],
        weaknesses: [String],
        redFlags: [String],
        positiveIndicators: [String],
        detailedAssessment: {
            technicalDepth: String,
            communicationClarity: String,
            problemSolvingApproach: String,
            culturalAlignment: String,
            growthPotential: String
        },
        hiringRecommendation: {
            decision: {
                type: String,
                enum: ['strong_hire', 'hire', 'maybe', 'no_hire', 'strong_no_hire']
            },
            reasoning: String,
            confidenceLevel: Number
        }
    },

    candidateAnalysisCompletedAt: Date,

    // Percentile rankings
    globalPercentile: Number,
    jobSpecificPercentile: Number,
    performanceTier: {
        type: String,
        enum: ['exceptional', 'strong', 'average', 'below_average', 'poor']
    },

    // Quality metrics
    transcriptionCoveragePercentage: {
        type: Number,
        default: 0
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

module.exports = mongoose.model('interviewSession', schema, 'interviewSession');
