import { defineConfig } from "orval";

import {
    transformReqOnly,
    transformRespOnly,
} from "./src/api/internal/openapi-transformer";

export default defineConfig({
    modelsReq: {
        input: {
            target: "../docs/api/openapi.json",
            override: { transformer: transformReqOnly },
        },
        output: {
            mode: "single",
            client: "fetch",
            target: "src/api/.orval/models-req.ts",
            schemas: {
                path: "src/api/models/req",
                type: "typescript",
            },
            namingConvention: "kebab-case",
            clean: true,
        },
    },

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
        },
    },

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
                components: {
                    schemas: { suffix: "Schema" },
                },
            },
        },
    },
});
