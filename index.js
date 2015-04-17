/***
 * Copyright (C) Jari Pennanen, 2015
 * See LICENSE for copying
 */
/// <reference path="typings/lodash/lodash.d.ts" />
/// <reference path="typings/q/Q.d.ts" />
var _ = require("lodash");
var Q = require("q");
function buildValidator(validFunc, parent) {
    if (_.isFunction(validFunc)) {
        return new FuncValidator(validFunc, parent);
    }
    else if (_.isObject(validFunc) && _.isFunction(validFunc.validate) && _.isFunction(validFunc.validatePath)) {
        return validFunc;
    }
    else if (_.isPlainObject(validFunc)) {
        var validFuncCopy = {};
        _.each(validFunc, function (v, k) {
            validFuncCopy[k] = buildValidator(v);
        });
        return new ObjectValidator(validFuncCopy);
    }
    else if (_.isArray(validFunc) && validFunc.length === 1) {
        return new ArrayValidator(buildValidator(validFunc[0]));
    }
    throw "Validator is not defined for this field";
}
function validator(defs) {
    return buildValidator(defs);
}
exports.validator = validator;
function required(input, isNot) {
    if (isNot === void 0) { isNot = false; }
    if (_.isFunction(input)) {
        return function (i, c) {
            return required(input(i, c));
        };
    }
    if (input == isNot) {
        throw "This field is required";
    }
    return input;
}
exports.required = required;
function string(input) {
    return "" + input;
}
exports.string = string;
function integer(input) {
    return parseInt("" + input) || 0;
}
exports.integer = integer;
function float(input) {
    return parseFloat("" + input) || 0.0;
}
exports.float = float;
function isString(input) {
    if (!_.isString(input)) {
        throw "Must be a string";
    }
    return input;
}
exports.isString = isString;
function isInteger(input) {
    if (_.isString(input) && !/\d+/.exec(input) ||
        _.isNumber(input) && parseInt(input) !== input) {
        throw "Must be an integer";
    }
    return parseInt("" + input) || 0;
}
exports.isInteger = isInteger;
function isFloat(input) {
    if (_.isString(input) && !/\d+(\.\d+)?/.exec(input)) {
        throw "Must be an decimal number";
    }
    return parseFloat("" + input) || 0.0;
}
exports.isFloat = isFloat;
var FuncValidator = (function () {
    function FuncValidator(func, parent) {
        this.func = func;
    }
    FuncValidator.prototype.validatePath = function (oldValue, path, newValue, context) {
        if (path !== "") {
            return Q.reject({ "": ["Function validator does not recognize this path:" + path] });
        }
        var deferred = Q.defer();
        try {
            return Q.resolve(this.func(newValue, context));
        }
        catch (e) {
            return Q.reject({ "": [e] });
        }
    };
    FuncValidator.prototype.validate = function (value) {
        var copy = _.cloneDeep(value), deferred = Q.defer();
        try {
            deferred.resolve(this.func(copy));
        }
        catch (e) {
            deferred.reject({ "": [e] });
        }
        return deferred.promise;
    };
    return FuncValidator;
})();
exports.FuncValidator = FuncValidator;
var objectRegExp = /^([^\.\[\]]+)[\.]?(.*)/;
var ObjectValidator = (function () {
    function ObjectValidator(fields) {
        this.fields = fields;
    }
    ObjectValidator.prototype.validatePath = function (oldValue, path, newValue, context) {
        if (path === "") {
            return this.validate(newValue);
        }
        var m = objectRegExp.exec(path);
        if (!m) {
            return Q.reject({ "": "Object validator does not recognize this path: " + path });
        }
        var deferred = Q.defer(), field = m[1], remaining = m[2], fieldValidator = this.fields[field], oldFieldValue = oldValue[field];
        fieldValidator.validatePath(oldFieldValue, remaining, newValue, context).then(function (res) {
            var fieldErrors = {}, value = _.cloneDeep(oldValue);
            value[field] = res;
            deferred.resolve(value);
        }).catch(function (errors) {
            var fieldErrors = {};
            _.each(errors, function (v, k) {
                fieldErrors[field + (k.length > 0 && k[0] !== "[" ? "." + k : k)] = v;
            });
            deferred.reject(fieldErrors);
        });
        return deferred.promise;
    };
    ObjectValidator.prototype.validate = function (object) {
        var self = this, defer = Q.defer(), dfields = [], copy = _.pick(_.cloneDeep(object), _.keys(this.fields)), errors = {};
        _.each(this.fields, function (v, k) {
            var p = self.validatePath(object, k, object[k], object);
            dfields.push(p);
            p.then(function (res) {
                copy[k] = res[k];
            }).catch(function (part_errors) {
                _.assign(errors, part_errors);
            });
        });
        Q.all(dfields).then(function (resz) {
            defer.resolve(copy);
        }).catch(function (errs) {
            defer.reject(errors);
        });
        return defer.promise;
    };
    return ObjectValidator;
})();
exports.ObjectValidator = ObjectValidator;
var arrayIndexRegExp = /^\[(\d+)\](.*)/;
var ArrayValidator = (function () {
    function ArrayValidator(validator) {
        this.validator = validator;
    }
    ArrayValidator.prototype.validatePath = function (oldValue, path, newValue, context) {
        if (path === "") {
            return this.validate(newValue);
        }
        var m = arrayIndexRegExp.exec(path);
        if (!m) {
            throw "Array validator does not recognize this path: " + path;
        }
        var deferred = Q.defer(), field = m[1], remaining = m[2];
        this.validator.validatePath(oldValue, remaining, newValue, context).then(function (res) {
            deferred.resolve(res);
        }).catch(function (err) {
            var fieldErrors = {}, indexAccessor = "[" + field + "]";
            _.each(err, function (v, k) {
                fieldErrors[indexAccessor + (k.length > 0 && k[0] !== "[" ? "." + k : k)] = v;
            });
            deferred.reject(fieldErrors);
        });
        return deferred.promise;
    };
    ArrayValidator.prototype.validate = function (arr) {
        var self = this, defer = Q.defer(), dfields = [], copy = [], errors = {};
        _.each(arr, function (v, k) {
            var p = self.validatePath(arr[k], "[" + k + "]", v, arr);
            dfields.push(p);
            p.then(function (res) {
                copy[k] = res;
            }).catch(function (err) {
                _.assign(errors, err);
            });
        });
        Q.all(dfields).then(function (resz) {
            defer.resolve(copy);
        }).catch(function (errs) {
            defer.reject(errors);
        });
        return defer.promise;
    };
    return ArrayValidator;
})();
exports.ArrayValidator = ArrayValidator;
