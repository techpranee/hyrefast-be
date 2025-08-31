/**
  * application.js
  * @description :: model of a database collection application
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

        candidate: { type: Schema.Types.ObjectId, ref: "user" },

        job: { type: Schema.Types.ObjectId, ref: "job" },

        isDeleted: { type: Boolean },

        isActive: { type: Boolean },

        createdAt: { type: Date },

        updatedAt: { type: Date },

        addedBy: { type: Schema.Types.ObjectId, ref: "user" },

        updatedBy: { type: Schema.Types.ObjectId, ref: "user" },

        overall_score: { type: Schema.Types.Mixed },

        credit_deduction_reference: { type: Schema.Types.ObjectId, ref: "credit" }
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
const application = mongoose.model("application", schema);
module.exports = application