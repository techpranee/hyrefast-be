/**
 * applicationValidation.js
 * @description :: validate each post and put request as per application model
 */

const joi = require("joi");
const { options, isCountOnly, populate, select } = require('./commonFilterValidation');

/** validation keys and properties of application */
exports.schemaKeys = joi.object({
	candidate: joi.string().regex(/^[0-9a-fA-F]{24}$/).allow(null).allow(''),
	job: joi.string().regex(/^[0-9a-fA-F]{24}$/).allow(null).allow(''),
	isDeleted: joi.boolean(),
	isActive: joi.boolean(),
	overall_score: joi.object()
}).unknown(true);

/** validation keys and properties of application for updation */
exports.updateSchemaKeys = joi.object({
	candidate: joi.string().regex(/^[0-9a-fA-F]{24}$/).allow(null).allow(''),
	job: joi.string().regex(/^[0-9a-fA-F]{24}$/).allow(null).allow(''),
	isDeleted: joi.boolean(),
	isActive: joi.boolean(),
	overall_score: joi.object(),
	_id: joi.string().regex(/^[0-9a-fA-F]{24}$/)
}).unknown(true);

let keys = ['query', 'where'];
/** validation keys and properties of application for filter documents from collection */
exports.findFilterKeys = joi.object({
	options: options,
	...Object.fromEntries(
		keys.map(key => [key, joi.object({
	candidate: joi.alternatives().try(joi.array().items(),joi.string().regex(/^[0-9a-fA-F]{24}$/),joi.object()),
	job: joi.alternatives().try(joi.array().items(),joi.string().regex(/^[0-9a-fA-F]{24}$/),joi.object()),
	isDeleted: joi.alternatives().try(joi.array().items(),joi.boolean(),joi.object()),
	isActive: joi.alternatives().try(joi.array().items(),joi.boolean(),joi.object()),
	overall_score: joi.alternatives().try(joi.array().items(),joi.object(),joi.object()),
	id: joi.any(),
	_id: joi.alternatives().try(joi.array().items(),joi.string().regex(/^[0-9a-fA-F]{24}$/),joi.object())
}).unknown(true),])
        ),
    isCountOnly: isCountOnly,
	populate: joi.array().items(populate),
    select: select
    
}).unknown(true);
