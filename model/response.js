/**
  * response.js
  * @description :: model of a database collection response
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

    job:{type:Schema.Types.ObjectId,ref:"job"},

    question:{type:Schema.Types.ObjectId,ref:"question"},

    candidate:{type:Schema.Types.ObjectId,ref:"user"},

    isDeleted:{type:Boolean},

    isActive:{type:Boolean},

    createdAt:{type:Date},

    updatedAt:{type:Date},

    addedBy:{type:Schema.Types.ObjectId,ref:"user"},

    updatedBy:{type:Schema.Types.ObjectId,ref:"user"},

    score:{type:String},

    aiAnalysis:{type:Schema.Types.Mixed},

    sessionId:{ref:"application",type:Schema.Types.ObjectId},

    questionNumber:{type:Number},

    questionText:{type:String},

    responseText:{type:String},

    responseAudioUrl:{type:String},

    responseVideoUrl:{type:String},

    transcriptionText:{type:String}
    }
    ,{ 
        timestamps: { 
            createdAt: 'createdAt', 
            updatedAt: 'updatedAt' 
        } 
    }
);
schema.pre('save', async function(next) {
    this.isDeleted = false;
    this.isActive = true;
    next();
});

schema.pre('insertMany', async function (next, docs) {
    if (docs && docs.length){
        for (let index = 0; index < docs.length; index++) {
        const element = docs[index];
        element.isDeleted = false;
        element.isActive = true;
        }
    }
    next();
});

schema.method("toJSON", function () {
    const { _id, __v, ...object } = this.toObject({virtuals:true});
    object.id = _id;
     
    return object;
});
schema.plugin(mongoosePaginate);
schema.plugin(idValidator);
const response = mongoose.model("response",schema);
module.exports = response