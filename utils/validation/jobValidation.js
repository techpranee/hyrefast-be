/**
 * jobValidation.js
 * @description :: validate each post and put request as per job model
 */

const joi = require("joi");
const { options, isCountOnly, populate, select } = require('./commonFilterValidation');

/** validation keys and properties of job */
exports.schemaKeys = joi.object({
	title: joi.string().allow(null).allow(''),
	last_date: joi.string().allow(null).allow(''),
	salary: joi.string().allow(null).allow(''),
	isDeleted: joi.boolean(),
	isActive: joi.boolean(),
	questions: joi.array().items(),
	workspace: joi.string().regex(/^[0-9a-fA-F]{24}$/).allow(null).allow('')
}).unknown(true);

/** validation keys and properties of job for updation */
exports.updateSchemaKeys = joi.object({
	title: joi.string().allow(null).allow(''),
	last_date: joi.string().allow(null).allow(''),
	salary: joi.string().allow(null).allow(''),
	isDeleted: joi.boolean(),
	isActive: joi.boolean(),
	questions: joi.array().items(),
	workspace: joi.string().regex(/^[0-9a-fA-F]{24}$/).allow(null).allow(''),
	_id: joi.string().regex(/^[0-9a-fA-F]{24}$/)
}).unknown(true);

let keys = ['query', 'where'];
/** validation keys and properties of job for filter documents from collection */
exports.findFilterKeys = joi.object({
	options: options,
	...Object.fromEntries(
		keys.map(key => [key, joi.object({
	title: joi.alternatives().try(joi.array().items(),joi.string(),joi.object()),
	last_date: joi.alternatives().try(joi.array().items(),joi.string(),joi.object()),
	salary: joi.alternatives().try(joi.array().items(),joi.string(),joi.object()),
	isDeleted: joi.alternatives().try(joi.array().items(),joi.boolean(),joi.object()),
	isActive: joi.alternatives().try(joi.array().items(),joi.boolean(),joi.object()),
	questions: joi.alternatives().try(joi.array().items(),joi.array().items(),joi.object()),
	workspace: joi.alternatives().try(joi.array().items(),joi.string().regex(/^[0-9a-fA-F]{24}$/),joi.object()),
	id: joi.any(),
	_id: joi.alternatives().try(joi.array().items(),joi.string().regex(/^[0-9a-fA-F]{24}$/),joi.object())
}).unknown(true),])
        ),
    isCountOnly: isCountOnly,
	populate: joi.array().items(populate),
    select: select
    
}).unknown(true);
