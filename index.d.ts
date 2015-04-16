/// <reference path="typings/lodash/lodash.d.ts" />
/// <reference path="typings/q/Q.d.ts" />
import Q = require("q");
export declare type ErrorMessages = {
    [name: string]: string[];
};
export interface Validator<O> {
    validate(value: O): Q.Promise<ValidationResult<O>>;
    validatePath<T>(oldValue: T, path: string, newValue?: any, context?: any): Q.Promise<ValidationResult<T>>;
}
export interface ValidationResult<T> {
    isValid: boolean;
    value: T;
    errors: ErrorMessages;
}
export declare type ValidationFunction = (input: any, context?: any) => any;
export declare function validator<O>(defs: any): Validator<O>;
export declare function required(input: any, isNot?: any): any;
export declare function string(input: any): string;
export declare function integer(input: any): number;
export declare function float(input: any): number;
export declare function isString(input: any): string;
export declare function isInteger(input: any): number;
export declare function isFloat(input: any): number;
export declare class FuncValidator<O> implements Validator<O> {
    func: ValidationFunction;
    constructor(func: ValidationFunction, parent?: any);
    validatePath<T>(oldValue: T, path: string, newValue?: any, context?: any): Q.Promise<ValidationResult<T>>;
    validate(value: O): Q.Promise<ValidationResult<O>>;
}
export declare class ObjectValidator<O> implements Validator<O> {
    fields: {
        [name: string]: Validator<any>;
    };
    constructor(fields: {
        [name: string]: Validator<any>;
    });
    validatePath<T>(oldValue: T, path: string, newValue?: any, context?: any): Q.Promise<ValidationResult<T>>;
    validate(object: O): Q.Promise<ValidationResult<O>>;
}
export declare class ArrayValidator<O> implements Validator<O[]> {
    validator: Validator<O>;
    constructor(validator: Validator<O>);
    validatePath<T>(oldValue: T, path: string, newValue?: any, context?: any): Q.Promise<ValidationResult<T>>;
    validate(arr: O[]): Q.Promise<ValidationResult<O[]>>;
}
