import { defineConfig } from "orval";

import {
    transformReqOnly,
    transformRespOnly,
} from "./src/api/internal/openapi-transformer";

export default defineConfig({
    /**
     * Request-side models (camelCase fields after transformer)
     * Output: src/api/models/req/*.ts
     */
    modelsReq: {
        input: {
            target: "../docs/api/openapi.json",
            override: { transformer: transformReqOnly },
        },
        output: {
            mode: "single",
            client: "fetch",
            // Orval requires target; postprocess script deletes src/api/.orval entirely.
            target: "src/api/.orval/models-req.ts",
            schemas: {
                path: "src/api/models/req",
                type: "typescript",
            },
            namingConvention: "kebab-case",
            clean: true,
            override: {
                mutator: {
                    path: "src/api/internal/case-fetch.ts",
                    name: "customFetch",
                },
            },
        },
    },

    /**
     * Response-side models (camelCase fields after transformer)
     * Output: src/api/models/resp/*.ts
     */
    modelsResp: {
        input: {
            target: "../docs/api/openapi.json",
            override: { transformer: transformRespOnly },
        },
        output: {
            mode: "single",
            client: "fetch",
            target: "src/api/.orval/models-resp.ts",
            schemas: {
                path: "src/api/models/resp",
                type: "typescript",
            },
            namingConvention: "kebab-case",
            clean: true,
            override: {
                mutator: {
                    path: "src/api/internal/case-fetch.ts",
                    name: "customFetch",
                },
            },
        },
    },

    /**
     * Request-body Zod schemas only (camelCase fields after transformer)
     * Output: src/api/schemas/*.zod.ts
     */
    schemasReqZod: {
        input: {
            target: "../docs/api/openapi.json",
            override: { transformer: transformReqOnly },
        },
        output: {
            mode: "single",
            client: "fetch",
            target: "src/api/.orval/schemas-req.ts",
            schemas: {
                path: "src/api/schemas",
                type: "zod",
            },
            namingConvention: "kebab-case",
            clean: true,
            override: {
                mutator: {
                    path: "src/api/internal/case-fetch.ts",
                    name: "customFetch",
                },
                components: {
                    schemas: {
                        suffix: "Schema", // ResetPasswordRequest -> ResetPasswordRequestSchema
                    },
                },
            },
        },
    },
});
