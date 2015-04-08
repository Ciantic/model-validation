/// <reference path="typings/lodash/lodash.d.ts" />
/// <reference path="typings/q/Q.d.ts" />
var _ = require("lodash");
var Q = require("q");
function required(input, isNot) {
    if (isNot === void 0) { isNot = false; }
    if (input == isNot) {
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
function getUsingDotArrayNotation(object, notation) {
    var key = "", objectTrail = "", fullTrail = "";
    for (var i = 0; i < notation.length; i++) {
        var char = notation[i], next = notation.length > i ? notation[i + 1] : null;
        fullTrail += char;
        if (char !== ".") {
            objectTrail += char;
        }
        if (next === ".") {
            object = object[objectTrail];
            objectTrail = "";
        }
    }
    key = objectTrail;
    return [object[key], key, fullTrail.slice(0, -key.length)];
}
exports.getUsingDotArrayNotation = getUsingDotArrayNotation;
function setUsingDotArrayNotation(object, notation, val) {
    var o = _.cloneDeep(object), mutator = o, key = "", objectTrail = "";
    for (var i = 0; i < notation.length; i++) {
        var char = notation[i], next = notation.length > i ? notation[i + 1] : null;
        if (char !== ".") {
            objectTrail += char;
        }
        if (next === ".") {
            mutator = mutator[objectTrail];
            objectTrail = "";
        }
        if (i === notation.length - 1) {
            mutator[objectTrail] = val;
        }
    }
    return o;
}
exports.setUsingDotArrayNotation = setUsingDotArrayNotation;
function getValidator(validFunc, fieldName, object) {
    if (_.isFunction(validFunc)) {
        return new FuncValidator(validFunc, fieldName, object);
    }
    else if (_.isPlainObject(validFunc)) {
        return new ObjectValidator(validFunc);
    }
    else if (_.isArray(validFunc)) {
        return new ArrayValidator(validFunc[0]);
    }
    else if (_.isObject(validFunc) && "validate" in validFunc) {
        return validFunc;
    }
    throw "Validator is not defined for this field";
}
var FuncValidator = (function () {
    function FuncValidator(func, fieldName, object) {
        this.fieldName = fieldName;
        this.func = func;
        this.object = object;
    }
    FuncValidator.prototype.validate = function (value) {
        var copy = _.cloneDeep(this.object);
        var errors = {}, isValid = false, deferred = Q.defer();
        errors[this.fieldName] = [];
        try {
            deferred.resolve({
                isValid: true,
                errors: {},
                value: this.func(value, copy)
            });
        }
        catch (e) {
            errors[this.fieldName].push("" + e);
            deferred.resolve({
                isValid: false,
                errors: errors,
                value: copy
            });
        }
        return deferred.promise;
    };
    return FuncValidator;
})();
exports.FuncValidator = FuncValidator;
var ObjectValidator = (function () {
    function ObjectValidator(fields) {
        this.fields = fields;
    }
    ObjectValidator.prototype.validateField = function (object, fieldName, newValue) {
        var _a = getUsingDotArrayNotation(this.fields, fieldName), validFuncCandidate = _a[0], getFieldName = _a[1], getFieldPath = _a[2];
        try {
            var validFunc = getValidator(validFuncCandidate, fieldName, object);
        }
        catch (e) {
            var errors = {};
            errors[fieldName] = [e];
            return Q.resolve({
                isValid: false,
                value: object,
                errors: errors
            });
        }
        var deferred = Q.defer();
        validFunc.validate(newValue).then(function (res) {
            var fieldErrors = {};
            _.each(res.errors, function (v, k) {
                fieldErrors[getFieldPath + k] = v;
            });
            deferred.resolve({
                isValid: res.isValid,
                value: res.isValid ? setUsingDotArrayNotation(object, fieldName, res.value) : object,
                errors: res.errors
            });
        });
        return deferred.promise;
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
