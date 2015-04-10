/// <reference path="../typings/mocha/mocha.d.ts" />
/// <reference path="../typings/assert/assert.d.ts" />
/// <reference path="../typings/lodash/lodash.d.ts" />

import V = require("../index");

// Some reason this throws me error assert module is not found:
// import assert = require("assert");

declare var require: any;
var assert = require("assert");
describe("Utils", function() {
    var obj = {
        "name" : "John Doe",
        "address" : {
            "street": "Homestreet 123",
            "city": "Someville"
        }
    };
    
    it("get using without dots should work", () => {
        assert.deepEqual(
            V.getUsingDotArrayNotation(obj, "name"),
            "John Doe"
        );
    });
    
    it("get using dot notation should work", () => {
        assert.deepEqual(
            V.getUsingDotArrayNotation(obj, "address.city"),
            "Someville"
        );
    });
    
    it("get using very deep dot notation should work", () => {
        assert.deepEqual(
            V.getUsingDotArrayNotation({'a' : {'b' : {'c' : {'d' : 42}}}}, "a.b.c.d"),
            42
        );
    });
    
    it("get using array notation should work", () => {
        assert.deepEqual(
            V.getUsingDotArrayNotation(['a','b'], "[1]"),
            'b'
        );
    });
    
    it("get using dot array notation should work", () => {
        assert.deepEqual(
            V.getUsingDotArrayNotation({'a' : ['b', 'c']}, "a.[1]"),
            'c'
        );
    });
    
    it("get using dot array dot notation should work", () => {
        assert.deepEqual(
            V.getUsingDotArrayNotation({'aaa' : ['bbbb', {'ccc' : 'ddd'}]}, "aaa.[1].ccc"),
            'ddd'
        );
    });
    
    it("set using without dots should work", () => {
        var copy = V.setUsingDotArrayNotation(obj, "name", "Not a Dummy");
        
        assert.deepEqual(copy,
            {
                "name" : "Not a Dummy",
                "address" : {
                    "street": "Homestreet 123",
                    "city" : "Someville"
                }
            });
    });
    
    it("set using dots should work", () => {
        var copy = V.setUsingDotArrayNotation(obj, "address.city", "Otherville");
        
        assert.deepEqual(copy,
            {
                "name" : "John Doe",
                "address" : {
                    "street": "Homestreet 123",
                    "city" : "Otherville"
                }
            });
    });
    
    it("set using array notation should work", () => {
        assert.deepEqual(
            V.setUsingDotArrayNotation(['a','b'], "[1]", "c"),
            ['a', 'c']
        );
    });
    
    it("set using dot array notation should work", () => {
        assert.deepEqual(
            V.setUsingDotArrayNotation({'a' : ['b', 'c']}, "a.[1]", "d"),
            {'a' : ['b', 'd']}
        );
    });
    
    it("set using dot array dot notation should work", () => {
        assert.deepEqual(
            V.setUsingDotArrayNotation({'aaa' : ['bbbb', {'ccc' : 'ddd'}]}, "aaa.[1].ccc", "eee"),
            {'aaa' : ['bbbb', {'ccc' : 'eee'}]}
        );
    });
});
describe("Validations", function() {
    describe("Validator creation", function() {
        it("should create object validators", () => {
            var validator = <V.ObjectValidator> V.validator({
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
    });
    describe("Object field validation", function() {
        var validator = V.validator({
                "id": V.integer,
                "name": (i) => V.required(V.str(i)),
                "age": (i) => V.required(V.float(i)),
            });
        
        it("should work", () => {
            var obj = {
                id: 123,
                name: "John Doe",
                age: 3.14
            }
            return validator.validatePath(obj, "name", "Cameleont").then((res) => {
                assert.equal(res.isValid, true);
                assert.deepEqual(res.value, {
                    id: 123,
                    name: "Cameleont",
                    age: 3.14
                });
                assert.deepEqual(res.errors, {});
            });
        });
        
        it("should raise a specific error only", () => {
            var obj = {
                id: 123,
                name: "John Doe",
                age: 0 // Note: this is invalid when validating all
            }
            return validator.validatePath(obj, "name", "").then((res) => {
                assert.deepEqual(res.errors, { "name": ["This field is required"] });
                assert.equal(res.isValid, false);
                assert.deepEqual(res.value, {
                    id: 123,
                    name: "John Doe",
                    age: 0
                });
            })
        });
        
        it("should give object back when not validating", () => {
            var obj = { "not a valid": true }
            return validator.validatePath(obj, "name", "").then((res) => {
                assert.equal(res.isValid, false);
                assert.deepEqual(res.value, { "not a valid": true });
                assert.deepEqual(res.errors, { "name": ["This field is required"] });
            });
        });
        
        var pizzaValidator = V.validator({
            "product": (i) => V.required(V.str(i)),
            "price": (i, o) => { if (o.product != "pizza") throw o.product + " is not a pizza"; return 7.95; },
        });
        
        it("should be able to access object", () => {
            return pizzaValidator.validate({
                "product" : "pizza",
                "price" : 0
            }).then((res) => {
                assert.deepEqual(res.errors, {});
                assert.equal(res.isValid, true);
                assert.deepEqual(res.value, {
                    "product" : "pizza",
                    "price" : 7.95
                });
            });
        });
        
        it("should be able to raise error by object value", () => {
            return pizzaValidator.validate({
                "product" : "Orange",
                "price" : 0
            }).then((res) => {
                assert.deepEqual(res.errors, {"price":["Orange is not a pizza"]});
                assert.equal(res.isValid, false);
                assert.deepEqual(res.value, {
                    "product" : "Orange",
                    "price" : 0
                });
            });
        });
    });

    describe("Object validation", function() {
        var validator = V.validator({
            "id": V.integer,
            "name": (i) => V.required(V.str(i)),
            "age": (i) => V.required(V.float(i)),
        });
        
        it("should work", () => {
            var obj = {
                id: 123,
                name: "John Doe",
                age: 3.14
            }
            return validator.validate(obj).then((res) => {
                assert.equal(res.isValid, true);
                assert.deepEqual(res.value, obj);
                assert.deepEqual(res.errors, {});
            })
        });
        
        it("should raise all errors", () => {
            var obj = {
                id: 123,
                name: "",
                age: 0
            }
            return validator.validate(obj).then((res) => {
                assert.equal(res.isValid, false);
                assert.deepEqual(res.value, obj);
                assert.deepEqual(res.errors, {
                    "age": ["This field is required"],
                    "name": ["This field is required"]
                });
            })
        });
    });

    describe("Nested object validation", function() {
        it("should work with object", function() {
            var validator = V.validator({
                "name": (i) => V.required(V.str(i)),
                "address": {
                    "street": V.str,
                    "city": (i) => V.required(V.str(i))
                }
            });
            var obj = {
                name: "John Doe",
                address: {
                    "street": "Homestreet 123",
                    "city": "Someville"
                }
            };
            return validator.validatePath(obj, "address", {
                "street": "Backalley 321",
                "city": "Otherville"
            }).then((res) => {
                assert.deepEqual(res.errors, {});
                assert.equal(res.isValid, true);
                assert.deepEqual(res.value, {
                    name: "John Doe",
                    address: {
                        "street": "Backalley 321",
                        "city": "Otherville"
                    }
                });
            });
        });
        
        var dotValidator = V.validator({
            "name": (i) => V.required(V.str(i)),
            "address": {
                "street": (i) => V.required(V.str(i)),
                "city": (i) => V.required(V.str(i))
            }
        });
        
        it("should work with a dot notation", function() {
            var obj = {
                name: "John Doe",
                address: {
                    "street": "Homestreet 123",
                    "city": "Someville"
                }
            };
            return dotValidator.validatePath(obj, "address.city", "Otherville").then((res) => {
                assert.deepEqual(res.errors, {});
                assert.equal(res.isValid, true);
                assert.deepEqual(res.value, {
                    name: "John Doe",
                    address: {
                        "street": "Homestreet 123",
                        "city": "Otherville"
                    }
                });
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
            return dotValidator.validatePath(obj, "address", {
                "street": "",
                "city": ""
            }).then((res) => {
                assert.deepEqual(res.errors, {
                    "address.street" : ["This field is required"],
                    "address.city" : ["This field is required"]
                });
                assert.equal(res.isValid, false);
                assert.deepEqual(res.value, obj);
            });
        });
        
        it("should raise really nested errors with a dot notation", function() {
            var deepValidator = V.validator({
                "aaa": {
                    "bbb": {
                        "ccc" : (i) => V.required(V.integer(i))
                    }
                }
            });
            var obj = {
                "aaa": {
                    "bbb": {
                        "ccc" : 15
                    }
                }
            };
            return deepValidator.validatePath(obj, "aaa.bbb.ccc", 0).then((res) => {
                assert.deepEqual(res.errors, {
                    "aaa.bbb.ccc" : ["This field is required"],
                });
                assert.equal(res.isValid, false);
                assert.deepEqual(res.value, obj);
            });
        });
        
        it("should raise really nested errors with a dot notation when object validating", function() {
            var deepValidator = V.validator({
                "aaa": {
                    "bbb": {
                        "ccc" : (i) => V.required(V.integer(i))
                    }
                }
            });
            var obj = {
                "aaa": {
                    "bbb": {
                        "ccc" : 0
                    }
                }
            };
            return deepValidator.validate(obj).then((res) => {
                assert.deepEqual(res.errors, {
                    "aaa.bbb.ccc" : ["This field is required"],
                });
                assert.equal(res.isValid, false);
                assert.deepEqual(res.value, obj);
            });
        });
    });
    
    describe("Array of things should validation", function() {
        var validator = V.validator([V.str]);
        
        it("should work", function() {
            var arr = ["first", "second"];

            return validator.validate(arr).then((res) => {
                assert.deepEqual(res.errors, {});
                assert.equal(res.isValid, true);
                assert.deepEqual(res.value, arr);
            });
        });
    })
    
    describe("Array of objects validation", function() {
        var validator = V.validator([{
            "name": (i) => V.required(V.str(i)),
            "age": V.float
        }]);
        
        it("should work", function() {
            var objs = [
                {
                    name: "John Doe",
                    age: 57
                }, {
                    name: "Little Doe",
                    age: 13
                }];

            return validator.validate(objs).then((res) => {
                assert.deepEqual(res.errors, {});
                assert.equal(res.isValid, true);
                assert.deepEqual(res.value, objs);
            });
        });
    })
    
    describe("Array of things should raise errors", function() {
        var validator = V.validator([(i) => V.required(V.str(i))]);
        
        it("should work", function() {
            var arr = ["", ""];

            return validator.validate(arr).then((res) => {
                assert.deepEqual(res.errors, { "[0]" : ["This field is required"], "[1]" : ["This field is required"]});
                assert.equal(res.isValid, false);
                assert.deepEqual(res.value, arr);
            });
        });
    })
    
    describe("Array of arrays should raise errors", function() {
        var validator = V.validator([[[(i) => V.required(V.str(i))]]]);
        
        it("should work", function() {
            var arr = [[["", ""]]];

            return validator.validate(arr).then((res) => {
                assert.deepEqual(res.errors, {
                    "[0][0][0]" : ["This field is required"],
                    "[0][0][1]" : ["This field is required"] 
                });
                assert.equal(res.isValid, false);
                assert.deepEqual(res.value, arr);
            });
        });
    })
    
    describe("Mishmash of weird things should work", function() {
        var validator = V.validator({
            "aaa" : [{"bbb" : [{"ccc" : (i) => V.required(V.str(i))}]}]
        });
        
        it("should work", function() {
            var thing = {"aaa" : [{"bbb" : [{"ccc" : "thingie"}]}]};

            return validator.validate(thing).then((res) => {
                assert.deepEqual(res.errors, {});
                assert.equal(res.isValid, true);
                assert.deepEqual(res.value, thing);
            });
        });
    })
    
    describe("Mishmash of weird things should raise errors", function() {
        var validator = V.validator({
            "aaa" : [{"bbb" : [{"ccc" : (i) => V.required(V.str(i))}]}]
        });
        
        it("should work", function() {
            var thing = {"aaa" : [{"bbb" : [{"ccc" : ""}]}]};

            return validator.validate(thing).then((res) => {
                assert.deepEqual(res.errors, {
                    "aaa[0].bbb[0].ccc" : ["This field is required"]
                });
                assert.equal(res.isValid, false);
                assert.deepEqual(res.value, thing);
            });
        });
    })
});
