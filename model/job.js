const mongoose = require('mongoose');
const mongoosePaginate = require('mongoose-paginate-v2');
let idValidator = require('mongoose-id-validator');
const { v4: uuidv4 } = require('uuid'); // Add this for unique link generation

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

// Interview Link Schema
const interviewLinkSchema = new Schema({
  linkId: {
    type: String,
    unique: true,
    default: () => uuidv4().replace(/-/g, '').substring(0, 12) 
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  enabled: {
    type: Boolean,
    default: true
  },
  maxUses: {
    type: String,
    default: 'Unlimited'
  },
  currentUses: {
    type: Number,
    default: 0
  },
  expiresAt: {
    type: Date
  },
  requireVerification: {
    type: Boolean,
    default: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  isActive: {
    type: Boolean,
    default: true
  }
});

const schema = new Schema(
  {
    title: { 
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      trim: true
    },
    location: {
      type: String,
      trim: true
    },
    employment_type: {
      type: String,
      enum: ['Full-time', 'Part-time', 'Contract', 'Internship'],
      default: 'Full-time'
    },
    requirements: [{
      type: String,
      trim: true
    }],
    salary: { 
      type: String,
      trim: true
    },
    last_date: { 
      type: Date
    },
    
    // Enhanced interview links - now supports multiple links
    interviewLinks: [interviewLinkSchema],
    
    // Keep legacy fields for backward compatibility
    publicLinkSettings: {
      enabled: { type: Boolean, default: false },
      maxUsers: { type: Number },
      expiresAt: { type: Date },
      requireVerification: { type: Boolean, default: true }
    },
    publicInterviewLink: {
      enabled: { type: Boolean, default: false },
      maxUses: { type: String, default: 'Unlimited' },
      expiresAt: { type: Date }
    },

    publicationStatus: {
      type: String,
      enum: ['draft', 'published', 'scheduled'],
      default: 'draft'
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
    },
    questions: [{
      type: Schema.Types.ObjectId,
      ref: 'question'
    }],
    workspace: {
      ref: 'workspace',
      type: Schema.Types.ObjectId,
      required: true
    }
  },
  {
    timestamps: {
      createdAt: 'createdAt',
      updatedAt: 'updatedAt'
    }
  }
);

// Add method to generate new interview link
schema.methods.addInterviewLink = function(linkData) {
  this.interviewLinks.push({
    name: linkData.name || `Interview Link ${this.interviewLinks.length + 1}`,
    enabled: linkData.enabled !== undefined ? linkData.enabled : true,
    maxUses: linkData.maxUses || 'Unlimited',
    expiresAt: linkData.expiresAt ? new Date(linkData.expiresAt) : null,
    requireVerification: linkData.requireVerification !== undefined ? linkData.requireVerification : true
  });
  return this.interviewLinks[this.interviewLinks.length - 1];
};

// Method to check if link is valid for use
schema.methods.isLinkValid = function(linkId) {
  const link = this.interviewLinks.find(l => l.linkId === linkId);
  if (!link || !link.enabled || !link.isActive) return false;
  
  // Check expiry
  if (link.expiresAt && new Date() > link.expiresAt) return false;
  
  // Check usage limit
  if (link.maxUses !== 'Unlimited' && link.currentUses >= parseInt(link.maxUses)) return false;
  
  return true;
};

// Method to increment link usage
schema.methods.incrementLinkUsage = function(linkId) {
  const link = this.interviewLinks.find(l => l.linkId === linkId);
  if (link) {
    link.currentUses = (link.currentUses || 0) + 1;
  }
};

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
