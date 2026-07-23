import Joi from 'joi';

/**
 * Joi validation middleware
 * @param {Joi.Schema} schema - Joi schema to validate against
 * @param {string} [property='body'] - Request property to validate (body, params, query)
 */
export const validate = (schema, property = 'body') => (req, res, next) => {
  const { error, value } = schema.validate(req[property], {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    const errorMessages = error.details.map(detail => ({
      field: detail.path.join('.') || property,
      message: detail.message.replace(/["]/g, ''),
    }));

    return res.status(400).json({
      status: {
        code: 400,
        message: 'Validation failed',
      },
      data: [],
      paging: null,
      errors: errorMessages,
    });
  }

  req[property] = value;
  next();
};
