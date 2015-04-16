/***
 * Copyright (C) Jari Pennanen, 2015
 * See LICENSE for copying
 */
/// <reference path="typings/lodash/lodash.d.ts" />
/// <reference path="typings/q/Q.d.ts" />

import _ = require("lodash");
import Q = require("q");

export type ErrorMessages = {
    [name: string] : string[]
}

export interface Validator<O> {
    validate(value: O): Q.Promise<ValidationResult<O>>;
    validatePath<T>(oldValue: T, path: string, newValue?: any, context?: any): Q.Promise<ValidationResult<T>>;
}

export interface ValidationResult<T> {
    isValid: boolean
    value: T
    errors: ErrorMessages
}

export type ValidationFunction = (input: any, context?: any) => any;
/*
TODO: Does not work, recursive typing short circuits to any
      https://github.com/Microsoft/TypeScript/issues/647

export type validatorDefinition =
    ValidationFunction | Validator<any> | ValidationFunction[] | Validator<any>[] |
    ValidationFunction[][] | Validator<any>[][] |
    { [name: string] : (validatorDefinition) } |
    { [name: string] : (validatorDefinition) }[];
*/

function buildValidator<O>(validFunc: any, parent?: any): Validator<O> {
    // Is validator function
    if (_.isFunction(validFunc)) {
        return new FuncValidator<O>(<ValidationFunction> validFunc, parent);
    // Looks like a Validator
    } else if (_.isObject(validFunc) && "validate" in validFunc && "validatePath" in validFunc) {
        return <Validator<O>> validFunc;
    // Is ObjectValidator masquerading as object
    } else if (_.isPlainObject(validFunc)) {
        var validFuncCopy = _.cloneDeep(validFunc);
        _.each(validFuncCopy, (v, k) => {
            validFuncCopy[k] = buildValidator<O>(v);
        });
        return new ObjectValidator<O>(<{ [name: string] : Validator<any> }> validFuncCopy);
    // Is ArrayValidator masquerading as array
    } else if (_.isArray(validFunc) && validFunc.length === 1) {
        return <any> new ArrayValidator(<any> buildValidator(validFunc[0]));
    }
    
    throw "Validator is not defined for this field";
}

export function validator<O>(defs: any): Validator<O> {
    return <Validator<O>> buildValidator(defs);
}

export function required(input: any, isNot: any = false): any {
    if (input == isNot) {
        throw "This field is required";
    }
    return input;
}

export function string(input: any): string {
    return "" + input;
}

export function integer(input: any): number {
    return parseInt("" + input) || 0;
}

export function float(input: any): number {
    return parseFloat("" + input) || 0.0;
}

export function isString(input: any): string {
    if (!_.isString(input)) {
        throw "Must be a string"
    }
    return input;
}

export function isInteger(input: any): number {
    if (_.isString(input) && !/\d+/.exec(input) ||
        _.isNumber(input) && parseInt(input) !== input)
    {
        throw "Must be an integer"
    }
    return parseInt("" + input) || 0;
}

export function isFloat(input: any): number {
    if (_.isString(input) && !/\d+(\.\d+)?/.exec(input))
    {
        throw "Must be an decimal number"
    }
    return parseFloat("" + input) || 0.0;
}

export class FuncValidator<O> implements Validator<O> {
    func: ValidationFunction
    
    constructor(func: ValidationFunction, parent?: any) {
        this.func = func;
    }
    
    validatePath<T>(oldValue: T, path: string, newValue?: any, context?: any):
        Q.Promise<ValidationResult<T>>
    {
        if (path !== "") {
            return Q.reject<ValidationResult<T>>({
                isValid : false,
                value : oldValue,
                errors : {"" : ["Function validator does not recognize this path:" + path]}
            });
        }
        
        var deferred = Q.defer<ValidationResult<T>>();
        try {
            return Q.resolve<ValidationResult<T>>({
                isValid : true,
                errors : {},
                value : this.func(newValue, context)
            });
        } catch (e) {
            return Q.resolve<ValidationResult<T>>({
                isValid : false,
                errors : {"" : [e]},
                value : oldValue
            });
        }
    }
    
