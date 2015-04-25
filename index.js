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
function operator(op, input) {
    var args = [];
    for (var _i = 2; _i < arguments.length; _i++) {
        args[_i - 2] = arguments[_i];
    }
    if (_.isFunction(input)) {
        return function (i, c) {
            return operator.apply(void 0, [op, input(i, c)].concat(args));
        };
    }
    else if (typeof input === "undefined") {
        return function (i) {
            return operator.apply(void 0, [op, i].concat(args));
        };
    }
    return op.apply(void 0, [input].concat(args));
}
exports.operator = operator;
function required(input, isNot) {
    if (isNot === void 0) { isNot = false; }
    return operator(function (input, isNot) {
        if (input == isNot) {
            throw "This field is required";
        }
        return input;
    }, input, isNot);
}
exports.required = required;
function min(val, input) {
    return operator(function (input, val) {
        if (input <= val) {
            throw "Value must be at least: " + val;
        }
        return input;
    }, input, val);
}
exports.min = min;
function max(val, input) {
    return operator(function (input, val) {
        if (input >= val) {
            throw "Value must not be greater than: " + val;
        }
        return input;
    }, input, val);
}
exports.max = max;
function between(min, max, input) {
    return operator(function (input) {
        if (input <= min || input >= max) {
            throw "Value must be between " + min + " and " + max;
        }
        return input;
    }, input);
}
exports.between = between;
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
    if (_.isString(input)) {
        return input;
    }
    throw "Must be a string";
}
exports.isString = isString;
function isInteger(input) {
    if (_.isString(input) && /^\d+$/.exec(input)) {
        return parseInt(input) || 0;
    }
    else if (_.isNumber(input) && parseInt(input) === input) {
        return input;
    }
    throw "Must be an integer";
}
exports.isInteger = isInteger;
function isFloat(input) {
    if (_.isString(input) && /^\d+(\.\d+)?$/.exec(input)) {
        return parseFloat(input) || 0.0;
    }
    else if (_.isNumber(input)) {
        return input;
    }
    throw "Must be an decimal number";
}
exports.isFloat = isFloat;
var FuncValidator = (function () {
    function FuncValidator(func, parent) {
        this.func = func;
    }
    FuncValidator.prototype._callFunc = function (val, context) {
        try {
            var res = this.func(val, context);
        }
        catch (e) {
            return Q.reject({ "": [e] });
        }
        if (_.isObject(res) && _.isFunction(res.then) && _.isFunction(res.catch)) {
            var deferred = Q.defer();
            res.then(function (i) { return deferred.resolve(i); })
                .catch(function (er) { return deferred.reject({ "": [er] }); });
            return deferred.promise;
        }
        return Q.resolve(res);
    };
    FuncValidator.prototype.validatePath = function (oldValue, path, newValue, context) {
        if (path !== "") {
            return Q.reject({ "": ["Function validator does not recognize this path:" + path] });
        }
        return this._callFunc(newValue, context);
    };
    FuncValidator.prototype.validate = function (value) {
        return this._callFunc(value);
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
