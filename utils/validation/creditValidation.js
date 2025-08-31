/**
 * creditValidation.js
 * @description :: validate each post and put request as per credit model
 */

const joi = require("joi");
const { options, isCountOnly, populate, select } = require('./commonFilterValidation');

/** validation keys and properties of credit */
exports.schemaKeys = joi.object({
	workspace: joi.string().regex(/^[0-9a-fA-F]{24}$/).allow(null).allow(''),
	deduction: joi.number().integer().allow(0),
	addition: joi.number().integer().allow(0),
	is_added: joi.boolean().default(false),
	application: joi.string().regex(/^[0-9a-fA-F]{24}$/).allow(null).allow(''),
	balance: joi.array().items(joi.object()),
	isDeleted: joi.boolean(),
	isActive: joi.boolean()
}).unknown(true);

/** validation keys and properties of credit for updation */
exports.updateSchemaKeys = joi.object({
	workspace: joi.string().regex(/^[0-9a-fA-F]{24}$/).allow(null).allow(''),
	deduction: joi.number().integer().allow(0),
	addition: joi.number().integer().allow(0),
	is_added: joi.boolean().default(false),
	application: joi.string().regex(/^[0-9a-fA-F]{24}$/).allow(null).allow(''),
	balance: joi.array().items(joi.object()),
	isDeleted: joi.boolean(),
	isActive: joi.boolean(),
	_id: joi.string().regex(/^[0-9a-fA-F]{24}$/)
}).unknown(true);

let keys = ['query', 'where'];
/** validation keys and properties of credit for filter documents from collection */
exports.findFilterKeys = joi.object({
	options: options,
	...Object.fromEntries(
		keys.map(key => [key, joi.object({
	workspace: joi.alternatives().try(joi.array().items(),joi.string().regex(/^[0-9a-fA-F]{24}$/),joi.object()),
	deduction: joi.alternatives().try(joi.array().items(),joi.number().integer(),joi.object()),
	addition: joi.alternatives().try(joi.array().items(),joi.number().integer(),joi.object()),
	is_added: joi.alternatives().try(joi.array().items(),joi.boolean(),joi.object()),
	application: joi.alternatives().try(joi.array().items(),joi.string().regex(/^[0-9a-fA-F]{24}$/),joi.object()),
	isDeleted: joi.alternatives().try(joi.array().items(),joi.boolean(),joi.object()),
	isActive: joi.alternatives().try(joi.array().items(),joi.boolean(),joi.object()),
	id: joi.any(),
	_id: joi.alternatives().try(joi.array().items(),joi.string().regex(/^[0-9a-fA-F]{24}$/),joi.object())
}).unknown(true),])
        ),
    isCountOnly: isCountOnly,
	populate: joi.array().items(populate),
    select: select
    
}).unknown(true);
