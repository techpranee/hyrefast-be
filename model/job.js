/**
 * job.js
 * @description :: model of a database collection job
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

    title: { type: String },

    description: { type: String },

    requirements: { type: [String], default: [] },

    last_date: { type: String },

    salary: { type: String },

    employmentType: {
      type: String,
      enum: ['full-time', 'part-time', 'contract', 'internship']
    },

    location: { type: String },

    status: {
      type: String,
      enum: ['draft', 'active', 'paused', 'closed'],
      default: 'active'
    },

    // Interview configuration
    interviewTemplateId: {
      type: Schema.Types.ObjectId,
      ref: 'interviewTemplate'
    },

    interviewConfig: {
      aiModel: { type: String, default: 'llama2' },
      voiceEnabled: { type: Boolean, default: false },
      timeLimit: Number,
      autoAdvance: { type: Boolean, default: false }
    },

    // Public link settings
    publicLinkSettings: {
      enabled: { type: Boolean, default: false },
      maxUses: Number,
      expiresAt: Date,
      requireVerification: { type: Boolean, default: true }
    },

    // Pre-requisites for candidates
    preRequisites: {
      requiredFields: { type: [String], default: ['name', 'email', 'phone'] },
      customFields: [String],
      consentRequired: { type: Boolean, default: true }
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
  }
  , {
    timestamps: {
      createdAt: 'createdAt',
      updatedAt: 'updatedAt'
    }
  }
);
schema.pre('save', async function (next) {
  this.isDeleted = false;
  this.isActive = true;
  next();
});

schema.pre('insertMany', async function (next, docs) {
  if (docs && docs.length) {
    for (let index = 0; index < docs.length; index++) {
      const element = docs[index];
      element.isDeleted = false;
      element.isActive = true;
    }
  }
  next();
});

schema.method('toJSON', function () {
  const {
    _id, __v, ...object
  } = this.toObject({ virtuals: true });
  object.id = _id;

  return object;
});
schema.plugin(mongoosePaginate);
schema.plugin(idValidator);
const job = mongoose.model('job', schema);
module.exports = job;