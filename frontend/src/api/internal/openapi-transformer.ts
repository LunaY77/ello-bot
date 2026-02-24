/* eslint-disable @typescript-eslint/no-explicit-any */
type AnyObj = Record<string, any>;

const RESULT_PREFIX = "Result_";

function isObj(v: unknown): v is AnyObj {
    return !!v && typeof v === "object" && !Array.isArray(v);
}

function walk(node: any, fn: (obj: AnyObj) => void) {
    if (Array.isArray(node)) return node.forEach((x) => walk(x, fn));
    if (!isObj(node)) return;
    fn(node);
    Object.values(node).forEach((v) => walk(v, fn));
}

function stripExamples(spec: AnyObj) {
    walk(spec, (obj) => {
        if ("examples" in obj) delete obj.examples;
    });
}

function normalizeNullability(spec: AnyObj) {
    // anyOf: [X, null]  -> X + nullable: true (更利于生成具体 zod)
    walk(spec, (obj) => {
        const anyOf = obj.anyOf;
        if (!Array.isArray(anyOf) || anyOf.length !== 2) return;

        const [a, b] = anyOf;
        const isNull = (x: any) =>
            isObj(x) &&
            (x.type === "null" ||
                (Array.isArray(x.type) && x.type.includes("null")));
        const isNonNull = (x: any) => !isNull(x);

        if (isNull(a) && isNonNull(b)) {
            delete obj.anyOf;
            Object.assign(obj, b);
            obj.nullable = true;
        } else if (isNull(b) && isNonNull(a)) {
            delete obj.anyOf;
            Object.assign(obj, a);
            obj.nullable = true;
        }
    });
}

function removeValidationError(spec: AnyObj) {
    // remove 422 responses
    for (const pathItem of Object.values(spec.paths ?? {})) {
        if (!isObj(pathItem)) continue;
        for (const op of Object.values(pathItem)) {
            if (!isObj(op) || !isObj(op.responses)) continue;
            if (op.responses["422"]) delete op.responses["422"];
        }
    }

    // remove schemas
    const schemas = spec.components?.schemas;
    if (isObj(schemas)) {
        delete schemas.ValidationError;
        delete schemas.HTTPValidationError;
    }
}

function rewriteAndDropResultSchemas(spec: AnyObj) {
    const schemas = spec.components?.schemas;
    if (!isObj(schemas)) return;

    // dict wrapper -> AnyObject
    if (!schemas.AnyObject)
        schemas.AnyObject = { type: "object", additionalProperties: true };

    const refMap = new Map<string, string>();
    const noneResultRef = new Set<string>();

    for (const name of Object.keys(schemas)) {
        if (!name.startsWith(RESULT_PREFIX)) continue;

        const innerRaw = name.slice(RESULT_PREFIX.length).replace(/_+$/, "");
        const from = `#/components/schemas/${name}`;

        if (innerRaw === "NoneType" || innerRaw === "None") {
            noneResultRef.add(from);
            continue;
        }

        const to =
            innerRaw === "dict" || innerRaw === "Dict"
                ? "#/components/schemas/AnyObject"
                : `#/components/schemas/${innerRaw}`;

        refMap.set(from, to);
    }

    // rewrite $ref
    walk(spec, (obj) => {
        if (typeof obj.$ref !== "string") return;
        const r = obj.$ref;

        if (noneResultRef.has(r)) {
            // 对 Result_NoneType_：让上层 response content 变成空（见下方专门处理）
            return;
        }

        const replaced = refMap.get(r);
        if (replaced) obj.$ref = replaced;
    });

    // 对 Result_NoneType_ 的响应：删掉 application/json（让 client 侧是 void/无 body）
    for (const pathItem of Object.values(spec.paths ?? {})) {
        if (!isObj(pathItem)) continue;
        for (const op of Object.values(pathItem)) {
            if (!isObj(op) || !isObj(op.responses)) continue;
            for (const resp of Object.values(op.responses)) {
                if (!isObj(resp)) continue;
                const schemaRef =
                    resp.content?.["application/json"]?.schema?.$ref;
                if (schemaRef === "#/components/schemas/Result_NoneType_") {
                    delete resp.content?.["application/json"];
                    if (resp.content && Object.keys(resp.content).length === 0)
                        delete resp.content;
                }
            }
        }
    }

    // drop Result_* schemas
    for (const name of Object.keys(schemas)) {
        if (name.startsWith(RESULT_PREFIX)) delete schemas[name];
    }
}

