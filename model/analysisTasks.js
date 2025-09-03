/**
 * analysisTasks.js
 * @description :: model for managing background analysis tasks for interview responses
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

const schema = new Schema(
    {
        taskId: {
            type: String,
            unique: true
            // Remove required: true since we'll generate it in pre-save
        },

        applicationId: {
            type: Schema.Types.ObjectId,
            ref: 'application',
            required: true
        },

        workspaceId: {
            type: Schema.Types.ObjectId,
            ref: 'workspace',
            required: true
        },

        status: {
            type: String,
            enum: ['pending', 'processing', 'completed', 'failed', 'cancelled'],
            default: 'pending'
        },

        priority: {
            type: String,
            enum: ['high', 'normal', 'low'],
            default: 'normal'
        },

        jobData: {
            totalResponses: { type: Number, default: 0 },
            processedResponses: { type: Number, default: 0 },
            individualAnalyses: [{
                type: Schema.Types.ObjectId,
                ref: 'response'
            }],
            overallAnalysisCompleted: { type: Boolean, default: false }
        },

        progress: {
            totalSteps: { type: Number, default: 0 },
            completedSteps: { type: Number, default: 0 },
            currentStep: {
                type: String,
                enum: ['fetching_responses', 'analyzing_individual', 'analyzing_overall', 'saving_results'],
                default: 'fetching_responses'
            },
            percentage: { type: Number, default: 0 }
        },

        timing: {
            queuedAt: { type: Date, default: Date.now },
            startedAt: { type: Date },
            completedAt: { type: Date },
            duration: { type: Number },
            estimatedCompletion: { type: Date }
        },

        error: {
            message: { type: String },
            code: { type: String },
            stack: { type: String },
            step: { type: String }
        },

        retryCount: { type: Number, default: 0 },
        maxRetries: { type: Number, default: 3 },
        workerId: { type: String },

        results: {
            individualScores: [{
                responseId: {
                    type: Schema.Types.ObjectId,
                    ref: 'response'
                },
                score: { type: Number },
                analysisCompleted: { type: Boolean, default: false }
            }],
            overallScore: { type: Schema.Types.Mixed },
            averageScore: { type: Number },
            analysisCompletedAt: { type: Date }
        },

        isDeleted: { type: Boolean },
        isActive: { type: Boolean },
        createdAt: { type: Date },
        updatedAt: { type: Date },

        addedBy: {
            type: Schema.Types.ObjectId,
            ref: 'user'
        },

        updatedBy: {
            type: Schema.Types.ObjectId,
            ref: 'user'
        }
    },
    {
        timestamps: {
            createdAt: 'createdAt',
            updatedAt: 'updatedAt'
        }
    }
);

schema.pre('save', async function (next) {
    this.isDeleted = false;
    this.isActive = true;

    // Generate task ID if not exists
    if (!this.taskId) {
        const crypto = require('crypto');
        this.taskId = `task_${this.applicationId}_${crypto.randomBytes(8).toString('hex')}`;
    }

    // Update progress percentage
    if (this.progress.totalSteps > 0) {
        this.progress.percentage = Math.round((this.progress.completedSteps / this.progress.totalSteps) * 100);
    }

    // Calculate duration if completed
    if (this.status === 'completed' && this.timing.startedAt && !this.timing.duration) {
        this.timing.duration = Date.now() - this.timing.startedAt.getTime();
    }

    next();
});

schema.pre('insertMany', async function (next, docs) {
    if (docs && docs.length) {
        for (let index = 0; index < docs.length; index++) {
            const element = docs[index];
            element.isDeleted = false;
            element.isActive = true;

            if (!element.taskId) {
                const crypto = require('crypto');
                element.taskId = `task_${element.applicationId}_${crypto.randomBytes(8).toString('hex')}`;
            }
        }
    }
    next();
});

// Index for efficient querying
schema.index({ status: 1, priority: -1, queuedAt: 1 });
schema.index({ applicationId: 1 });
schema.index({ workspaceId: 1 });
schema.index({ taskId: 1 }, { unique: true });

schema.method('toJSON', function () {
    const { _id, __v, ...object } = this.toObject({ virtuals: true });
    object.id = _id;
    return object;
});

schema.plugin(mongoosePaginate);
schema.plugin(idValidator);

const analysisTasks = mongoose.model('analysisTasks', schema);
module.exports = analysisTasks;
