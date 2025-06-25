"use strict";
var __extends = (this && this.__extends) || (function () {
    var extendStatics = function (d, b) {
        extendStatics = Object.setPrototypeOf ||
            ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
            function (d, b) { for (var p in b) if (Object.prototype.hasOwnProperty.call(b, p)) d[p] = b[p]; };
        return extendStatics(d, b);
    };
    return function (d, b) {
        if (typeof b !== "function" && b !== null)
            throw new TypeError("Class extends value " + String(b) + " is not a constructor or null");
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.Schema = void 0;
exports.Of = Of;
function Of(opts) {
    return {
        value: undefined,
        default: opts.default,
        is: opts.is,
    };
}
// --------------------
// Schema
// --------------------
var Schema = /** @class */ (function () {
    function Schema(input) {
        var schema = this.constructor._schema;
        var fields = {};
        var _loop_1 = function (key, fieldDef) {
            // Determine supplied value; fall back to default when omitted/undefined
            var supplied = input[key];
            var def = fieldDef.default;
            var value = supplied !== undefined
                ? supplied
                : typeof def === "function"
                    ? def()
                    : def;
            var field = {
                value: value,
                is: fieldDef.is,
                // Preserve the original default (value or callable) verbatim
                default: fieldDef.default,
            };
            fields[key] = field;
            Object.defineProperty(this_1, key, {
                get: function () { return field.value; },
                set: function (val) {
                    field.value = val;
                },
                enumerable: true,
            });
        };
        var this_1 = this;
        for (var _i = 0, _a = Object.entries(schema); _i < _a.length; _i++) {
            var _b = _a[_i], key = _b[0], fieldDef = _b[1];
            _loop_1(key, fieldDef);
        }
        this._fields = fields;
    }
    Schema.from = function (schema) {
        var ModelWithSchema = /** @class */ (function (_super) {
            __extends(ModelWithSchema, _super);
            function ModelWithSchema() {
                return _super !== null && _super.apply(this, arguments) || this;
            }
            ModelWithSchema._schema = schema;
            return ModelWithSchema;
        }(Schema));
        return ModelWithSchema;
    };
    /**
     * Static constructor with built-in validation and aggregated error
     * reporting.
     */
    Schema.tryNew = function (input) {
        var instance = new this(input);
        var validationErrors = instance.validate();
        if (validationErrors.length === 0) {
            // success path
            return { val: instance, errs: undefined };
        }
        // failure path – build ErrLog with undefined for each field first
        var errLog = Object.keys(this._schema).reduce(function (acc, key) {
            // initialise all expected keys
            acc[key] = undefined;
            return acc;
        }, {});
        // populate messages parsed from "<key>: <message>" strings
        for (var _i = 0, validationErrors_1 = validationErrors; _i < validationErrors_1.length; _i++) {
            var raw = validationErrors_1[_i];
            var idx = raw.indexOf(": ");
            if (idx !== -1) {
                var key = raw.slice(0, idx);
                var msg = raw.slice(idx + 2);
                errLog[key] = msg;
            }
        }
        // expose complete list of messages
        errLog.summarize = function () { return validationErrors.slice(); };
        return { val: undefined, errs: errLog };
    };
    Schema.prototype.validate = function () {
        var schema = this.constructor._schema;
        var errors = [];
        for (var key in schema) {
            var field = this._fields[key];
            var is = field.is;
            if (is && field.value !== undefined && field.value !== null) {
                var result = is(field.value);
                if (result !== true)
                    errors.push("".concat(key, ": ").concat(result));
            }
        }
        return errors;
    };
    Schema.prototype.toJSON = function () {
        var json = {};
        for (var key in this._fields) {
            json[key] = this._fields[key].value;
        }
        return json;
    };
    return Schema;
}());
exports.Schema = Schema;
