/**
  * credit.js
  * @description :: model of a database collection credit
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

        workspace: { type: Schema.Types.ObjectId, ref: "workspace" },

        deduction: { type: Number },

        addition: { type: Number },

        is_added: { type: Boolean, default: false },

        application: { type: Schema.Types.ObjectId, ref: "application" },

        transaction_type: { type: String, enum: ['purchase', 'usage', 'refund', 'bonus', 'expiry', 'adjustment'] },

        balance: [{
            _id: false,
            credits: { type: Number },
            expiry: { type: Date },
            is_promo: { type: Boolean, default: false },
            no_expiry: { type: Boolean, default: false },
            credit_source: { type: String, default: 'purchase' },
            added_at: { type: Date, default: Date.now }
        }],

        isDeleted: { type: Boolean },

        isActive: { type: Boolean },

        createdAt: { type: Date },

        updatedAt: { type: Date },

        addedBy: { type: Schema.Types.ObjectId, ref: "user" },

        updatedBy: { type: Schema.Types.ObjectId, ref: "user" }
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
const credit = mongoose.model("credit", schema);
module.exports = credit