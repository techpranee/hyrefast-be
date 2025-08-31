/**
 * workspaceValidation.js
 * @description :: validate each post and put request as per workspace model
 */

const joi = require("joi");
const { options, isCountOnly, populate, select } = require('./commonFilterValidation');

/** validation keys and properties of workspace */
exports.schemaKeys = joi.object({
	name: joi.string().allow(null).allow(''),
	website: joi.string().allow(null).allow(''),
	legal_name: joi.string().allow(null).allow(''),
	logo: joi.string().allow(null).allow(''),
	address: joi.string().allow(null).allow(''),
	isDeleted: joi.boolean(),
	isActive: joi.boolean(),
	admin: joi.string().regex(/^[0-9a-fA-F]{24}$/).allow(null).allow(''),
	credit_balance: joi.number().integer().allow(0)
}).unknown(true);

/** validation keys and properties of workspace for updation */
exports.updateSchemaKeys = joi.object({
	name: joi.string().allow(null).allow(''),
	website: joi.string().allow(null).allow(''),
	legal_name: joi.string().allow(null).allow(''),
	logo: joi.string().allow(null).allow(''),
	address: joi.string().allow(null).allow(''),
	isDeleted: joi.boolean(),
	isActive: joi.boolean(),
	admin: joi.string().regex(/^[0-9a-fA-F]{24}$/).allow(null).allow(''),
	credit_balance: joi.number().integer().allow(0),
	_id: joi.string().regex(/^[0-9a-fA-F]{24}$/)
}).unknown(true);

let keys = ['query', 'where'];
/** validation keys and properties of workspace for filter documents from collection */
exports.findFilterKeys = joi.object({
	options: options,
	...Object.fromEntries(
		keys.map(key => [key, joi.object({
	name: joi.alternatives().try(joi.array().items(),joi.string(),joi.object()),
	website: joi.alternatives().try(joi.array().items(),joi.string(),joi.object()),
	legal_name: joi.alternatives().try(joi.array().items(),joi.string(),joi.object()),
	logo: joi.alternatives().try(joi.array().items(),joi.string(),joi.object()),
	address: joi.alternatives().try(joi.array().items(),joi.string(),joi.object()),
	isDeleted: joi.alternatives().try(joi.array().items(),joi.boolean(),joi.object()),
	isActive: joi.alternatives().try(joi.array().items(),joi.boolean(),joi.object()),
	admin: joi.alternatives().try(joi.array().items(),joi.string().regex(/^[0-9a-fA-F]{24}$/),joi.object()),
	credit_balance: joi.alternatives().try(joi.array().items(),joi.number().integer(),joi.object()),
	id: joi.any(),
	_id: joi.alternatives().try(joi.array().items(),joi.string().regex(/^[0-9a-fA-F]{24}$/),joi.object())
}).unknown(true),])
        ),
    isCountOnly: isCountOnly,
	populate: joi.array().items(populate),
    select: select
    
}).unknown(true);
