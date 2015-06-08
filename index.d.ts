declare module "model-validation" {
    /// <reference path="typings/lodash/lodash.d.ts" />
    /// <reference path="typings/q/Q.d.ts" />
    import * as Q from 'q';
    type ErrorMessages = {
        [name: string]: string[];
    };
    type NotifyState = {
        [name: string]: any;
    };
    interface ValidationPromise<T> extends Q.Promise<T> {
        then(onFullFill: (v: T) => any): ValidationPromise<T>;
        catch(onFailure: (v: ErrorMessages) => any): ValidationPromise<T>;
        progress(onProgress: (v: NotifyState) => any): ValidationPromise<T>;
    }
    interface Validator<O> {
        validate(value: O): ValidationPromise<O>;
        validatePath<T>(path: string, oldValue: T, newValue?: any, context?: any): ValidationPromise<T>;
    }
    type ValidationFunction = <O>(input: O, context?: any) => O;
    function func<O>(func: ValidationFunction): FuncValidator<O>;
    function operator(op: (input: any, ...args: any[]) => boolean, input?: any | ValidationFunction, ...args: any[]): any;
    function required(input: any | ValidationFunction, isNot?: any): any | ValidationFunction;
    function min(val: number, input?: number | ValidationFunction): number | ValidationFunction;
    function minExclusive(val: number, input?: number | ValidationFunction): number | ValidationFunction;
    function max(val: number, input?: number | ValidationFunction): number | ValidationFunction;
    function maxExclusive(val: number, input?: number | ValidationFunction): number | ValidationFunction;
    function between(min: number, max: number, input?: number | ValidationFunction): number | ValidationFunction;
    function betweenExclusive(min: number, max: number, input?: number | ValidationFunction): number | ValidationFunction;
    function string(input: any): string;
    function integer(input: any): number;
    function float(input: any): number;
    function isString(input: any): string;
    function isInteger(input: any): number;
    function isFloat(input: any): number;
    function object<O extends Object>(defs: {
        [name: string]: ValidationFunction | Validator<any>;
    }, context?: any): ObjectValidator<O>;
    function array<O>(def: ValidationFunction | Validator<O>): ArrayValidator<O>;
    interface FuncValidator<O> extends Validator<O> {
        func: ValidationFunction;
        validatePath<T>(path: string, oldValue: T, newValue?: any, context?: any): ValidationPromise<T>;
        validate(value: O): ValidationPromise<O>;
    }
    interface ObjectValidator<O extends Object> extends Validator<O> {
        fields: {
            [name: string]: Validator<any>;
        };
        validatePath<T extends Object>(path: string, oldValue: T, newValue?: any, context?: any): ValidationPromise<T>;
        validate(object: O): ValidationPromise<O>;
    }
    interface ArrayValidator<O> extends Validator<O[]> {
        validator: Validator<O>;
        validatePath<T>(path: string, oldValue: T, newValue?: any, context?: any): ValidationPromise<T>;
        validate(arr: O[]): ValidationPromise<O[]>;
    }
}
