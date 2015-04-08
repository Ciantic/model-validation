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
            ["John Doe", "name", ""]
        );
    });
    
    it("get using dot notation should work", () => {
        assert.deepEqual(
            V.getUsingDotArrayNotation(obj, "address.city"),
            ["Someville", "city", "address."]
        );
    });
    
    it("get using very deep dot notation should work", () => {
        assert.deepEqual(
            V.getUsingDotArrayNotation({'a' : {'b' : {'c' : {'d' : 42}}}}, "a.b.c.d"),
            [42,"d","a.b.c."]
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
});
describe("Validations", function() {
    describe("Object field validation", function() {
        var validator = new V.ObjectValidator({
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
            return validator.validateField(obj, "name", "Cameleont").then((res) => {
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
            return validator.validateField(obj, "name", "").then((res) => {
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
            return validator.validateField(obj, "name", "").then((res) => {
                assert.equal(res.isValid, false);
                assert.deepEqual(res.value, { "not a valid": true });
                assert.deepEqual(res.errors, { "name": ["This field is required"] });
            });
        });
        
        var pizzaValidator = new V.ObjectValidator({
            "product": (i) => V.required(V.str(i)),
            "price": (i, o) => { if (o.product != "pizza") throw o.product + " is not a pizza"; return 7.95; },
        });
        
        it("should be able to access object", () => {
            return pizzaValidator.validate({
                "product" : "pizza",
                "price" : 0
            }).then((res) => {
                assert.equal(res.isValid, true);
                assert.deepEqual(res.value, {
                    "product" : "pizza",
                    "price" : 7.95
                });
                assert.deepEqual(res.errors, {});
            });
        });
        
        it("should be able to raise error by object value", () => {
            return pizzaValidator.validate({
                "product" : "Orange",
                "price" : 0
            }).then((res) => {
                assert.equal(res.isValid, false);
                assert.deepEqual(res.value, {
                    "product" : "Orange",
                    "price" : 0
                });
                assert.deepEqual(res.errors, {"price":["Orange is not a pizza"]});
            });
        });
    });

    describe("Object validation", function() {
        var validator = new V.ObjectValidator({
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
            var validator = new V.ObjectValidator({
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
            return validator.validateField(obj, "address", {
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
        
        it("should work with validator", function() {
            var validator = new V.ObjectValidator({
                "name": (i) => V.required(V.str(i)),
                "address": new V.ObjectValidator({
                    "street": V.str,
                    "city": (i) => V.required(V.str(i))
                })
            });
            var obj = {
                name: "John Doe",
                address: {
                    "street": "Homestreet 123",
                    "city": "Someville"
                }
            };
            return validator.validateField(obj, "address", {
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
        
        var dotValidator = new V.ObjectValidator({
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
            return dotValidator.validateField(obj, "address.city", "Otherville").then((res) => {
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
            return dotValidator.validateField(obj, "address", {
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
    });
    
    /*
    describe("Array of objects validation", function() {
        var validator = new V.ArrayValidator({
            "name": (i) => V.required(V.str(i)),
            "age": V.float
        });
        
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
    */
});
