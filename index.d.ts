/// <reference path="typings/lodash/lodash.d.ts" />
/// <reference path="typings/q/Q.d.ts" />
import Q = require("q");
export declare type ErrorMessages = {
    [name: string]: string[];
};
export declare type NotifyState = {
    [name: string]: {
        progress: any;
        resolved: any;
        rejected: any;
    };
};
export interface ValidationPromise<T> extends Q.Promise<T> {
    then(onFullFill: (v: T) => any): ValidationPromise<T>;
    catch(onFailure: (v: ErrorMessages) => any): ValidationPromise<T>;
    progress(onProgress: (v: NotifyState) => any): ValidationPromise<T>;
}
export interface Validator<O> {
    validate(value: O): ValidationPromise<O>;
    validatePath<T>(oldValue: T, path: string, newValue?: any, context?: any): ValidationPromise<T>;
}
export declare type ValidationFunction = <O>(input: O, context?: any) => O;
export declare function operator(op: (input: any, ...args: any[]) => boolean, input?: any | ValidationFunction, ...args: any[]): any;
export declare function required(input: any | ValidationFunction, isNot?: any): any | ValidationFunction;
export declare function min(val: number, input?: number | ValidationFunction): number | ValidationFunction;
export declare function max(val: number, input?: number | ValidationFunction): number | ValidationFunction;
export declare function between(min: number, max: number, input?: number | ValidationFunction): number | ValidationFunction;
export declare function betweenExclusive(min: number, max: number, input?: number | ValidationFunction): number | ValidationFunction;
export declare function string(input: any): string;
export declare function integer(input: any): number;
export declare function float(input: any): number;
export declare function isString(input: any): string;
export declare function isInteger(input: any): number;
export declare function isFloat(input: any): number;
export declare function object<O extends Object>(defs: {
    [name: string]: ValidationFunction | Validator<any>;
}, context?: any): Validators.ObjectValidator<O>;
export declare function array<O>(def: ValidationFunction | Validator<O>): Validators.ArrayValidator<O>;
export declare module Validators {
    class FuncValidator<O> implements Validator<O> {
        func: ValidationFunction;
        constructor(func: ValidationFunction, parent?: any);
        private _callFunc<T>(val, context?);
        validatePath<T>(oldValue: T, path: string, newValue?: any, context?: any): ValidationPromise<T>;
        validate(value: O): ValidationPromise<O>;
    }
    class ObjectValidator<O extends Object> implements Validator<O> {
        fields: {
            [name: string]: Validator<any>;
        };
        constructor(fields: {
            [name: string]: Validator<any>;
        });
        validatePath<T extends Object>(oldValue: T, path: string, newValue?: any, context?: any): ValidationPromise<T>;
        validate(object: O): ValidationPromise<O>;
    }
    class ArrayValidator<O> implements Validator<O[]> {
        validator: Validator<O>;
        constructor(validator: Validator<O>);
        validatePath<T>(oldValue: T, path: string, newValue?: any, context?: any): ValidationPromise<T>;
        validate(arr: O[]): ValidationPromise<O[]>;
    }
}
