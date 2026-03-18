"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.parseLogSearch = parseLogSearch;
const SUPPORTED_FILTER_KEYS = new Set(["level", "service"]);
function parseLogSearch(input) {
    const raw = input.trim();
    if (raw.length === 0) {
        return {
            text: "",
            filters: {}
        };
    }
    const tokens = raw.split(/\s+/);
    const textTokens = [];
    const filters = {};
    for (const token of tokens) {
        const separatorIndex = token.indexOf(":");
        if (separatorIndex <= 0 || separatorIndex === token.length - 1) {
            textTokens.push(token);
            continue;
        }
        const key = token.slice(0, separatorIndex).toLowerCase();
        const value = token.slice(separatorIndex + 1).trim();
        if (!SUPPORTED_FILTER_KEYS.has(key) || value.length === 0) {
            textTokens.push(token);
            continue;
        }
        if (key === "level") {
            filters.level = value;
            continue;
        }
        filters.service = value;
    }
    return {
        text: textTokens.join(" ").trim(),
        filters
    };
}
