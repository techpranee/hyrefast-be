/**
 * application.js - Enhanced with private interview link tracking
 */

const mongoose = require("mongoose");
const mongoosePaginate = require("mongoose-paginate-v2");
let idValidator = require("mongoose-id-validator");
const crypto = require('crypto');
const { options } = require("joi");

const myCustomLabels = {
  totalDocs: "itemCount",
  docs: "data",
  limit: "perPage",
  page: "currentPage",
  nextPage: "next",
  prevPage: "prev",
  totalPages: "pageCount",
  pagingCounter: "slNo",
  meta: "paginator",
};
mongoosePaginate.paginate.options = { customLabels: myCustomLabels };
const Schema = mongoose.Schema;

const schema = new Schema(
  {
    candidate: {
      type: Schema.Types.ObjectId,
      ref: "user",
    },

    job: {
      type: Schema.Types.ObjectId,
      ref: "job",
    },
    shortlisted: {
      type: Boolean,
      default: false,
    },

    // Keep existing enum
    status: {
      type: String,
      enum: [
        "interview_link_not_sent",
        "interview_link_sent",
        "interview_in_progress",
        "interview_completed",
        "interview_aborted",
        "assessment_ongoing",
      ],
      default: "interview_link_not_sent",
    },

    currentQuestion: {
      type: Number,
      default: 0,
    },

    totalQuestions: {
      type: Number,
      default: 0,
    },

    // NEW: Private interview link management
    privateInterviewLink: {
      token: { type: String, unique: true },
      sent: { type: Boolean, default: false },
      sentAt: { type: Date },
      accessed: { type: Boolean, default: false },
      accessedAt: { type: Date },
      expiresAt: { type: Date },
      used: { type: Boolean, default: false },
      ipAddress: { type: String },
      userAgent: { type: String }
    },

    // Track original public invitation link
    interview_link_id: { type: String },

    // Existing fields
    isDeleted: { type: Boolean, default: false },
    isActive: { type: Boolean, default: true },
    createdAt: { type: Date },
    updatedAt: { type: Date },

  
    //pre requisit questions
    preRequisiteQuestions: [
      {
        question: { type: String },
        answer: { type: String },
        questionType: { type: String ,enum: ["text","radio","checkbox","dropdown","link","upload"]},
        options: { type: [String] }
      }
      
    ],

    addedBy: {
      type: Schema.Types.ObjectId,
      ref: "user",
    },

    updatedBy: {
      type: Schema.Types.ObjectId,
      ref: "user",
    },

    overall_score: { type: Schema.Types.Mixed },
  },
  {
    timestamps: {
      createdAt: "createdAt",
      updatedAt: "updatedAt",
    },
  }
);

// Auto-populate candidate and job data
schema.pre(/^find/, function(next) {
  this.populate('candidate', 'name email phone_number location experience skills full_name');
  this.populate('job', 'title description location employment_type workspace');
  next();
});

// Generate unique private token before save
schema.pre('save', async function(next) {
  this.isDeleted = false;
  this.isActive = true;
  
  // Generate private token if not exists
  if (!this.privateInterviewLink?.token && this.isNew) {
    this.privateInterviewLink = {
      ...this.privateInterviewLink,
      token: crypto.randomBytes(32).toString('hex'),
      expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
      sent: false,
      accessed: false,
      used: false
    };
  }
  
  next();
});

schema.pre("insertMany", async function (next, docs) {
  if (docs && docs.length) {
    for (let index = 0; index < docs.length; index++) {
      const element = docs[index];
      element.isDeleted = false;
      element.isActive = true;
      
      // Generate private token for bulk inserts
      element.privateInterviewLink = {
        token: crypto.randomBytes(32).toString('hex'),
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        sent: false,
        accessed: false,
        used: false
      };
    }
  }
  next();
});

schema.method("toJSON", function () {
  const { _id, __v, ...object } = this.toObject({ virtuals: true });
  object.id = _id;
  return object;
});

schema.plugin(mongoosePaginate);
schema.plugin(idValidator);
const application = mongoose.model("application", schema);
module.exports = application;
