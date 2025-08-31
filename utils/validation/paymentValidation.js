/**
 * paymentValidation.js
 * @description :: validate each post and put request as per payment model
 */

const joi = require("joi");
const { options, isCountOnly, populate, select } = require('./commonFilterValidation');

/** validation keys and properties of payment */
exports.schemaKeys = joi.object({
	user: joi.string().regex(/^[0-9a-fA-F]{24}$/).allow(null).allow(''),
	workspace: joi.string().regex(/^[0-9a-fA-F]{24}$/).allow(null).allow(''),
	data: joi.string().allow(null).allow(''),
	status: joi.string().allow(null).allow(''),
	is_subscription: joi.boolean().default(false),
	currency: joi.string().allow(null).allow(''),
	platform: joi.string().allow(null).allow(''),
	location: joi.any(),
	ip: joi.string().allow(null).allow(''),
	isDeleted: joi.boolean(),
	isActive: joi.boolean()
}).unknown(true);

/** validation keys and properties of payment for updation */
exports.updateSchemaKeys = joi.object({
	user: joi.string().regex(/^[0-9a-fA-F]{24}$/).allow(null).allow(''),
	workspace: joi.string().regex(/^[0-9a-fA-F]{24}$/).allow(null).allow(''),
	data: joi.string().allow(null).allow(''),
	status: joi.string().allow(null).allow(''),
	is_subscription: joi.boolean().default(false),
	currency: joi.string().allow(null).allow(''),
	platform: joi.string().allow(null).allow(''),
	location: joi.any(),
	ip: joi.string().allow(null).allow(''),
	isDeleted: joi.boolean(),
	isActive: joi.boolean(),
	_id: joi.string().regex(/^[0-9a-fA-F]{24}$/)
}).unknown(true);

let keys = ['query', 'where'];
/** validation keys and properties of payment for filter documents from collection */
exports.findFilterKeys = joi.object({
	options: options,
	...Object.fromEntries(
		keys.map(key => [key, joi.object({
	user: joi.alternatives().try(joi.array().items(),joi.string().regex(/^[0-9a-fA-F]{24}$/),joi.object()),
	workspace: joi.alternatives().try(joi.array().items(),joi.string().regex(/^[0-9a-fA-F]{24}$/),joi.object()),
	data: joi.alternatives().try(joi.array().items(),joi.string(),joi.object()),
	status: joi.alternatives().try(joi.array().items(),joi.string(),joi.object()),
	is_subscription: joi.alternatives().try(joi.array().items(),joi.boolean(),joi.object()),
	currency: joi.alternatives().try(joi.array().items(),joi.string(),joi.object()),
	platform: joi.alternatives().try(joi.array().items(),joi.string(),joi.object()),
	location: joi.alternatives().try(joi.array().items(),joi.any(),joi.object()),
	ip: joi.alternatives().try(joi.array().items(),joi.string(),joi.object()),
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
