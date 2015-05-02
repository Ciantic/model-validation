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

export type NotifyState = {
    [name: string] : any
}

export interface ValidationPromise<T> extends Q.Promise<T> {
    then(onFullFill: (v: T) => any): ValidationPromise<T>
    catch(onFailure: (v: ErrorMessages) => any): ValidationPromise<T>
    progress(onProgress: (v: NotifyState) => any): ValidationPromise<T>
}

export interface Validator<O> {
    validate(value: O): ValidationPromise<O>;
    validatePath<T>(oldValue: T, path: string, newValue?: any, context?: any): ValidationPromise<T>;
}

export type ValidationFunction = <O>(input: O, context?: any) => O;

export function operator(op: (input: any, ...args: any[]) => boolean, input?: any|ValidationFunction, ...args: any[]): any {
    // Function as argument
    if (_.isFunction(input)) {
        // Curry with function
        return (i: any, c?: any) => {
            return operator(op, input(i, c), ...args);
        };
    } else if (typeof input === "undefined") {
        // Curried with no value
        return (i: any) => {
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
        if (input < val) {
            throw "Value must be equal or greater than: " + val
        }
        return input;
    }, input, val);
}

export function minExclusive(val: number, input?: number|ValidationFunction) : number|ValidationFunction {
    return operator((input, val) => {
        if (input <= val) {
            throw "Value must be greater than: " + val
        }
        return input;
    }, input, val);
}

export function max(val: number, input?: number|ValidationFunction) : number|ValidationFunction {
    return operator((input, val) => {
        if (input > val) {
            throw "Value must be equal or less than: " + val
        }
        return input;
    }, input, val);
}

export function maxExclusive(val: number, input?: number|ValidationFunction) : number|ValidationFunction {
    return operator((input, val) => {
        if (input >= val) {
            throw "Value must be less than: " + val
        }
        return input;
    }, input, val);
}

export function between(min: number, max: number, input?: number|ValidationFunction) : number|ValidationFunction {
    return operator((input) => {
        if (input < min || input > max) {
            throw "Value must be between " + min + " and " + max
        }
        return input;
    }, input);
}

export function betweenExclusive(min: number, max: number, input?: number|ValidationFunction) : number|ValidationFunction {
    return operator((input) => {
        if (input <= min || input >= max) {
            throw "Value must exclusively be between " + min + " and " + max
        }
        return input;
    }, input);
}

export function string(input: any): string {
    return typeof input  !== "undefined" ? "" + input : "";
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
    } else if (_.isNumber(input) && (input|0) === input) {
        return input;
    }
    throw "Must be an integer"
}

export function isFloat(input: any): number {
    if (_.isString(input) && /^\d+(\.\d+)?$/.exec(input)) {
        return parseFloat(input) || 0.0;
    } else if (_.isNumber(input)) {
        return input;
    }
    throw "Must be an decimal number"
}

function getValidator<O>(v: ValidationFunction | Validator<O>): Validator<O> {
    // Is validation function
    if (_.isFunction(v)) {
        return <Validator<O>> new Validators.FuncValidator<O>(<ValidationFunction> v);
        
    // Is validator
    } else if (_.isObject(v) &&
        _.isFunction((<any> v).validate) &&
        _.isFunction((<any> v).validatePath))
    {
        return <Validator<O>> v;
    }
    
    throw "Validator is not defined for this field";
}

export function object<O extends Object>(defs: { [name: string] : ValidationFunction | Validator<any> }, context?: any): Validators.ObjectValidator<O> {
    return new Validators.ObjectValidator<O>(_.mapValues(defs, (v) => getValidator<O>(v)));
}

export function array<O>(def: ValidationFunction | Validator<O>): Validators.ArrayValidator<O> {
    return new Validators.ArrayValidator(getValidator<O>(def));
}

export module Validators {
    export class FuncValidator<O> implements Validator<O> {
        func: ValidationFunction
        
        constructor(func: ValidationFunction, parent?: any) {
            this.func = func;
        }
        
