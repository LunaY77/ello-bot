import { OPENAPI_PATH, readJson, renderGeneratedFile } from './codegen-utils.mjs';

export const API_OPERATION_MODULE = 'api-operation';

const HTTP_METHOD_ORDER = ['get', 'post', 'put', 'patch', 'delete', 'options'];
const HTTP_METHODS = new Set(HTTP_METHOD_ORDER);

function toKebabCase(value) {
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .toLowerCase();
}

function toCamelCase(value) {
  return value
    .replace(/[^a-zA-Z0-9]+(.)/g, (_, char) => char.toUpperCase())
    .replace(/^[A-Z]/, (char) => char.toLowerCase());
}

function getSuccessResponseSchema(operation) {
  const responses = operation?.responses ?? {};
  for (const [status, response] of Object.entries(responses)) {
    if (!String(status).startsWith('2')) {
      continue;
    }

    return response?.content?.['application/json']?.schema;
  }

  return undefined;
}

function getRefName(ref) {
  const match = ref?.match(/^#\/components\/schemas\/(.+)$/);
  return match?.[1];
}

function unwrapNullableSchema(schema) {
  if (!schema) {
    return schema;
  }

  if (Array.isArray(schema.anyOf)) {
    const nonNull = schema.anyOf.filter((item) => item?.type !== 'null');
    if (nonNull.length === 1) {
      return unwrapNullableSchema(nonNull[0]);
    }
  }

  return schema;
}

function isResultEnvelopeSchema(schema) {
  const properties = schema?.properties;
  return Boolean(
    properties &&
      typeof properties === 'object' &&
      'data' in properties &&
      'success' in properties &&
      'code' in properties &&
      'message' in properties,
  );
}

function mergeTypeExpr(left, right) {
  return {
    imports: [...new Set([...left.imports, ...right.imports])],
    typeExpr: right.typeExpr,
  };
}

function schemaToTypeExpr(schema, schemas, importSource, seen = new Set()) {
  const normalizedSchema = unwrapNullableSchema(schema);
  if (!normalizedSchema) {
    return { imports: [], typeExpr: 'void' };
  }

  const refName = getRefName(normalizedSchema.$ref);
  if (refName) {
    if (refName === 'Result_NoneType_') {
      return { imports: [], typeExpr: 'void' };
    }

    if (seen.has(refName)) {
      return { imports: [refName], typeExpr: refName };
    }

    const refSchema = schemas?.[refName];
    if (!refSchema) {
      return { imports: [refName], typeExpr: refName };
    }

    if (isResultEnvelopeSchema(refSchema)) {
      return schemaToTypeExpr(
        refSchema.properties.data,
        schemas,
        importSource,
        new Set([...seen, refName]),
      );
    }

    const normalizedRefSchema = unwrapNullableSchema(refSchema);
    if (normalizedRefSchema?.type === 'array' && normalizedRefSchema.items) {
      return schemaToTypeExpr(
        normalizedRefSchema.items,
        schemas,
        importSource,
        new Set([...seen, refName]),
      );
    }

    return { imports: [refName], typeExpr: refName, importSource };
  }

  if (normalizedSchema.type === 'array' && normalizedSchema.items) {
    const itemType = schemaToTypeExpr(
      normalizedSchema.items,
      schemas,
      importSource,
      seen,
    );
    return {
      imports: itemType.imports,
      typeExpr: `${itemType.typeExpr}[]`,
    };
  }

  if (
    normalizedSchema.type === 'object' &&
    normalizedSchema.additionalProperties === true
  ) {
    return { imports: [], typeExpr: 'Record<string, unknown>' };
  }

  if (normalizedSchema.type === 'string') {
    return { imports: [], typeExpr: 'string' };
  }

  if (normalizedSchema.type === 'integer' || normalizedSchema.type === 'number') {
    return { imports: [], typeExpr: 'number' };
  }

  if (normalizedSchema.type === 'boolean') {
    return { imports: [], typeExpr: 'boolean' };
  }

  return { imports: [], typeExpr: 'unknown' };
}

function deriveOperationBaseName(operationId, routePath, method) {
  const normalizedPath = routePath
    .replace(/^\/+/, '')
    .replace(/[{}]/g, '')
    .replace(/[^\w/]+/g, '_')
    .replace(/\//g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '');
  const suffix = `_${normalizedPath}_${method}`;

  if (operationId.endsWith(suffix)) {
    return operationId.slice(0, -suffix.length);
  }

  return operationId;
}

function sortOperations(left, right) {
  const methodDiff =
    HTTP_METHOD_ORDER.indexOf(left.method) - HTTP_METHOD_ORDER.indexOf(right.method);
  if (methodDiff !== 0) {
    return methodDiff;
  }

  return left.path.localeCompare(right.path);
}

export async function loadOperationGroups() {
  const spec = await readJson(OPENAPI_PATH);
  const schemas = spec.components?.schemas ?? {};
  const groupsByFile = new Map();

  for (const [routePath, pathItem] of Object.entries(spec.paths ?? {})) {
    for (const [method, operation] of Object.entries(pathItem ?? {})) {
      if (!HTTP_METHODS.has(method)) {
        continue;
      }

      const tag = operation?.tags?.[0] ?? 'default';
      const fileName = toKebabCase(tag);
      const objectName = `${toCamelCase(tag)}Operations`;
      const entries = groupsByFile.get(fileName) ?? {
        fileName,
        objectName,
        operations: [],
      };

      const operationId = operation?.operationId;
      if (!operationId) {
        throw new Error(`Missing operationId for ${method.toUpperCase()} ${routePath}`);
      }

      const baseName = deriveOperationBaseName(operationId, routePath, method);
      const exportName = `${toCamelCase(baseName)}Operation`;
      const propertyName = exportName.replace(/Operation$/, '');
      const requestType = schemaToTypeExpr(
        operation?.requestBody?.content?.['application/json']?.schema,
        schemas,
        'req',
      );
      const responseType = schemaToTypeExpr(
        getSuccessResponseSchema(operation),
        schemas,
        'resp',
      );

      entries.operations.push({
        exportName,
        id: operationId,
        method,
        path: routePath,
        propertyName,
        requestTypeExpr: requestType.typeExpr,
        requestTypeImports: requestType.imports,
        responseTypeExpr: responseType.typeExpr,
        responseTypeImports: responseType.imports,
      });

      groupsByFile.set(fileName, entries);
    }
  }

  return [...groupsByFile.values()]
    .map((group) => ({
      ...group,
      operations: group.operations.sort(sortOperations),
    }))
    .sort((left, right) => left.fileName.localeCompare(right.fileName));
}

export function renderApiOperationModule() {
  return renderGeneratedFile(`
export type ApiOperationMethod =
  | 'delete'
  | 'get'
  | 'options'
  | 'patch'
  | 'post'
  | 'put';

export type ApiOperationContract<
  TResponse = unknown,
  TRequest = undefined,
  TMethod extends ApiOperationMethod = ApiOperationMethod,
  TPath extends string = string,
> = {
  readonly id: string;
  readonly method: TMethod;
  readonly path: TPath;
  readonly __responseType?: TResponse;
  readonly __requestType?: TRequest;
};

export type ApiOperationResponse<
  TOperation extends ApiOperationContract
> = TOperation extends ApiOperationContract<infer TResponse, unknown, ApiOperationMethod, string>
  ? TResponse
  : never;

export type ApiOperationRequest<
  TOperation extends ApiOperationContract
> = TOperation extends ApiOperationContract<unknown, infer TRequest, ApiOperationMethod, string>
  ? TRequest
  : never;

export const defineApiOperation = <
  TResponse,
  TRequest = void,
  TMethod extends ApiOperationMethod = ApiOperationMethod,
  TPath extends string = string,
>(
  operation: {
    id: string;
    method: TMethod;
    path: TPath;
  },
): ApiOperationContract<TResponse, TRequest, TMethod, TPath> =>
  operation as ApiOperationContract<TResponse, TRequest, TMethod, TPath>;
`);
}

export function renderOperationGroupModule(group) {
  const requestImports = [
    ...new Set(
      group.operations.flatMap((operation) => operation.requestTypeImports),
    ),
  ].sort();
  const responseImports = [
    ...new Set(
      group.operations.flatMap((operation) => operation.responseTypeImports),
    ),
  ].sort();
  const importLines = [
    requestImports.length > 0
      ? `import type { ${requestImports.join(', ')} } from '../models/req';`
      : null,
    responseImports.length > 0
      ? `import type { ${responseImports.join(', ')} } from '../models/resp';`
      : null,
    `import { defineApiOperation } from './${API_OPERATION_MODULE}';`,
  ].filter(Boolean);
  const operationLines = group.operations.flatMap((operation) => [
    `export const ${operation.exportName} = defineApiOperation<${operation.responseTypeExpr}, ${operation.requestTypeExpr}, '${operation.method}', '${operation.path}'>({`,
    `  id: '${operation.id}',`,
    `  method: '${operation.method}',`,
    `  path: '${operation.path}',`,
    `});`,
    '',
  ]);
  const objectLines = [
    `export const ${group.objectName} = {`,
    ...group.operations.map(
      (operation) => `  ${operation.propertyName}: ${operation.exportName},`,
    ),
    '} as const;',
  ];

  return renderGeneratedFile(`
${importLines.join('\n')}

${operationLines.join('\n')}
${objectLines.join('\n')}
`);
}
