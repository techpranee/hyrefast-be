/**
 * model/interviewTemplate.js
 * @description :: model for interview templates
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
    title: {
        type: String,
        required: true
    },

    description: {
        type: String
    },

    jobRole: {
        type: String
    },

    questions: [{
        id: { type: String },
        text: { type: String, required: true },
        type: {
            type: String,
            enum: ['behavioral', 'technical', 'situational', 'general'],
            default: 'general'
        },
        expectedDuration: Number, // in seconds
        followUpQuestions: [String],
        evaluationCriteria: [String]
    }],

    isActive: {
        type: Boolean,
        default: true
    },

    isPublic: {
        type: Boolean,
        default: false
    },

    publicId: {
        type: String,
        unique: true,
        sparse: true
    },

    usageCount: {
        type: Number,
        default: 0
    },

    averageRating: Number,

    isDeleted: {
        type: Boolean,
        default: false
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

module.exports = mongoose.model('interviewTemplate', schema, 'interviewTemplate');
