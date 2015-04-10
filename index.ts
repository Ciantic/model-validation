/***
 * Copyright (C) Jari Pennanen, 2015
 * See LICENSE for copying
 */
/// <reference path="typings/lodash/lodash.d.ts" />
/// <reference path="typings/q/Q.d.ts" />

import _ = require("lodash");
import Q = require("q");

export type errorList = string[]

export type errorMessages = {
    [name: string] : errorList
}

export interface Validator {
    validate<T>(value: T): Q.Promise<ValidationResult<T>>;
    validatePath<T>(oldValue: T, path: string, newValue?: any, context?: any): Q.Promise<ValidationResult<T>>;
}

export interface ValidationResult<T> {
    isValid: boolean
    value: T
    errors: errorMessages
}

export type validationFunction = (input: any, context?: any) => any;

export type validationDefinition =
    validationFunction | Validator | validationFunction[] | Validator[] |
    { [name: string] : (validationDefinition) };

export type objectFieldValidators = {
    [name: string] : (validationDefinition | validationDefinition[])
};

export type arrayFieldValidators = validationDefinition | validationDefinition[];

function getValidator(validFunc: any, parent?: any): Validator {
    
    if (_.isFunction(validFunc)) {
        return new FuncValidator(<validationFunction> validFunc, parent);
    } else if (_.isObject(validFunc) && "validate" in validFunc) {
        return <Validator> validFunc;
    }
    var validFuncCopy = _.cloneDeep(validFunc);
    if (_.isPlainObject(validFuncCopy)) {
        _.each(validFuncCopy, (v, k) => {
            validFuncCopy[k] = getValidator(v);
        });
        return new ObjectValidator(<{ [name: string] : validationFunction }> validFuncCopy);
    } else if (_.isArray(validFuncCopy)) {
        return null;
    }
    throw "Validator is not defined for this field";
}

export function validator(defs: validationDefinition): Validator {
    return getValidator(defs);
}

export function required(input: any, isNot: any = false): any {
    if (input == isNot) {
        throw "This field is required";
    }
    return input;
}

export function str(input: any): string {
    return "" + input;
}

export function integer(input: any): number {
    return parseInt("" + input) || 0;
}

export function float(input: any): number {
    return parseFloat("" + input) || 0.0;
}

export function getUsingDotArrayNotation(object: any, notation: string): any {
    var objectGetter = object,
        objectTrail = "",
        arrayTrail = "",
        inArray = false;
    for (var i = 0; i < notation.length; i++) {
        var char = notation[i],
            next = notation[i + 1];
        if (char === "[") {
            arrayTrail = "";
            inArray = true;
            continue;
        } else if (char === "]") {
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

export function setUsingDotArrayNotation<T>(object: T, notation: string, val: any): T {
    var o = _.cloneDeep(object),
        objectSetter = o,
        objectTrail = "",
        arrayTrail = "",
        inArray = false;
        
    for (var i = 0; i < notation.length; i++) {
        var char = notation[i],
            next = notation[i + 1];
        if (char === "[") {
            inArray = true;
            continue;
        } else if (char === "]") {
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
        } else if (next === ".") {
            objectSetter = objectSetter[objectTrail];
            objectTrail = "";
        }
    }
    // Object.freeze o here?
    return o;
}

export class FuncValidator implements Validator {
    func: validationFunction
    
    constructor(func: validationFunction, parent?: any) {
        this.func = func;
    }
    
    validatePath<T>(oldValue: T, path: string, newValue?: any, context?: any):
        Q.Promise<ValidationResult<T>>
    {
        var deferred = Q.defer<ValidationResult<T>>();
        try {
            if (path !== "") {
                throw "Func validator does not support this path: " + path
            }
            deferred.resolve({
                isValid : true,
                errors : {},
                value : this.func(newValue, context)
            });
        } catch (e) {
            deferred.resolve({
                isValid : false,
                errors : {"" : [e]},
                value : oldValue
            });
        }
            
        return deferred.promise;
    }
    
    validate<T>(value: T): Q.Promise<ValidationResult<T>> {
        var copy = _.cloneDeep(value),
            deferred = Q.defer<ValidationResult<T>>();
        
        try {
            deferred.resolve({
                isValid : true,
                errors : {},
                value : this.func(copy)
            });
        } catch (e) {
            deferred.resolve({
                isValid : false,
                errors :  {"" : [e]},
                value : copy
            });
        }
        
        return deferred.promise;
    }
}

var objectRegExp = new RegExp('^([^\\.\\[\\]]+)[\\.]?(.*)');

export class ObjectValidator implements Validator {
    public fields: objectFieldValidators
    constructor(fields: objectFieldValidators) {
        this.fields = fields;
    }
    
    validatePath<T>(oldValue: T, path: string, newValue?: any, context?: any):
        Q.Promise<ValidationResult<T>>
    {
        var deferred = Q.defer<ValidationResult<T>>();
        if (path === "") {
            this.validate(newValue).then((res) => {
                deferred.resolve({
                    isValid : res.isValid,
                    value : res.value,
                    errors : res.errors
                });
            });
            return deferred.promise;
        }
        
        var m = objectRegExp.exec(path);
        if (!m) {
            throw "Object validator does not recgonize this path: " + path;
        }
        var [, field, remaining] = m;
        var fieldValidator = <Validator> this.fields[field];
        var oldFieldValue = oldValue[field];
        fieldValidator.validatePath(oldFieldValue, remaining, newValue, context).then((res) => {
            var fieldErrors: errorMessages = {};
            _.each(res.errors, (v, k) => {
                fieldErrors[field + (k ? "." + k : "")] = v;
            });
            
            deferred.resolve({
                isValid : res.isValid,
                value : res.isValid ? setUsingDotArrayNotation(oldValue, field, res.value) : oldValue,
                errors : fieldErrors
            });
        })
        return deferred.promise;
    }
    
    validate<T>(object: T): Q.Promise<ValidationResult<T>> {
        var self = this,
            defer = Q.defer<ValidationResult<T>>(),
            dfields: Q.Promise<ValidationResult<T>>[] = [],
            copy = _.cloneDeep(object),
            errors: errorMessages = {};
        
        _.each(object, function(v, k) {
            var p = self.validatePath(object, k, v, object);
            dfields.push(p);
            p.then((res) => {
                if (res.isValid) {
                    copy[k] = res.value[k];
                }
                if (res.errors[k].length) {
                    _.assign(errors, res.errors);
                }
            });
        });
        
        // Error array filling assumes Q.all promise is resolved after all
        // individual promise callbacks has resolved
        Q.all(dfields).then((resz) => {
            var isValid = true;
            _.each(resz, (res) => {
                if (!res.isValid) {
                    isValid = false;
                }
            });
            defer.resolve({
                isValid : isValid,
                value : <T> copy,
                errors : <errorMessages> errors
            });
        });
        
        return defer.promise;
    }
}
/*
export class ArrayValidator implements Validator {
    fields: arrayFieldValidators
    constructor(fields: arrayFieldValidators) {
        this.fields = fields;
    }
    
    validate<T>(object: T): Q.Promise<ValidationResult<T>> {
        //var validFuncCandidate = getUsingDotArrayNotation(this.fields, fieldName)
        //var getValidator(this.fields, object);
        return null;
    }
}
*/
