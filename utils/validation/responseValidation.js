/**
 * responseValidation.js
 * @description :: validate each post and put request as per response model
 */

const joi = require("joi");
const { options, isCountOnly, populate, select } = require('./commonFilterValidation');

/** validation keys and properties of response */
exports.schemaKeys = joi.object({
	job: joi.string().regex(/^[0-9a-fA-F]{24}$/).allow(null).allow(''),
	question: joi.string().regex(/^[0-9a-fA-F]{24}$/).allow(null).allow(''),
	candidate: joi.string().regex(/^[0-9a-fA-F]{24}$/).allow(null).allow(''),
	isDeleted: joi.boolean(),
	isActive: joi.boolean(),
	score: joi.string().allow(null).allow(''),
	aiAnalysis: joi.object(),
	sessionId: joi.string().regex(/^[0-9a-fA-F]{24}$/).allow(null).allow(''),
	questionNumber: joi.number().integer().allow(0),
	questionText: joi.string().allow(null).allow(''),
	responseText: joi.string().allow(null).allow(''),
	responseAudioUrl: joi.string().allow(null).allow(''),
	responseVideoUrl: joi.string().allow(null).allow(''),
	transcriptionText: joi.string().allow(null).allow('')
}).unknown(true);

/** validation keys and properties of response for updation */
exports.updateSchemaKeys = joi.object({
	job: joi.string().regex(/^[0-9a-fA-F]{24}$/).allow(null).allow(''),
	question: joi.string().regex(/^[0-9a-fA-F]{24}$/).allow(null).allow(''),
	candidate: joi.string().regex(/^[0-9a-fA-F]{24}$/).allow(null).allow(''),
	isDeleted: joi.boolean(),
	isActive: joi.boolean(),
	score: joi.string().allow(null).allow(''),
	aiAnalysis: joi.object(),
	sessionId: joi.string().regex(/^[0-9a-fA-F]{24}$/).allow(null).allow(''),
	questionNumber: joi.number().integer().allow(0),
	questionText: joi.string().allow(null).allow(''),
	responseText: joi.string().allow(null).allow(''),
	responseAudioUrl: joi.string().allow(null).allow(''),
	responseVideoUrl: joi.string().allow(null).allow(''),
	transcriptionText: joi.string().allow(null).allow(''),
	_id: joi.string().regex(/^[0-9a-fA-F]{24}$/)
}).unknown(true);

let keys = ['query', 'where'];
/** validation keys and properties of response for filter documents from collection */
exports.findFilterKeys = joi.object({
	options: options,
	...Object.fromEntries(
		keys.map(key => [key, joi.object({
	job: joi.alternatives().try(joi.array().items(),joi.string().regex(/^[0-9a-fA-F]{24}$/),joi.object()),
	question: joi.alternatives().try(joi.array().items(),joi.string().regex(/^[0-9a-fA-F]{24}$/),joi.object()),
	candidate: joi.alternatives().try(joi.array().items(),joi.string().regex(/^[0-9a-fA-F]{24}$/),joi.object()),
	isDeleted: joi.alternatives().try(joi.array().items(),joi.boolean(),joi.object()),
	isActive: joi.alternatives().try(joi.array().items(),joi.boolean(),joi.object()),
	score: joi.alternatives().try(joi.array().items(),joi.string(),joi.object()),
	aiAnalysis: joi.alternatives().try(joi.array().items(),joi.object(),joi.object()),
	sessionId: joi.alternatives().try(joi.array().items(),joi.string().regex(/^[0-9a-fA-F]{24}$/),joi.object()),
	questionNumber: joi.alternatives().try(joi.array().items(),joi.number().integer(),joi.object()),
	questionText: joi.alternatives().try(joi.array().items(),joi.string(),joi.object()),
	responseText: joi.alternatives().try(joi.array().items(),joi.string(),joi.object()),
	responseAudioUrl: joi.alternatives().try(joi.array().items(),joi.string(),joi.object()),
	responseVideoUrl: joi.alternatives().try(joi.array().items(),joi.string(),joi.object()),
	transcriptionText: joi.alternatives().try(joi.array().items(),joi.string(),joi.object()),
	id: joi.any(),
	_id: joi.alternatives().try(joi.array().items(),joi.string().regex(/^[0-9a-fA-F]{24}$/),joi.object())
}).unknown(true),])
        ),
    isCountOnly: isCountOnly,
	populate: joi.array().items(populate),
    select: select
    
}).unknown(true);