        private _callFunc<T>(val: T|ValidationPromise<T>, context?: any): ValidationPromise<T> {
            try {
                var res = this.func(val, context);
            } catch (e) {
                return <ValidationPromise<T>> Q.reject<T>({"" : [e]});
            }
            
            // Looks like a promise
            if (_.isObject(res) && _.isFunction((<any>res).then) && _.isFunction((<any>res).catch)) {
                var deferred = Q.defer<T>();
                (<ValidationPromise<T>> res)
                    .then(i => deferred.resolve(i))
                    .catch(er => deferred.reject({"" : [er]}))
                    .progress(n => deferred.notify({"" : n}));
                return <ValidationPromise<T>> deferred.promise;
            }
            
            return <ValidationPromise<T>> Q.resolve(res);
        }
        
        validatePath<T>(oldValue: T, path: string, newValue?: any, context?: any):
            ValidationPromise<T>
        {
            if (path !== "") {
                return <any> Q.reject<T>({"" : ["Function validator does not recognize this path:" + path]});
            }
            return <ValidationPromise<T>> this._callFunc(newValue, context);
        }
        
        validate(value: O): ValidationPromise<O> {
            return this._callFunc<O>(value);
        }
    }

    var objectRegExp = /^([^\.\[\]]+)[\.]?(.*)/;

    export class ObjectValidator<O extends Object> implements Validator<O> {
        public fields: { [name: string] : Validator<any> }
        
        constructor(fields: { [name: string] : Validator<any> }) {
            this.fields = fields;
        }
        
        validatePath<T extends Object>(oldValue: T, path: string, newValue?: any, context?: any):
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
                oldFieldValue = (<any> oldValue)[field];

            fieldValidator.validatePath(oldFieldValue, remaining, newValue, context).then((res) => {
                var fieldErrors: ErrorMessages = {},
                    value = _.cloneDeep(oldValue);
                (<any> value)[field] = res;
                deferred.resolve(<any> value);
            }).catch((errors) => {
                var fieldErrors: ErrorMessages = {};
               _.each(errors, (v, k) => {
                   fieldErrors[field + (k.length > 0 && k[0] !== "[" ? "." + k : k)] = v;
               });
                deferred.reject(fieldErrors);
            }).progress(s => {
                var state: NotifyState = {};
                _.each(s, (v, k) => {
                    state[field + (k.length > 0 && k[0] !== "[" ? "." + k : k)] = v;
                });
                deferred.notify(state);
            });

            return <ValidationPromise<T>> deferred.promise;
        }
        
        validate(object: O): ValidationPromise<O> {
            if (!_.isObject(object)) {
                object = <O> {};
            }
            var self = this,
                defer = Q.defer<O>(),
                dfields: Q.Promise<O>[] = [],
                copy = <O> _.pick(_.cloneDeep(object), _.keys(this.fields)),
                errors: ErrorMessages = {};
            
            _.each(this.fields, function(v, k) {
                var p = self.validatePath(object, k, (<any> object)[k], object);
                dfields.push(p);
                p.then((res) => {
                    (<any> copy)[k] = (<any> res)[k];
                }).catch((part_errors) => {
                    _.assign(errors, part_errors);
                }).progress(p => {
                    defer.notify(p);
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
                
                _.each(err, (v, k) => {
                    fieldErrors[indexAccessor + (k.length > 0 && k[0] !== "[" ? "." + k : k)] = v;
                });
                deferred.reject(fieldErrors);
            }).progress(s => {
                var state: NotifyState = {},
                    indexAccessor = "[" + field + "]";
                _.each(s, (v, k) => {
                    state[indexAccessor + (k.length > 0 && k[0] !== "[" ? "." + k : k)] = v;
                });
                deferred.notify(state);
            });
            return <ValidationPromise<T>> deferred.promise;
        }
        validate(arr: O[]): ValidationPromise<O[]> {
            if (!_.isArray(arr)) {
                arr = <O[]> [];
            }
            var self = this,
                defer = Q.defer<O[]>(),
                dfields: Q.Promise<O>[] = [],
                copy = <O[]>[],
                errors: ErrorMessages = {};
            
            _.each(arr, function(v, k) {
                
                var p = self.validatePath<O>(arr[k], "[" + k + "]", v, arr);
                dfields.push(p);
                p.then((res) => {
                    copy[k] = res;
                }).catch((err) => {
                    _.assign(errors, err);
                }).progress(p => {
                    defer.notify(p);
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
}
