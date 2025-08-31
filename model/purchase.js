/**
  * purchase.js
  * @description :: model of a database collection purchase
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

        plan: { type: Schema.Types.ObjectId, ref: "plan" },

        payment: { type: Schema.Types.ObjectId, ref: "payment" },

        status: { type: String },

        promo_code: { type: String },

        is_affiliation: { default: false, type: Boolean },

        is_first_time: { default: false, type: Boolean },

        is_subscription: { default: false, type: Boolean },

        invoice_number: { type: Number },

        amount: { type: Number },

        currency: { type: String },

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
const purchase = mongoose.model("purchase", schema);
module.exports = purchase