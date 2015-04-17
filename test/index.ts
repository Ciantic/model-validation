/// <reference path="../typings/mocha/mocha.d.ts" />
/// <reference path="../typings/assert/assert.d.ts" />
/// <reference path="../typings/lodash/lodash.d.ts" />

import V = require("../index");

// Some reason this throws me error assert module is not found:
// import assert = require("assert");

declare var require: any;
var assert = require("assert");

describe("Validations", function() {
    describe("Validation functions", function() {
        it("required", () => {
            assert.equal(V.required("yes"), "yes");
            
            try {
                V.required("");
            } catch (f) {
                assert.equal(f, "This field is required");
            }
        });
        
        it("required with function", () => {
            assert.equal(V.required(V.string)("yes"), "yes");
            
            try {
                V.required(V.string)("");
            } catch (f) {
                assert.equal(f, "This field is required");
            }
        });
        
        it("string", () => {
            assert.strictEqual(V.string(1.23), "1.23");
        });
        
        it("integer", () => {
            assert.strictEqual(V.integer(3.14), 3);
            assert.strictEqual(V.integer("3.14"), 3);
            assert.strictEqual(V.integer(undefined), 0);
        });
        
        it("float", () => {
            assert.strictEqual(V.float(3.14), 3.14);
            assert.strictEqual(V.float("3.14"), 3.14);
            assert.strictEqual(V.float(undefined), 0);
        });
        
        it("isString", () => {
            assert.strictEqual(V.isString("word"), "word");
            try {
                V.isString(3.14);
            } catch (f) {
                assert.equal(f, "Must be a string");
            }
        });
        it("isInteger", () => {
            assert.strictEqual(V.isInteger(3), 3);
            try {
                V.isInteger(3.14);
            } catch (f) {
                assert.equal(f, "Must be an integer");
            }
        });
        it("isFloat", () => {
            assert.strictEqual(V.isFloat("3.14"), 3.14);
            try {
                V.isFloat("a");
            } catch (f) {
                assert.equal(f, "Must be an decimal number");
            }
        });
    });
    describe("Validator creation", function() {
        it("should create object validators", () => {
            var validator = <any> V.validator({
                'a' : V.integer
            });
            assert.equal(validator instanceof V.ObjectValidator, true);
            assert.equal(validator.fields['a'] instanceof V.FuncValidator, true);
        });
        
        it("should create nested object validators", () => {
            var validator = <any> V.validator({
                'a' : {
                    'b' : V.integer
                }
            });
            assert.equal(validator instanceof V.ObjectValidator, true);
            assert.equal(validator.fields['a'].fields['b'] instanceof V.FuncValidator, true);
        });
    
        it("should create function validators", () => {
            var validator = V.validator(V.integer);
            assert.equal(validator instanceof V.FuncValidator, true);
        })
        
        it("should create array validators", () => {
            var validator = <any> V.validator([V.integer]);
            assert.equal(validator instanceof V.ArrayValidator, true);
            assert.equal(validator.validator instanceof V.FuncValidator, true);
        });
        
        
        it("should allow composability of validators", () => {
            var firstValidator = V.validator({
                'b' : V.integer
            });
            var validator = <any> V.validator({
                'a' : firstValidator
            });
            assert.equal("first_" + (validator instanceof V.ObjectValidator), "first_true");
            assert.equal("second_" + (validator.fields['a'] instanceof V.ObjectValidator), "second_true");
            assert.equal("third_" + (validator.fields['a'].fields['b'] instanceof V.FuncValidator), "third_true");
        });
    });
    describe("Object path validation", function() {
        it("should work", () => {
            var obj = {
                id: 123,
                name: "John Doe",
                age: 3.14
            }
            return V.validator({
                    "id": V.integer,
                    "name": V.required(V.string),
                    "age": V.required(V.float),
                }).validatePath(obj, "name", "Cameleont").then((res) => {
                    assert.deepEqual(res, {
                        id: 123,
                        name: "Cameleont",
                        age: 3.14
                    });
                });
        });
        it("should raise a specific error only", () => {
            var obj = {
                id: 123,
                name: "John Doe",
                age: 0 // Note: this is invalid when validating all
            }
            return V.validator({
                    "id": V.integer,
                    "name": (i) => V.required(V.string(i)),
                    "age": (i) => V.required(V.float(i)),
                }).validatePath(obj, "name", "").catch((err) => {
                    assert.deepEqual(err, { "name": ["This field is required"] });
                })
        });
        
        it("should be able to access object", () => {
            return V.validator({
                "product": (i) => V.required(V.string(i)),
                "price": (i, o) => { if (o.product != "pizza") throw o.product + " is not a pizza"; return 7.95; },
            }).validate({
                "product" : "pizza",
                "price" : 0
            }).then((res) => {
                assert.deepEqual(res, {
                    "product" : "pizza",
                    "price" : 7.95
                });
            });
        });
        
        it("should be able to raise error by object value", () => {
            return V.validator({
                "product": (i) => V.required(V.string(i)),
                "price": (i, o) => { if (o.product != "pizza") throw o.product + " is not a pizza"; return 7.95; },
            }).validate({
                "product" : "Orange",
                "price" : 0
            }).catch((errs) => {
                assert.deepEqual(errs, {"price":["Orange is not a pizza"]});
            });
        });
    });

    describe("Object validation", function() {
        
        it("should work", () => {
            var obj = {
                id: 123,
                name: "John Doe",
                age: 3.14
            }
            return V.validator({
                "id": V.integer,
                "name": (i) => V.required(V.string(i)),
                "age": (i) => V.required(V.float(i)),
            }).validate(obj).then((res) => {
                assert.deepEqual(res, obj);
            })
        });
        
        it("should raise all errors", () => {
            var obj = {
                id: 123,
                name: "",
                age: 0
            }
            return V.validator({
                "id": V.integer,
                "name": (i) => V.required(V.string(i)),
                "age": (i) => V.required(V.float(i)),
            }).validate(obj).catch((errs) => {
                assert.deepEqual(errs, {
                    "age": ["This field is required"],
                    "name": ["This field is required"]
                });
            })
        });
        
        it("should omit extra fields", () => {
            var obj = {
                id : 5,
                name : "John Doe",
                age : 30,
                occupation : "Magician"
            }
            return V.validator({
                    "id": V.integer,
                    "name": (i) => V.required(V.string(i)),
                    "age": (i) => V.required(V.float(i)),
                }).validate(obj).then((res) => {
                    assert.deepEqual(res, {
                        id : 5,
                        name : "John Doe",
                        age : 30
                    });
                });
        });
        
        it("should create missing fields", () => {
            var obj = {
                id : 5,
                name : "John Doe",
            }
            return V.validator({
                    "id": V.integer,
                    "name": (i) => V.required(V.string(i)),
                    "age": (i) => V.float(i),
                }).validate(obj).then((res) => {
                    assert.deepEqual(res, {
                        id : 5,
                        name : "John Doe",
                        age : 0
                    });
                });
        });
    });

    describe("Nested object validation", function() {
        it("should work with object", function() {
            var obj = {
                name: "John Doe",
                address: {
                    "street": "Homestreet 123",
                    "city": "Someville"
                }
            };
            return V.validator({
                "name": (i) => V.required(V.string(i)),
                "address": {
                    "street": V.string,
                    "city": (i) => V.required(V.string(i))
                }
            }).validatePath(obj, "address", {
                "street": "Backalley 321",
                "city": "Otherville"
            }).then((res) => {
                assert.deepEqual(res, {
                    name: "John Doe",
                    address: {
                        "street": "Backalley 321",
                        "city": "Otherville"
                    }
                });
            });
        });
        
        it("should work with a dot notation", function() {
            var obj = {
                name: "John Doe",
                address: {
                    "street": "Homestreet 123",
                    "city": "Someville"
                }
            };
            return V.validator({
                "name": (i) => V.required(V.string(i)),
                "address": {
                    "street": (i) => V.required(V.string(i)),
                    "city": (i) => V.required(V.string(i))
                }
            }).validatePath(obj, "address.city", "Otherville").then((res) => {
                assert.deepEqual(res, {
                    name: "John Doe",
                    address: {
                        "street": "Homestreet 123",
                        "city": "Otherville"
                    }
                });
            });
        });
        
        it("should work with a dot notation even when zero is key", function() {
            return V.validator({ "0" : V.string })
                .validatePath({ "0" : "Okay" }, "0", "Something else").then((res) => {
                    assert.deepEqual(res, { "0" : "Something else" });
                });
        });
        
        it("should raise nested errors with a dot notation", function() {
            var obj = {
                name: "John Doe",
                address: {
                    "street": "Homestreet 123",
                    "city": "Someville"
                }
            };
            return V.validator({
                "name": (i) => V.required(V.string(i)),
                "address": {
                    "street": (i) => V.required(V.string(i)),
                    "city": (i) => V.required(V.string(i))
                }
            }).validatePath(obj, "address", {
                "street": "",
                "city": ""
            }).catch((errs) => {
                assert.deepEqual(errs, {
                    "address.street" : ["This field is required"],
                    "address.city" : ["This field is required"]
                });
            });
        });
        
        it("should raise really nested errors with a dot notation", function() {
            var obj = {
                "aaa": {
                    "bbb": {
                        "ccc" : 15
                    }
                }
            };
            return V.validator({
                "aaa": {
                    "bbb": {
                        "ccc" : (i) => V.required(V.integer(i))
                    }
                }
            }).validatePath(obj, "aaa.bbb.ccc", 0).catch((errs) => {
                assert.deepEqual(errs, {
                    "aaa.bbb.ccc" : ["This field is required"],
                });
            });
        });
        
        it("should raise really nested errors with a dot notation when object validating", function() {
            var obj = {
                "aaa": {
                    "bbb": {
                        "ccc" : 0
                    }
                }
            };
            return V.validator({
                "aaa": {
                    "bbb": {
                        "ccc" : (i) => V.required(V.integer(i))
                    }
                }
            }).validate(obj).catch((errs) => {
                assert.deepEqual(errs, {
                    "aaa.bbb.ccc" : ["This field is required"],
                });
            });
        });
    });
    
    describe("Array validation", function() {
        it("of simple functions should work", function() {
            var arr = ["first", "second"];

            return V.validator([V.string]).validate(arr).then((val) => {
                assert.deepEqual(val, arr);
            });
        });
        it("of objects validation should work", function() {
            var objs = [
                {
                    name: "John Doe",
                    age: 57
                }, {
                    name: "Little Doe",
                    age: 13
                }];

            return V.validator([{
                "name": (i) => V.required(V.string(i)),
                "age": V.float
            }]).validate(objs).then((val) => {
                assert.deepEqual(val, objs);
            });
        });
        
        it("of simple functios should raise errors", function() {
            var arr = ["", ""];

            return V.validator([(i) => V.required(V.string(i))]).validate(arr).catch((errs) => {
                assert.deepEqual(errs, {
                    "[0]" : ["This field is required"],
                    "[1]" : ["This field is required"]
                });
            });
        });
        it("of arrays should raise errors", function() {
            var arr = [[["", ""]]];

            return V.validator([[[(i) => V.required(V.string(i))]]])
                .validate(arr).catch((errs) => {
                    assert.deepEqual(errs, {
                        "[0][0][0]" : ["This field is required"],
                        "[0][0][1]" : ["This field is required"]
                    });
                });
        });
    })
    
    describe("Mishmash of weird things", function() {
        it("should work", function() {
            var thing = {"aaa" : [{"bbb" : [{"ccc" : "thingie"}]}]};

            return  V.validator({
                "aaa" : [{"bbb" : [{"ccc" : (i) => V.required(V.string(i))}]}]
            }).validate(thing).then((val) => {
                assert.deepEqual(val, thing);
            });
        });
        
        it("should raise errors", function() {
            var thing = {"aaa" : [{"bbb" : [{"ccc" : ""}]}]};

            return V.validator({
                "aaa" : [{"bbb" : [{"ccc" : (i) => V.required(V.string(i))}]}]
            }).validate(thing).catch((errs) => {
                assert.deepEqual(errs, {
                    "aaa[0].bbb[0].ccc" : ["This field is required"]
                });
            });
        });
    })
});
