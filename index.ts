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

export interface ValidationPromise<T> extends Q.Promise<T> {
    then(onFullFill: (v: T) => any): ValidationPromise<T>
    catch(onFailure: (v: ErrorMessages) => any): ValidationPromise<T>
    notify(onNotify: (v: {}) => any): ValidationPromise<T>
}

export interface Validator<O> {
    validate(value: O): ValidationPromise<O>;
    validatePath<T>(oldValue: T, path: string, newValue?: any, context?: any): ValidationPromise<T>;
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
    } else if (_.isObject(validFunc) && _.isFunction(validFunc.validate) && _.isFunction(validFunc.validatePath)) {
        return <Validator<O>> validFunc;
    // Is ObjectValidator masquerading as object
    } else if (_.isPlainObject(validFunc)) {
        var validFuncCopy = {}; //_.cloneDeep(validFunc);
        _.each(validFunc, (v, k) => {
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

export function operator(op: (input, ...args) => boolean, input?: any|ValidationFunction, ...args): any {
    // Function as argument
    if (_.isFunction(input)) {
        // Curry with function
        return (i, c) => {
            return operator(op, input(i, c), ...args);
        };
    } else if (typeof input === "undefined") {
        // Curried with no value
        return (i) => {
            return (<any> operator)(op, i, ...args);
        };
    }
    return op(input, ...args);
}

export function required(input: any|ValidationFunction, isNot: any = false): any|ValidationFunction {
    return operator((input, isNot) => {
        if (input == isNot) {
            throw "This field is required";
        }
        return input;
    }, input, isNot);
}

export function min(val: number, input?: number|ValidationFunction) : number|ValidationFunction {
    return operator((input, val) => {
        if (input <= val) {
            throw "Value must be at least: " + val
        }
        return input;
    }, input, val);
}

export function max(val: number, input?: number|ValidationFunction) : number|ValidationFunction {
    return operator((input, val) => {
        if (input >= val) {
            throw "Value must not be greater than: " + val
        }
        return input;
    }, input, val);
}

export function between(min: number, max: number, input?: number|ValidationFunction) : number|ValidationFunction {
    return operator((input) => {
        if (input <= min || input >= max) {
            throw "Value must be between " + min + " and " + max
        }
        return input;
    }, input);
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
    if (_.isString(input)) {
        return input;
    }
    throw "Must be a string"
}

export function isInteger(input: any): number {
    if (_.isString(input) && /^\d+$/.exec(input)) {
        return parseInt(input) || 0;
    } else if (_.isNumber(input) && parseInt(input) === input) {
        return input;
    }
    throw "Must be an integer"
}

export function isFloat(input: any): number {
    if (_.isString(input) && /^\d+(\.\d+)?$/.exec(input))
    {
        return parseFloat(input) || 0.0;
    } else if (_.isNumber(input)) {
        return input;
    }
    throw "Must be an decimal number"
}

export class FuncValidator<O> implements Validator<O> {
    func: ValidationFunction
    
    constructor(func: ValidationFunction, parent?: any) {
        this.func = func;
    }
    
    validatePath<T>(oldValue: T, path: string, newValue?: any, context?: any):
        ValidationPromise<T>
    {
        if (path !== "") {
            return <any> Q.reject<T>({"" : ["Function validator does not recognize this path:" + path]});
        }
        
        var deferred = Q.defer<T>();
        try {
            return <ValidationPromise<T>> Q.resolve<T>(this.func(newValue, context));
        } catch (e) {
            return <ValidationPromise<T>> Q.reject<T>({"" : [e]});
        }
    }
    
    validate(value: O): ValidationPromise<O> {
        var copy = _.cloneDeep(value),
            deferred = Q.defer<O>();
        
        try {
            deferred.resolve(this.func(copy));
        } catch (e) {
            deferred.reject({"" : [e]});
        }
        
        return <ValidationPromise<O>> deferred.promise;
    }
}

var objectRegExp = /^([^\.\[\]]+)[\.]?(.*)/;

export class ObjectValidator<O> implements Validator<O> {
    public fields: { [name: string] : Validator<any> }
    
    constructor(fields: { [name: string] : Validator<any> }) {
        this.fields = fields;
    }
    
    validatePath<T>(oldValue: T, path: string, newValue?: any, context?: any):
        ValidationPromise<T>
    {
        if (path === "") {
            return <any> this.validate(newValue);
        }
        
        var m = objectRegExp.exec(path);
        if (!m) {
            return <ValidationPromise<T>> Q.reject<T>({"" : "Object validator does not recognize this path: " + path});
        }
        
        var deferred = Q.defer<T>(),
            [, field, remaining] = m,
            fieldValidator = <Validator<any>> this.fields[field],
            oldFieldValue = oldValue[field];

        fieldValidator.validatePath(oldFieldValue, remaining, newValue, context).then((res) => {
            var fieldErrors: ErrorMessages = {},
                value = _.cloneDeep(oldValue);
            value[field] = res;
            deferred.resolve(<any> value);
        }).catch((errors) => {
            var fieldErrors: ErrorMessages = {};
           _.each(errors, (v: string[], k) => {
               fieldErrors[field + (k.length > 0 && k[0] !== "[" ? "." + k : k)] = v;
           });
            deferred.reject(fieldErrors);
        });

        return <ValidationPromise<T>> deferred.promise;
    }
    
    validate(object: O): ValidationPromise<O> {
        var self = this,
            defer = Q.defer<O>(),
            dfields: Q.Promise<O>[] = [],
            copy = _.pick(_.cloneDeep(object), _.keys(this.fields)),
            errors: ErrorMessages = {};
        
        _.each(this.fields, function(v, k) {
            var p = self.validatePath(object, k, object[k], object);
            dfields.push(p);
            p.then((res) => {
                copy[k] = res[k];
            }).catch((part_errors) => {
                _.assign(errors, part_errors);
            });
        });
        
        // Error array filling assumes Q.all promise is resolved after all
        // individual promise callbacks has resolved
        Q.all(dfields).then((resz) => {
            defer.resolve(<any> copy);
        }).catch((errs) => {
            defer.reject(errors);
        });
        
        return <ValidationPromise<O>> defer.promise;
    }
}

var arrayIndexRegExp = /^\[(\d+)\](.*)/;

export class ArrayValidator<O> implements Validator<O[]> {
    validator: Validator<O>
    constructor(validator: Validator<O>) {
        this.validator = validator;
    }
    
    validatePath<T>(oldValue: T, path: string, newValue?: any, context?: any):
        ValidationPromise<T>
    {
        if (path === "") {
            return <any> this.validate(newValue);
        }
        
        var m = arrayIndexRegExp.exec(path);
        if (!m) {
            throw "Array validator does not recognize this path: " + path;
        }
        
        var deferred = Q.defer<T>(),
            [, field, remaining] = m;
        
        this.validator.validatePath(oldValue, remaining, newValue, context).then((res) => {
            deferred.resolve(res);
        }).catch((err) => {
            var fieldErrors: ErrorMessages = {},
                indexAccessor = "[" + field + "]";
            
            _.each(err, (v: string[], k) => {
                fieldErrors[indexAccessor + (k.length > 0 && k[0] !== "[" ? "." + k : k)] = v;
            });
            deferred.reject(fieldErrors);
        });
        return <ValidationPromise<T>> deferred.promise;
    }
    validate(arr: O[]): ValidationPromise<O[]> {
        var self = this,
            defer = Q.defer<O[]>(),
            dfields: Q.Promise<O>[] = [],
            copy = [],
            errors: ErrorMessages = {};
        
        _.each(arr, function(v, k) {
            
            var p = self.validatePath<O>(arr[k], "[" + k + "]", v, arr);
            dfields.push(p);
            p.then((res) => {
                copy[k] = res;
            }).catch((err) => {
                _.assign(errors, err);
            });
        });
        
        // Error array filling assumes Q.all promise is resolved after all
        // individual promise callbacks has resolved
        Q.all(dfields).then((resz) => {
            defer.resolve(<any> copy);
        }).catch((errs) => {
            defer.reject(errors);
        });
        
        return <ValidationPromise<O[]>> defer.promise;
    }
}