    validate(value: O): Q.Promise<ValidationResult<O>> {
        var copy = _.cloneDeep(value),
            deferred = Q.defer<ValidationResult<O>>();
        
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

var objectRegExp = /^([^\.\[\]]+)[\.]?(.*)/;

export class ObjectValidator<O> implements Validator<O> {
    public fields: { [name: string] : Validator<any> }
    
    constructor(fields: { [name: string] : Validator<any> }) {
        this.fields = fields;
    }
    
    validatePath<T>(oldValue: T, path: string, newValue?: any, context?: any):
        Q.Promise<ValidationResult<T>>
    {
        if (path === "") {
            return <any> this.validate(newValue);
        }
        
        var m = objectRegExp.exec(path);
        if (!m) {
            return Q.reject<ValidationResult<T>>({
                isValid : false,
                value : oldValue,
                errors : {"" : "Object validator does not recognize this path: " + path}
            });
        }
        
        var deferred = Q.defer<ValidationResult<T>>(),
            [, field, remaining] = m,
            fieldValidator = <Validator<any>> this.fields[field],
            oldFieldValue = oldValue[field];

        fieldValidator.validatePath(oldFieldValue, remaining, newValue, context).then((res) => {
            var fieldErrors: ErrorMessages = {},
                value = oldValue;
            _.each(res.errors, (v, k) => {
                fieldErrors[field + (k.length > 0 && k[0] !== "[" ? "." + k : k)] = v;
            });
            if (res.isValid) {
                value = _.cloneDeep(oldValue);
                value[field] = res.value;
            }
            deferred.resolve({
                isValid : res.isValid,
                value : value,
                errors : fieldErrors
            });
        })

        return deferred.promise;
    }
    
    validate(object: O): Q.Promise<ValidationResult<O>> {
        var self = this,
            defer = Q.defer<ValidationResult<O>>(),
            dfields: Q.Promise<ValidationResult<O>>[] = [],
            copy = _.pick(_.cloneDeep(object), _.keys(this.fields)),
            errors: ErrorMessages = {};
        
        _.each(this.fields, function(v, k) {
            var p = self.validatePath(object, k, object[k], object);
            dfields.push(p);
            p.then((res) => {
                if (res.isValid) {
                    copy[k] = res.value[k];
                }
                _.assign(errors, res.errors);
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
                value : <O> copy,
                errors : <ErrorMessages> errors
            });
        });
        
        return defer.promise;
    }
}

var arrayIndexRegExp = /^\[(\d+)\](.*)/;

export class ArrayValidator<O> implements Validator<O[]> {
    validator: Validator<O>
    constructor(validator: Validator<O>) {
        this.validator = validator;
    }
    
    validatePath<T>(oldValue: T, path: string, newValue?: any, context?: any):
        Q.Promise<ValidationResult<T>>
    {
        if (path === "") {
            return <any> this.validate(newValue);
        }
        
        var m = arrayIndexRegExp.exec(path);
        if (!m) {
            throw "Array validator does not recognize this path: " + path;
        }
        
        var deferred = Q.defer<ValidationResult<T>>(),
            [, field, remaining] = m;
        
        this.validator.validatePath(oldValue, remaining, newValue, context).then((res) => {
            var fieldErrors: ErrorMessages = {},
                indexAccessor = "[" + field + "]";
            
            _.each(res.errors, (v, k) => {
                fieldErrors[indexAccessor + (k.length > 0 && k[0] !== "[" ? "." + k : k)] = v;
            });
            
            deferred.resolve({
                isValid : res.isValid,
                value : res.isValid ? res.value : oldValue,
                errors : fieldErrors
            });
        })
        return deferred.promise;
    }
    validate(arr: O[]): Q.Promise<ValidationResult<O[]>> {
        var self = this,
            defer = Q.defer<ValidationResult<O[]>>(),
            dfields: Q.Promise<ValidationResult<O>>[] = [],
            copy = [],
            errors: ErrorMessages = {};
        
        _.each(arr, function(v, k) {
            
            var p = self.validatePath<O>(arr[k], "[" + k + "]", v, arr);
            dfields.push(p);
            p.then((res) => {
                if (res.isValid) {
                    copy[k] = res.value;
                }
                _.assign(errors, res.errors);
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
                value : isValid ? <any> copy : arr,
                errors : <ErrorMessages> errors
            });
        });
        
        return defer.promise;
    }
}
