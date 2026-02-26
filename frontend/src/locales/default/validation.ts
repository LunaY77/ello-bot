export default {
  required: 'This field is required',
  'string.min': 'Must be at least {{min}} characters',
  'string.max': 'Must be at most {{max}} characters',
  'string.url': 'Must be a valid URL',
  'string.email': 'Must be a valid email address',
  'string.nonempty': 'This field cannot be empty',
  'number.min': 'Must be at least {{min}}',
  'number.max': 'Must be at most {{max}}',
  'number.int': 'Must be an integer',
  invalidType: 'Expected {{expected}}, received {{received}}',
  invalid: 'Invalid value',
} as const;
