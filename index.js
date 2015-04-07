/// <reference path="typings/lodash/lodash.d.ts" />
/// <reference path="typings/when/when.d.ts" />
var _ = require("lodash");
var Q = require("q");
function required(input, isNot) {
    if (isNot === void 0) { isNot = null; }
    if (!input) {
        throw "This field is required";
    }
    return input;
}
exports.required = required;
function str(input, def) {
    if (def === void 0) { def = 0; }
    return "" + input;
}
exports.str = str;
function integer(input, def) {
    if (def === void 0) { def = 0; }
    return parseInt("" + input) || def;
}
exports.integer = integer;
function float(input, def) {
    if (def === void 0) { def = 0.0; }
    return parseFloat("" + input) || def;
}
exports.float = float;
function getValidator(fields, fieldName) {
    var validFunc = fields[fieldName];
    if (_.isFunction(validFunc)) {
        return validFunc;
    }
    else if (_.isPlainObject(validFunc)) {
        return new ObjectValidator(validFunc);
    }
    else if (_.isArray(validFunc)) {
        return new ArrayValidator(validFunc[0]);
    }
    throw "Validator is not defined for this field";
}
var ObjectValidator = (function () {
    function ObjectValidator(fields) {
        this.fields = fields;
    }
    ObjectValidator.prototype.validateField = function (object, fieldName, newValue) {
        var errors = {}, fieldErrors = [], isValid = false;
        errors[fieldName] = fieldErrors;
        try {
            var validFunc = getValidator(this.fields, fieldName);
        }
        catch (e) {
            fieldErrors.push(e);
            return Q.resolve({
                isValid: false,
                value: object,
                errors: errors
            });
        }
        var copy = _.cloneDeep(object);
        if (_.isObject(validFunc) && "validate" in validFunc) {
            var defer = Q.defer();
            validFunc.validate(newValue).then(function (res) {
                if (res.isValid) {
                    copy[fieldName] = res.value;
                }
                defer.resolve({
                    isValid: res.isValid,
                    value: copy,
                    errors: res.errors
                });
            });
            return defer.promise;
        }
        else {
            var res = object[fieldName];
            try {
                res = validFunc(newValue, object, errors);
            }
            catch (e) {
                errors[fieldName].push("" + e);
            }
        }
        if (_.isPlainObject(res) &&
            "isValid" in res && "value" in res && "errors" in res) {
            copy[fieldName] = res.value;
            fieldErrors.push(res.errors);
            return Q.resolve({
                isValid: res.isValid,
                value: copy,
                errors: errors
            });
        }
        else if (!errors[fieldName].length) {
            copy[fieldName] = res;
            delete errors[fieldName];
            isValid = true;
        }
        return Q.resolve({
            isValid: isValid,
            value: copy,
            errors: errors
        });
    };
    ObjectValidator.prototype.validate = function (object) {
        var self = this, defer = Q.defer(), dfields = [];
        var copy = _.cloneDeep(object), errors = {};
        _.each(object, function (v, k) {
            var p = self.validateField(object, k, v);
            dfields.push(p);
            p.then(function (res) {
                if (res.isValid) {
                    copy[k] = res.value[k];
                }
                if (res.errors[k].length) {
                    _.assign(errors, res.errors);
                }
            });
        });
        Q.all(dfields).then(function (resz) {
            var isValid = true;
            _.each(resz, function (res) {
                if (!res.isValid) {
                    isValid = false;
                }
            });
            defer.resolve({
                isValid: isValid,
                value: copy,
                errors: errors
            });
        });
        return defer.promise;
    };
    return ObjectValidator;
})();
exports.ObjectValidator = ObjectValidator;
var ArrayValidator = (function () {
    function ArrayValidator(fields) {
        this.fields = fields;
    }
    ArrayValidator.prototype.validate = function (object) {
        return null;
    };
    return ArrayValidator;
})();
exports.ArrayValidator = ArrayValidator;
