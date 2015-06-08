/***
 * Copyright (C) Jari Pennanen, 2015
 * See LICENSE for copying
 */
/// <reference path="./typings/lodash/lodash.d.ts" />
/// <reference path="./typings/q/Q.d.ts" />
var _ = require('lodash');
var Q = require('q');
function func(func) {
    return new ImplFuncValidator(func);
}
exports.func = func;
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
        if (input < val) {
            throw "Value must be equal or greater than: " + val;
        }
        return input;
    }, input, val);
}
exports.min = min;
function minExclusive(val, input) {
    return operator(function (input, val) {
        if (input <= val) {
            throw "Value must be greater than: " + val;
        }
        return input;
    }, input, val);
}
exports.minExclusive = minExclusive;
function max(val, input) {
    return operator(function (input, val) {
        if (input > val) {
            throw "Value must be equal or less than: " + val;
        }
        return input;
    }, input, val);
}
exports.max = max;
function maxExclusive(val, input) {
    return operator(function (input, val) {
        if (input >= val) {
            throw "Value must be less than: " + val;
        }
        return input;
    }, input, val);
}
exports.maxExclusive = maxExclusive;
function between(min, max, input) {
    return operator(function (input) {
        if (input < min || input > max) {
            throw "Value must be between " + min + " and " + max;
        }
        return input;
    }, input);
}
exports.between = between;
function betweenExclusive(min, max, input) {
    return operator(function (input) {
        if (input <= min || input >= max) {
            throw "Value must exclusively be between " + min + " and " + max;
        }
        return input;
    }, input);
}
exports.betweenExclusive = betweenExclusive;
function string(input) {
    return typeof input !== "undefined" ? "" + input : "";
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
    else if (_.isNumber(input) && (input | 0) === input) {
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
function getValidator(v) {
    if (_.isFunction(v)) {
        return new ImplFuncValidator(v);
    }
    else if (_.isObject(v) &&
        _.isFunction(v.validate) &&
        _.isFunction(v.validatePath)) {
        return v;
    }
    throw "Validator is not defined for this field";
}
function object(defs, context) {
    return new ImplObjectValidator(_.mapValues(defs, function (v) { return getValidator(v); }));
}
exports.object = object;
function array(def) {
    return new ImplArrayValidator(getValidator(def));
}
exports.array = array;
var ImplFuncValidator = (function () {
    function ImplFuncValidator(func, parent) {
        this.func = func;
    }
    ImplFuncValidator.prototype._callFunc = function (val, context) {
        try {
            var res = this.func(val, context);
        }
        catch (e) {
            return Q.reject({ "": [e] });
        }
        if (_.isObject(res) && _.isFunction(res.then) && _.isFunction(res.catch)) {
            var deferred = Q.defer();
            res
                .then(function (i) { return deferred.resolve(i); })
                .catch(function (er) { return deferred.reject({ "": [er] }); })
                .progress(function (n) { return deferred.notify({ "": n }); });
            return deferred.promise;
        }
        return Q.resolve(res);
    };
    ImplFuncValidator.prototype.validatePath = function (path, oldValue, newValue, context) {
        if (path !== "") {
            return Q.reject({ "": ["Function validator does not recognize this path:" + path] });
        }
        return this._callFunc(newValue, context);
    };
    ImplFuncValidator.prototype.validate = function (value) {
        return this._callFunc(value);
    };
    return ImplFuncValidator;
})();
var objectRegExp = /^([^\.\[\]]+)[\.]?(.*)/;
var ImplObjectValidator = (function () {
    function ImplObjectValidator(fields) {
        this.fields = fields;
    }
    ImplObjectValidator.prototype.validatePath = function (path, oldValue, newValue, context) {
        if (path === "") {
            return this.validate(newValue);
        }
        var m = objectRegExp.exec(path);
        if (!m) {
            return Q.reject({ "": "Object validator does not recognize this path: " + path });
        }
        var deferred = Q.defer(), field = m[1], remaining = m[2], fieldValidator = this.fields[field], oldFieldValue = oldValue[field];
        fieldValidator.validatePath(remaining, oldFieldValue, newValue, context).then(function (res) {
            var fieldErrors = {}, value = _.cloneDeep(oldValue);
            value[field] = res;
            deferred.resolve(value);
        }).catch(function (errors) {
            var fieldErrors = {};
            _.each(errors, function (v, k) {
                fieldErrors[field + (k.length > 0 && k[0] !== "[" ? "." + k : k)] = v;
            });
            deferred.reject(fieldErrors);
        }).progress(function (s) {
            var state = {};
            _.each(s, function (v, k) {
                state[field + (k.length > 0 && k[0] !== "[" ? "." + k : k)] = v;
            });
            deferred.notify(state);
        });
        return deferred.promise;
    };
    ImplObjectValidator.prototype.validate = function (object) {
        if (!_.isObject(object)) {
            object = {};
        }
        var self = this, defer = Q.defer(), dfields = [], copy = _.pick(_.cloneDeep(object), _.keys(this.fields)), errors = {};
        _.each(this.fields, function (v, k) {
            var p = self.validatePath(k, object, object[k], object);
            dfields.push(p);
            p.then(function (res) {
                copy[k] = res[k];
            }).catch(function (part_errors) {
                _.assign(errors, part_errors);
            }).progress(function (p) {
                defer.notify(p);
            });
        });
        Q.all(dfields).then(function (resz) {
            defer.resolve(copy);
        }).catch(function (errs) {
            defer.reject(errors);
        });
        return defer.promise;
    };
    return ImplObjectValidator;
})();
var arrayIndexRegExp = /^\[(\d+)\](.*)/;
var ImplArrayValidator = (function () {
    function ImplArrayValidator(validator) {
        this.validator = validator;
    }
    ImplArrayValidator.prototype.validatePath = function (path, oldValue, newValue, context) {
        if (path === "") {
            return this.validate(newValue);
        }
        var m = arrayIndexRegExp.exec(path);
        if (!m) {
            throw "Array validator does not recognize this path: " + path;
        }
        var deferred = Q.defer(), field = m[1], remaining = m[2];
        this.validator.validatePath(remaining, oldValue, newValue, context).then(function (res) {
            deferred.resolve(res);
        }).catch(function (err) {
            var fieldErrors = {}, indexAccessor = "[" + field + "]";
            _.each(err, function (v, k) {
                fieldErrors[indexAccessor + (k.length > 0 && k[0] !== "[" ? "." + k : k)] = v;
            });
            deferred.reject(fieldErrors);
        }).progress(function (s) {
            var state = {}, indexAccessor = "[" + field + "]";
            _.each(s, function (v, k) {
                state[indexAccessor + (k.length > 0 && k[0] !== "[" ? "." + k : k)] = v;
            });
            deferred.notify(state);
        });
        return deferred.promise;
    };
    ImplArrayValidator.prototype.validate = function (arr) {
        if (!_.isArray(arr)) {
            arr = [];
        }
        var self = this, defer = Q.defer(), dfields = [], copy = [], errors = {};
        _.each(arr, function (v, k) {
            var p = self.validatePath("[" + k + "]", arr[k], v, arr);
            dfields.push(p);
            p.then(function (res) {
                copy[k] = res;
            }).catch(function (err) {
                _.assign(errors, err);
            }).progress(function (p) {
                defer.notify(p);
            });
        });
        Q.all(dfields).then(function (resz) {
            defer.resolve(copy);
        }).catch(function (errs) {
            defer.reject(errors);
        });
        return defer.promise;
    };
    return ImplArrayValidator;
})();
//# sourceMappingURL=index.js.map