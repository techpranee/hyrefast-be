/**
  * workspace.js
  * @description :: model of a database collection workspace
  */

const mongoose = require("mongoose");
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
mongoosePaginate.paginate.options = {
    customLabels: myCustomLabels
};
const Schema = mongoose.Schema;
const schema = new Schema(
    {

        name: { type: String },

        website: { type: String },

        legal_name: { type: String },

        logo: { type: String },

        address: { type: String },

        isDeleted: { type: Boolean },

        isActive: { type: Boolean },

        createdAt: { type: Date },

        updatedAt: { type: Date },

        addedBy: { type: Schema.Types.ObjectId, ref: "user" },

        updatedBy: { type: Schema.Types.ObjectId, ref: "user" },

        admin: { ref: "user", type: Schema.Types.ObjectId },

        // Enhanced credit management fields
        available_credits: { type: Number, default: 0 },
        total_credits_purchased: { type: Number, default: 0 },
        total_credits_used: { type: Number, default: 0 },
        last_credit_update: { type: Date, default: Date.now },
        credit_alert_threshold: { type: Number, default: 10 },

        // Legacy field - keeping for backward compatibility
        credit_balance: { type: Number }
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

schema.method("toJSON", function () {
    const { _id, __v, ...object } = this.toObject({ virtuals: true });
    object.id = _id;

    return object;
});
schema.plugin(mongoosePaginate);
schema.plugin(idValidator);
const workspace = mongoose.model("workspace", schema);
module.exports = workspace