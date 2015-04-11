/***
 * Copyright (C) Jari Pennanen, 2015
 * See LICENSE for copying
 */
/// <reference path="typings/lodash/lodash.d.ts" />
/// <reference path="typings/q/Q.d.ts" />
var _ = require("lodash");
var Q = require("q");
function getValidator(validFunc, parent) {
    if (_.isFunction(validFunc)) {
        return new FuncValidator(validFunc, parent);
    }
    else if (_.isObject(validFunc) && "validate" in validFunc) {
        return validFunc;
    }
    if (_.isPlainObject(validFunc)) {
        var validFuncCopy = _.cloneDeep(validFunc);
        _.each(validFuncCopy, function (v, k) {
            validFuncCopy[k] = getValidator(v);
        });
        return new ObjectValidator(validFuncCopy);
    }
    else if (_.isArray(validFunc) && validFunc.length === 1) {
        return new ArrayValidator(getValidator(validFunc[0]));
    }
    throw "Validator is not defined for this field";
}
function validator(defs) {
    return getValidator(defs);
}
exports.validator = validator;
function required(input, isNot) {
    if (isNot === void 0) { isNot = false; }
    if (input == isNot) {
        throw "This field is required";
    }
    return input;
}
exports.required = required;
function str(input) {
    return "" + input;
}
exports.str = str;
function integer(input) {
    return parseInt("" + input) || 0;
}
exports.integer = integer;
function float(input) {
    return parseFloat("" + input) || 0.0;
}
exports.float = float;
function getUsingDotArrayNotation(object, notation) {
    var objectGetter = object, objectTrail = "", arrayTrail = "", inArray = false;
    for (var i = 0; i < notation.length; i++) {
        var char = notation[i], next = notation[i + 1];
        if (char === "[") {
            arrayTrail = "";
            inArray = true;
            continue;
        }
        else if (char === "]") {
            inArray = false;
            objectGetter = objectGetter[parseInt(arrayTrail)];
            objectTrail = "";
            continue;
        }
        if (inArray) {
            arrayTrail += char;
            continue;
        }
        if (char !== ".") {
            objectTrail += char;
        }
        if (next === "." || typeof next === "undefined") {
            objectGetter = objectGetter[objectTrail];
            objectTrail = "";
        }
    }
    return objectGetter;
}
exports.getUsingDotArrayNotation = getUsingDotArrayNotation;
function setUsingDotArrayNotation(object, notation, val) {
    var o = _.cloneDeep(object), objectSetter = o, objectTrail = "", arrayTrail = "", inArray = false;
    for (var i = 0; i < notation.length; i++) {
        var char = notation[i], next = notation[i + 1];
        if (char === "[") {
            inArray = true;
            continue;
        }
        else if (char === "]") {
            inArray = false;
            if (typeof next === "undefined") {
                objectSetter[parseInt(arrayTrail)] = val;
            }
            objectSetter = objectSetter[parseInt(arrayTrail)];
            objectTrail = "";
            continue;
        }
        if (inArray) {
            arrayTrail += char;
            continue;
        }
        if (char !== ".") {
            objectTrail += char;
        }
        if (typeof next === "undefined") {
            objectSetter[objectTrail] = val;
        }
        else if (next === ".") {
            objectSetter = objectSetter[objectTrail];
            objectTrail = "";
        }
    }
    return o;
}
exports.setUsingDotArrayNotation = setUsingDotArrayNotation;
var FuncValidator = (function () {
    function FuncValidator(func, parent) {
        this.func = func;
    }
    FuncValidator.prototype.validatePath = function (oldValue, path, newValue, context) {
        var deferred = Q.defer();
        try {
            if (path !== "") {
                throw "Func validator does not support this path: " + path;
            }
            deferred.resolve({
                isValid: true,
                errors: {},
                value: this.func(newValue, context)
            });
        }
        catch (e) {
            deferred.resolve({
                isValid: false,
                errors: { "": [e] },
                value: oldValue
            });
        }
        return deferred.promise;
    };
    FuncValidator.prototype.validate = function (value) {
        var copy = _.cloneDeep(value), deferred = Q.defer();
        try {
            deferred.resolve({
                isValid: true,
                errors: {},
                value: this.func(copy)
            });
        }
        catch (e) {
            deferred.resolve({
                isValid: false,
                errors: { "": [e] },
                value: copy
            });
        }
        return deferred.promise;
    };
    return FuncValidator;
})();
exports.FuncValidator = FuncValidator;
var objectRegExp = new RegExp('^([^\\.\\[\\]]+)[\\.]?(.*)');
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
            return Q.reject({
                isValid: false,
                value: oldValue,
                errors: { "": "Object validator does not recgonize this path: " + path }
            });
        }
        var deferred = Q.defer(), field = m[1], remaining = m[2], fieldValidator = this.fields[field], oldFieldValue = oldValue[field];
        fieldValidator.validatePath(oldFieldValue, remaining, newValue, context).then(function (res) {
            var fieldErrors = {};
            _.each(res.errors, function (v, k) {
                fieldErrors[field + (k.length > 0 && k[0] !== "[" ? "." + k : k)] = v;
            });
            deferred.resolve({
                isValid: res.isValid,
                value: res.isValid ? setUsingDotArrayNotation(oldValue, field, res.value) : oldValue,
                errors: fieldErrors
            });
        });
        return deferred.promise;
    };
    ObjectValidator.prototype.validate = function (object) {
        var self = this, defer = Q.defer(), dfields = [], copy = _.cloneDeep(object), errors = {};
        _.each(object, function (v, k) {
            var p = self.validatePath(object, k, v, object);
            dfields.push(p);
            p.then(function (res) {
                if (res.isValid) {
                    copy[k] = res.value[k];
                }
                _.each(res.errors, function (v, k) {
                    errors[k] = v;
                });
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
var arrayIndexRegExp = new RegExp('^\\[(\\d+)\\](.*)');
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
            throw "Array validator does not recgonize this path: " + path;
        }
        var deferred = Q.defer(), field = m[1], remaining = m[2];
        this.validator.validatePath(oldValue, remaining, newValue, context).then(function (res) {
            var fieldErrors = {}, indexAccessor = "[" + field + "]";
            _.each(res.errors, function (v, k) {
                fieldErrors[indexAccessor + (k.length > 0 && k[0] !== "[" ? "." + k : k)] = v;
            });
            deferred.resolve({
                isValid: res.isValid,
                value: res.isValid ? res.value : oldValue,
                errors: fieldErrors
            });
        });
        return deferred.promise;
    };
    ArrayValidator.prototype.validate = function (arr) {
        var self = this, defer = Q.defer(), dfields = [], copy = [], errors = {};
        _.each(arr, function (v, k) {
            var p = self.validatePath(arr[k], "[" + k + "]", v, arr);
            dfields.push(p);
            p.then(function (res) {
                if (res.isValid) {
                    copy[k] = res.value;
                }
                _.each(res.errors, function (v, k) {
                    errors[k] = v;
                });
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
                value: isValid ? copy : arr,
                errors: errors
            });
        });
        return defer.promise;
    };
    return ArrayValidator;
})();
exports.ArrayValidator = ArrayValidator;