function collectSchemaRefsFromRequestBodies(spec: AnyObj): Set<string> {
    const names = new Set<string>();
    for (const pathItem of Object.values(spec.paths ?? {})) {
        if (!isObj(pathItem)) continue;
        for (const op of Object.values(pathItem)) {
            if (!isObj(op)) continue;
            const ref =
                op.requestBody?.content?.["application/json"]?.schema?.$ref;
            const m =
                typeof ref === "string"
                    ? ref.match(/^#\/components\/schemas\/(.+)$/)
                    : null;
            if (m?.[1]) names.add(m[1]);
        }
    }
    return names;
}

function collectSchemaRefsFromSuccessResponses(spec: AnyObj): Set<string> {
    const names = new Set<string>();
    for (const pathItem of Object.values(spec.paths ?? {})) {
        if (!isObj(pathItem)) continue;
        for (const op of Object.values(pathItem)) {
            if (!isObj(op) || !isObj(op.responses)) continue;
            for (const [status, resp] of Object.entries(op.responses)) {
                if (!status.startsWith("2")) continue;
                if (!isObj(resp)) continue;
                const ref = resp.content?.["application/json"]?.schema?.$ref;
                const m =
                    typeof ref === "string"
                        ? ref.match(/^#\/components\/schemas\/(.+)$/)
                        : null;
                if (m?.[1]) names.add(m[1]);
            }
        }
    }
    return names;
}

function expandDeps(spec: AnyObj, roots: Set<string>): Set<string> {
    const schemas = spec.components?.schemas;
    if (!isObj(schemas)) return new Set(roots);

    const keep = new Set<string>(roots);
    const stack = [...roots];

    while (stack.length) {
        const cur = stack.pop()!;
        const sch = schemas[cur];
        if (!sch) continue;

        walk(sch, (obj) => {
            const ref = obj.$ref;
            const m =
                typeof ref === "string"
                    ? ref.match(/^#\/components\/schemas\/(.+)$/)
                    : null;
            if (m?.[1] && !keep.has(m[1])) {
                keep.add(m[1]);
                stack.push(m[1]);
            }
        });
    }
    return keep;
}

function pruneSchemas(spec: AnyObj, keep: Set<string>) {
    const schemas = spec.components?.schemas;
    if (!isObj(schemas)) return;
    const next: AnyObj = {};
    for (const k of keep) {
        if (schemas[k]) next[k] = schemas[k];
    }
    spec.components = spec.components ?? {};
    spec.components.schemas = next;
}

function baseTransform(input: any): AnyObj {
    const spec: AnyObj = structuredClone(input);

    // 让生成器走更稳定的 OAS3.0 路径（FastAPI 是 3.1.0）
    spec.openapi = "3.0.3";

    stripExamples(spec);
    normalizeNullability(spec);
    removeValidationError(spec);
    rewriteAndDropResultSchemas(spec);

    return spec;
}

// 只保留“请求体”相关 schemas，并清空 paths（避免生成 endpoint 代码）
export function transformReqOnly(input: any): AnyObj {
    const spec = baseTransform(input);
    const roots = collectSchemaRefsFromRequestBodies(spec);
    const keep = expandDeps(spec, roots);
    pruneSchemas(spec, keep);
    spec.paths = {}; // 只生成 models/schemas
    return spec;
}

// 只保留“响应体(2xx)”相关 schemas，并清空 paths（避免生成 endpoint 代码）
export function transformRespOnly(input: any): AnyObj {
    const spec = baseTransform(input);
    const roots = collectSchemaRefsFromSuccessResponses(spec);
    const keep = expandDeps(spec, roots);
    pruneSchemas(spec, keep);
    spec.paths = {};
    return spec;
}
