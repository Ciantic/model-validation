/// <reference path="typings/lodash/lodash.d.ts" />
/// <reference path="typings/q/Q.d.ts" />
import Q = require("q");
export declare type ErrorMessages = {
    [name: string]: string[];
};
export interface ValidationPromise<T> extends Q.Promise<T> {
    then(onFullFill: (v: T) => any): ValidationPromise<T>;
    catch(onFailure: (v: ErrorMessages) => any): ValidationPromise<T>;
    notify(onNotify: (v: {}) => any): ValidationPromise<T>;
}
export interface Validator<O> {
    validate(value: O): ValidationPromise<O>;
    validatePath<T>(oldValue: T, path: string, newValue?: any, context?: any): ValidationPromise<T>;
}
export declare type ValidationFunction = (input: any, context?: any) => any;
export declare function validator<O>(defs: any): Validator<O>;
export declare function required(input: any, context?: any, isNot?: any): any;
export declare function string(input: any): string;
export declare function integer(input: any): number;
export declare function float(input: any): number;
export declare function isString(input: any): string;
export declare function isInteger(input: any): number;
export declare function isFloat(input: any): number;
export declare class FuncValidator<O> implements Validator<O> {
    func: ValidationFunction;
    constructor(func: ValidationFunction, parent?: any);
    validatePath<T>(oldValue: T, path: string, newValue?: any, context?: any): ValidationPromise<T>;
    validate(value: O): ValidationPromise<O>;
}
export declare class ObjectValidator<O> implements Validator<O> {
    fields: {
        [name: string]: Validator<any>;
    };
    constructor(fields: {
        [name: string]: Validator<any>;
    });
    validatePath<T>(oldValue: T, path: string, newValue?: any, context?: any): ValidationPromise<T>;
    validate(object: O): ValidationPromise<O>;
}
export declare class ArrayValidator<O> implements Validator<O[]> {
    validator: Validator<O>;
    constructor(validator: Validator<O>);
    validatePath<T>(oldValue: T, path: string, newValue?: any, context?: any): ValidationPromise<T>;
    validate(arr: O[]): ValidationPromise<O[]>;
}
