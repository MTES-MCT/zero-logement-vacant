import joi from 'joi';

function validate<T>(schema: joi.Schema<T>) {
  return (value: T): T => {
    return joi.attempt(value, schema, {
      abortEarly: true,
      convert: true,
      presence: 'required',
      stripUnknown: true,
    });
  };
}

const validator = {
  validate,
};

export default validator;
