/// <reference path="typings/lodash/lodash.d.ts" />
/// <reference path="typings/q/Q.d.ts" />

import _ = require("lodash");
import Q = require("q");

export type errorMessages = {
    [name: string] : string[]
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

export function getUsingDotArrayNotation<T>(object: T, notation: string): [T, string, string] {
    var key = "",
        objectTrail = "",
        fullTrail = "";
    for (var i = 0; i < notation.length; i++) {
        var char = notation[i],
            next = notation.length > i ? notation[i + 1] : null;
        fullTrail += char;
        if (char !== ".") {
            objectTrail += char;
        }
        if (next === ".") {
            object = object[objectTrail];
            objectTrail = "";
        }
    }
    key = objectTrail;
    return [object[key], key, fullTrail.slice(0, -key.length)];
}

export function setUsingDotArrayNotation<T>(object: T, notation: string, val: any): T {
    var o = _.cloneDeep(object),
        mutator = o,
        key = "",
        objectTrail = "";
    for (var i = 0; i < notation.length; i++) {
        var char = notation[i],
            next = notation.length > i ? notation[i + 1] : null;
        if (char !== ".") {
            objectTrail += char;
        }
        if (next === ".") {
            mutator = mutator[objectTrail];
            objectTrail = "";
        }
        if (i === notation.length - 1) {
            mutator[objectTrail] = val;
        }
    }
    // Freeze o here?
    return o;
}

function getValidator(validFunc: any, fieldName: string, object: any): Validator {
    if (_.isFunction(validFunc)) {
        return new FuncValidator(<validationFunction> validFunc, fieldName, object);
    } else if (_.isPlainObject(validFunc)) {
        return new ObjectValidator(<{ [name: string] : validationFunction }> validFunc);
    } else if (_.isArray(validFunc)) {
        return new ArrayValidator(validFunc[0]);
    } else if (_.isObject(validFunc) && "validate" in validFunc) {
        return <Validator> validFunc;
    }
    throw "Validator is not defined for this field";
}

export class FuncValidator implements Validator {
    fieldName: string
    func: validationFunction
    object: any
    constructor(func: validationFunction, fieldName: string, object: any) {
        this.fieldName = fieldName;
        this.func = func;
        this.object = object;
    }
    
    validate<T>(value: T): Q.Promise<ValidationResult<T>> {
        var copy = _.cloneDeep(this.object);
        var errors: errorMessages = {},
            isValid = false,
            deferred = Q.defer<ValidationResult<T>>();
            
        errors[this.fieldName] = [];
        try {
            deferred.resolve({
                isValid : true,
                errors : {},
                value : this.func(value, copy)
            });
        } catch (e) {
            errors[this.fieldName].push("" + e);
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
        var [validFuncCandidate, getFieldName, getFieldPath] = getUsingDotArrayNotation(this.fields, fieldName);
        //console.log("get", fieldName, getFieldName, getFieldPath);
        try {
            var validFunc = getValidator(validFuncCandidate, fieldName, object);
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
                fieldErrors[getFieldPath + k] = v;
            });
            //console.log("res.errors", res.errors, fieldErrors);
            deferred.resolve({
                isValid : res.isValid,
                value : res.isValid ? setUsingDotArrayNotation(object, fieldName, res.value) : object,
                errors : res.errors
            });
        })
        return deferred.promise;
    }
    
    validate<T>(object: T): Q.Promise<ValidationResult<T>> {
        var self = this,
            defer = Q.defer<ValidationResult<T>>(),
            dfields: Q.Promise<ValidationResult<T>>[] = [];
            
        var copy = _.cloneDeep(object),
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
        
        // Assumes Q.all promise is resolved after all individual promise
        // callbacks has resolved
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
