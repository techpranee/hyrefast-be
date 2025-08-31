/**
 * planValidation.js
 * @description :: validate each post and put request as per plan model
 */

const joi = require("joi");
const { options, isCountOnly, populate, select } = require('./commonFilterValidation');

/** validation keys and properties of plan */
exports.schemaKeys = joi.object({
	name: joi.string().allow(null).allow(''),
	credits: joi.number().integer().allow(0),
	validity: joi.object({text:joi.string(),days:joi.number().integer()}).allow(0),
	amount: joi.number().integer().allow(0),
	currency: joi.string().allow(null).allow(''),
	isDeleted: joi.boolean(),
	isActive: joi.boolean()
}).unknown(true);

/** validation keys and properties of plan for updation */
exports.updateSchemaKeys = joi.object({
	name: joi.string().allow(null).allow(''),
	credits: joi.number().integer().allow(0),
	validity: joi.object({text:joi.string(),days:joi.number().integer()}).allow(0),
	amount: joi.number().integer().allow(0),
	currency: joi.string().allow(null).allow(''),
	isDeleted: joi.boolean(),
	isActive: joi.boolean(),
	_id: joi.string().regex(/^[0-9a-fA-F]{24}$/)
}).unknown(true);

let keys = ['query', 'where'];
/** validation keys and properties of plan for filter documents from collection */
exports.findFilterKeys = joi.object({
	options: options,
	...Object.fromEntries(
		keys.map(key => [key, joi.object({
	name: joi.alternatives().try(joi.array().items(),joi.string(),joi.object()),
	credits: joi.alternatives().try(joi.array().items(),joi.number().integer(),joi.object()),
	validity: joi.alternatives().try(joi.array().items(),joi.number().integer(),joi.object()),
	amount: joi.alternatives().try(joi.array().items(),joi.number().integer(),joi.object()),
	currency: joi.alternatives().try(joi.array().items(),joi.string(),joi.object()),
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
