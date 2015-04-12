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

export type validatorDefinition =
    validationFunction | Validator | validationFunction[] | Validator[] |
    validationFunction[][] | Validator[][] |
    validationFunction[][][] | Validator[][][] |
    { [name: string] : (validatorDefinition) } |
    { [name: string] : (validatorDefinition) }[];

export type objectValidatorDef = {
    [name: string] : Validator
};

export type arrayValidatorDef  = Validator;

function getValidator(validFunc: any, parent?: any): Validator {
    if (_.isFunction(validFunc)) {
        return new FuncValidator(<validationFunction> validFunc, parent);
    } else if (_.isObject(validFunc) && "validate" in validFunc) {
        return <Validator> validFunc;
    }
    
    if (_.isPlainObject(validFunc)) {
        var validFuncCopy = _.cloneDeep(validFunc);
        _.each(validFuncCopy, (v, k) => {
            validFuncCopy[k] = getValidator(v);
        });
        return new ObjectValidator(<{ [name: string] : Validator }> validFuncCopy);
    } else if (_.isArray(validFunc) && validFunc.length === 1) {
        return new ArrayValidator(getValidator(validFunc[0]));
    }
    throw "Validator is not defined for this field";
}

export function validator(defs: validatorDefinition): Validator {
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

export class FuncValidator implements Validator {
    func: validationFunction
    
    constructor(func: validationFunction, parent?: any) {
        this.func = func;
    }
    
    validatePath<T>(oldValue: T, path: string, newValue?: any, context?: any):
        Q.Promise<ValidationResult<T>>
    {
        if (path !== "") {
            return Q.reject<ValidationResult<T>>({
                isValid : false,
                value : oldValue,
                errors : {"" : ["Function validator does not recgonize this path:" + path]}
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
    public fields: objectValidatorDef
    constructor(fields: objectValidatorDef) {
        this.fields = fields;
    }
    
    validatePath<T>(oldValue: T, path: string, newValue?: any, context?: any):
        Q.Promise<ValidationResult<T>>
    {
        if (path === "") {
            return this.validate(newValue);
        }
        // TODO: Determine fields from this.fields when creating a ObjectValidator
        // it's faster this way.
        var m = objectRegExp.exec(path);
        if (!m) {
            return Q.reject<ValidationResult<T>>({
                isValid : false,
                value : oldValue,
                errors : {"" : "Object validator does not recgonize this path: " + path}
            });
        }
        var deferred = Q.defer<ValidationResult<T>>(),
            [, field, remaining] = m,
            fieldValidator = <Validator> this.fields[field],
            oldFieldValue = oldValue[field];

        fieldValidator.validatePath(oldFieldValue, remaining, newValue, context).then((res) => {
            var fieldErrors: errorMessages = {},
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
    
    validate<T>(object: T): Q.Promise<ValidationResult<T>> {
        var self = this,
            defer = Q.defer<ValidationResult<T>>(),
            dfields: Q.Promise<ValidationResult<T>>[] = [],
            copy = _.pick(_.cloneDeep(object), _.keys(this.fields)),
            errors: errorMessages = {};
        
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
                value : <T> copy,
                errors : <errorMessages> errors
            });
        });
        
        return defer.promise;
    }
}

var arrayIndexRegExp = new RegExp('^\\[(\\d+)\\](.*)');

export class ArrayValidator implements Validator {
    validator: Validator
    constructor(validator: Validator) {
        this.validator = validator;
    }
    
    validatePath<T>(oldValue: T, path: string, newValue?: any, context?: any):
        Q.Promise<ValidationResult<T>>
    {
        if (path === "") {
            return this.validate<T>(newValue);
        }
        
        var m = arrayIndexRegExp.exec(path);
        if (!m) {
            throw "Array validator does not recgonize this path: " + path;
        }
        
        var deferred = Q.defer<ValidationResult<T>>(),
            [, field, remaining] = m;
        
        this.validator.validatePath(oldValue, remaining, newValue, context).then((res) => {
            var fieldErrors: errorMessages = {},
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
    validate<T>(arr: T[]): Q.Promise<ValidationResult<T>> {
        var self = this,
            defer = Q.defer<ValidationResult<T>>(),
            dfields: Q.Promise<ValidationResult<T>>[] = [],
            copy = [],
            errors: errorMessages = {};
        
        _.each(arr, function(v, k) {
            
            var p = self.validatePath<T>(arr[k], "[" + k + "]", v, arr);
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
                errors : <errorMessages> errors
            });
        });
        
        return defer.promise;
    }
}
