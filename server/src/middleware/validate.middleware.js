export function validate(schema, source = "body") {
  return (req, _res, next) => {
    const parsed = schema.parse(req[source]);

    if (source === "query") {
      req.validatedQuery = parsed;
    } else if (source === "params") {
      req.validatedParams = parsed;
    } else {
      req[source] = parsed;
    }

    next();
  };
}
