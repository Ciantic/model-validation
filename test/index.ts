/// <reference path="../typings/mocha/mocha.d.ts" />
/// <reference path="../typings/chai/chai.d.ts" />
/// <reference path="../typings/lodash/lodash.d.ts" />

declare var require: any;
require("source-map-support").install();

import V = require("../index");
import Q = require("q");
import chai = require("chai");
var assert = chai.assert;

describe("Validations", function() {
    describe("Validation functions", function() {
        it("required", () => {
            assert.equal(V.required("yes"), "yes");
            try {
                V.required("");
                throw "Must not run";
            } catch (f) {
                assert.equal(f, "This field is required");
            }
        });
        
        it("required with function", () => {
            assert.equal(V.required(V.string)("yes"), "yes");
            try {
                V.required((i,c) => {
                    assert.equal(c, "context");
                    assert.equal(i, "falzy");
                    return "falzy";
                }, "falzy")("falzy", "context");
                throw "Must not run";
            } catch (e) {
                assert.equal(e, "This field is required");
            }
        });
        
        it("string", () => {
            assert.strictEqual(V.string(1.23), "1.23");
            assert.strictEqual(V.string(undefined), "");
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
                throw "Must not run";
            } catch (f) {
                assert.equal(f, "Must be a string");
            }
        });
        it("isInteger", () => {
            assert.strictEqual(V.isInteger(3), 3);
            try {
                V.isInteger(3.14);
                throw "Must not run";
            } catch (f) {
                assert.equal(f, "Must be an integer");
            }
        });
        it("isFloat", () => {
            assert.strictEqual(V.isFloat("123.14"), 123.14);
            assert.strictEqual(V.isFloat("123"), 123);
            try {
                V.isFloat("a");
                throw "Must not run";
            } catch (f) {
                assert.equal(f, "Must be an decimal number");
            }
        });
        
        it("min", () => {
            assert.strictEqual(V.min(5, 100), 100);
            assert.strictEqual((<any> (V.min(5, V.float)))(100), 100);
            assert.strictEqual((<any> (V.min(5)))(100), 100);
            assert.strictEqual((<any> (V.min(5, (i) => {
                // Makes sure this part is being run
                return 100;
            })))(null), 100);
            try {
                V.min(5, 4);
                throw "Must not run"
            } catch (e) {
                assert.equal(e, "Value must be at least: 5");
            }
            try {
                (<any> (V.min(5, V.float)))(4);
                throw "Must not run"
            } catch (e) {
                assert.equal(e, "Value must be at least: 5");
            }
            try {
                (<any> (V.min(5)))(4);
                throw "Must not run"
            } catch (e) {
                assert.equal(e, "Value must be at least: 5");
            }
        });
        
        it("max", () => {
            assert.strictEqual(V.max(100, 5), 5);
            assert.strictEqual((<any> (V.max(100, V.float)))(5), 5);
            assert.strictEqual((<any> (V.max(100)))(5), 5);
            assert.strictEqual((<any> (V.max(100, (i) => {
                // Makes sure this part is being run
                return 5;
            })))(null), 5);
            try {
                V.max(5, 10);
                throw "Must not run"
            } catch (e) {
                assert.equal(e, "Value must not be greater than: 5");
            }
            try {
                (<any> (V.max(5, V.float)))(10);
                throw "Must not run"
            } catch (e) {
                assert.equal(e, "Value must not be greater than: 5");
            }
            try {
                (<any> (V.max(5)))(10);
                throw "Must not run"
            } catch (e) {
                assert.equal(e, "Value must not be greater than: 5");
            }
        });
        
        it("between", () => {
            assert.strictEqual(V.between(50, 100, 70), 70);
            assert.strictEqual((<any> (V.between(50, 100, V.float)))(70), 70);
            assert.strictEqual((<any> (V.between(50, 100)))(70), 70);
            assert.strictEqual((<any> (V.between(50, 100, (i) => {
                // Makes sure this part is being run
                return 70;
            })))(null), 70);
            
            try {
                V.between(50, 100, 10);
                throw "Must not run"
            } catch (e) {
                assert.equal(e, "Value must be between 50 and 100");
            }
            try {
                (<any> (V.between(50, 100, V.float)))(10);
                throw "Must not run"
            } catch (e) {
                assert.equal(e, "Value must be between 50 and 100");
            }
            try {
                (<any> (V.between(50, 100)))(10);
                throw "Must not run"
            } catch (e) {
                assert.equal(e, "Value must be between 50 and 100");
            }
        });
    });
    describe("Function validation", function() {
        it("should work with deferred result", () => {
            return new V.FuncValidator((i) => {
                var deferred = Q.defer();
                setTimeout(function () {
                    deferred.resolve("done");
                }, 10);
                return deferred.promise;
            }).validate("").then((res) => {
                assert.equal(res, "done");
            });
        });
        
        it("should fail with deferred error", () => {
            return new V.FuncValidator((i) => {
                var deferred = Q.defer();
                setTimeout(function () {
                    deferred.reject("fail");
                }, 10);
                return deferred.promise;
            }).validate("").catch((res) => {
                assert.deepEqual(res, {"": ["fail"]});
            });
        });
    });
    describe("Object path validation", function() {
        it("should work", () => {
            var obj = {
                id: 123,
                name: "John Doe",
                age: 3.14
            }
            return V.object({
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
            return V.object({
                    "id": V.integer,
                    "name": V.required(V.string),
                    "age": V.required(V.float),
                }).validatePath(obj, "name", "").catch((err) => {
                    assert.deepEqual(err, { "name": ["This field is required"] });
                })
        });
        
        it("should be able to access object", () => {
            return V.object({
                "product": V.required(V.string),
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
            return V.object({
                "product": V.required(V.string),
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
            return V.object({
                "id": V.integer,
                "name": V.required(V.string),
                "age": V.required(V.float),
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
            return V.object({
                "id": V.integer,
                "name": V.required(V.string),
                "age": V.required(V.float),
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
            return V.object({
                    "id": V.integer,
                    "name": V.required(V.string),
                    "age": V.required(V.float),
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
                id : undefined
            }
            return V.object({
                    "id": V.integer,
                    "name": V.string,
                    "age": V.float,
                }).validate(obj).then((res) => {
                    assert.deepEqual(res, {
                        id : 0,
                        name : "",
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
            return V.object({
                "name": V.required(V.string),
                "address": V.object({
                    "street": V.string,
                    "city": V.required(V.string)
                })
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
            return V.object({
                "name": V.required(V.string),
                "address": V.object({
                    "street": V.required(V.string),
                    "city": V.required(V.string)
                })
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
            return V.object({ "0" : V.string })
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
            return V.object({
                "name": V.required(V.string),
                "address": V.object({
                    "street": V.required(V.string),
                    "city": V.required(V.string)
                })
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
            return V.object({
                "aaa": V.object({
                    "bbb": V.object({
                        "ccc" : V.required(V.integer)
                    })
                })
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
            return V.object({
                "aaa": V.object({
                    "bbb": V.object({
                        "ccc" : V.required(V.integer)
                    })
                })
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

            return V.array(V.string).validate(arr).then((val) => {
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

            return V.array(V.object({
                "name": (i) => V.required(V.string(i)),
                "age": V.float
            })).validate(objs).then((val) => {
                assert.deepEqual(val, objs);
            });
        });
        
        it("of simple functios should raise errors", function() {
            var arr = ["", ""];

            return V.array((i) => V.required(V.string(i))).validate(arr).catch((errs) => {
                assert.deepEqual(errs, {
                    "[0]" : ["This field is required"],
                    "[1]" : ["This field is required"]
                });
            });
        });
        it("of arrays should raise errors", function() {
            var arr = [[["", ""]]];

            return V.array(V.array(V.array((i) => V.required(V.string(i)))))
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

            return  V.object({
                "aaa" : V.array(V.object({
                    "bbb" : V.array(V.object({
                        "ccc" : (i) => V.required(V.string(i))
                    }))
                }))
            }).validate(thing).then((val) => {
                assert.deepEqual(val, thing);
            });
        });
        
        it("should raise errors", function() {
            var thing = {"aaa" : [{"bbb" : [{"ccc" : ""}]}]};

            return V.object({
                "aaa" : V.array(V.object({
                    "bbb" : V.array(V.object({
                        "ccc" : (i) => V.required(V.string(i))
                    }))
                }))
            }).validate(thing).catch((errs) => {
                assert.deepEqual(errs, {
                    "aaa[0].bbb[0].ccc" : ["This field is required"]
                });
            });
        });
    })
});
