/**
 * response.js
 * @description :: model of a database collection response
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

    // Session reference
    sessionId: {
      type: Schema.Types.ObjectId,
      ref: 'application', // references the application model (interview session)
      required: true
    },

    questionNumber: {
      type: Number,
      required: true
    },

    questionText: { type: String },

    // Response content
    responseText: { type: String },

    responseAudioUrl: { type: String },

    responseVideoUrl: { type: String },

    responseDuration: {
      type: Number // in seconds
    },

    // Transcription
    transcriptionText: { type: String },

    // AI Analysis
    aiAnalysis: { type: Schema.Types.Mixed },

    // Legacy fields (keeping for backward compatibility)
    job: { type: String },

    question: { type: String },

    user: { type: String },

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
    },

    // Migration field to track Supabase ID
    supabaseId: {
      type: String,
      unique: true,
      sparse: true
    },

    score: { type: String }
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
const response = mongoose.model('response', schema);
module.exports = response;