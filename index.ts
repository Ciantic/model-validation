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

export type validationFunction = (input: any, cleaned: any) => any;

export type validationDefinition =
    validationFunction | Validator |
    { [name: string] : (validationFunction | Validator) };

export type fieldValidators = {
    [name: string] : validationDefinition
}

export interface ValidationResult<T> {
    isValid: boolean
    value: T
    errors: errorMessages
}

export function required(input: any, isNot: any = false): any {
    if (input == isNot) {
        throw "This field is required";
    }
    return input;
}

export function str(input: any, def: number = 0): string {
    return "" + input;
}

export function integer(input: any, def: number = 0): number {
    return parseInt("" + input) || def;
}

export function float(input: any, def: number = 0.0): number {
    return parseFloat("" + input) || def;
}

export interface Validator {
    validate<T>(value: T): Q.Promise<ValidationResult<T>>
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

function getValidator(validFunc: any, parent: any): Validator {
    if (_.isFunction(validFunc)) {
        return new FuncValidator(<validationFunction> validFunc, parent);
    } else if (_.isPlainObject(validFunc)) {
        return new ObjectValidator(<{ [name: string] : validationFunction }> validFunc);
    } else if (_.isArray(validFunc)) {
        return new ArrayValidator(validFunc[0]);
    } else if (_.isObject(validFunc) && "validate" in validFunc) {
        return <Validator> validFunc;
    }
    throw "Validator is not defined for this field";
}

export function validate<T>(value: T): Q.Promise<ValidationResult<T>>  {
    return null;
}

export class FuncValidator implements Validator {
    func: validationFunction
    parent: any
    constructor(func: validationFunction, parent: any) {
        this.func = func;
        this.parent = parent;
    }
    
    validate<T>(value: T): Q.Promise<ValidationResult<T>> {
        var copy = _.cloneDeep(value);
        var errors: errorMessages = {},
            isValid = false,
            deferred = Q.defer<ValidationResult<T>>();
            
        errors[""] = [];
        try {
            deferred.resolve({
                isValid : true,
                errors : {},
                value : this.func(copy, this.parent)
            });
        } catch (e) {
            errors[""].push("" + e);
            deferred.resolve({
                isValid : false,
                errors : errors,
                value : copy
            });
        }
        
        return deferred.promise;
    }
}

export class ObjectValidator implements Validator {
    public fields: fieldValidators
    constructor(fields: fieldValidators) {
        this.fields = fields;
    }
    
    validateField<T>(object: T, fieldName: string, newValue: any):
        Q.Promise<ValidationResult<T>>
    {
        var validFuncCandidate = getUsingDotArrayNotation(this.fields, fieldName);
        try {
            var validFunc = getValidator(validFuncCandidate, object);
        } catch (e) {
            var errors: errorMessages = {};
            errors[fieldName] = [e];
            return Q.resolve({
                isValid : false,
                value : object,
                errors : errors
            });
        }
        var deferred = Q.defer<ValidationResult<T>>();
        validFunc.validate(newValue).then((res) => {
            var fieldErrors: errorMessages = {};
            _.each(res.errors, (v, k) => {
                fieldErrors[fieldName + (k ? "." + k : "")] = v;
            });
            
            deferred.resolve({
                isValid : res.isValid,
                value : res.isValid ? setUsingDotArrayNotation(object, fieldName, res.value) : object,
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
            var p = self.validateField(object, k, v);
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

export class ArrayValidator implements Validator {
    fields: fieldValidators
    constructor(fields: fieldValidators) {
        this.fields = fields;
    }
    
    validate<T>(object: T): Q.Promise<ValidationResult<T>> {
        return null;
    }
}
