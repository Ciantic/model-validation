/// <reference path="../typings/mocha/mocha.d.ts" />
/// <reference path="../typings/assert/assert.d.ts" />
/// <reference path="../typings/lodash/lodash.d.ts" />
var V = require("../index");
var assert = require("assert");
describe("Utils", function () {
    var obj = {
        "name": "John Doe",
        "address": {
            "street": "Homestreet 123",
            "city": "Someville"
        }
    };
    it("get using without dots should work", function () {
        assert.deepEqual(V.getUsingDotArrayNotation(obj, "name"), "John Doe");
    });
    it("get using dot notation should work", function () {
        assert.deepEqual(V.getUsingDotArrayNotation(obj, "address.city"), "Someville");
    });
    it("get using very deep dot notation should work", function () {
        assert.deepEqual(V.getUsingDotArrayNotation({ 'a': { 'b': { 'c': { 'd': 42 } } } }, "a.b.c.d"), 42);
    });
    it("set using without dots should work", function () {
        var copy = V.setUsingDotArrayNotation(obj, "name", "Not a Dummy");
        assert.deepEqual(copy, {
            "name": "Not a Dummy",
            "address": {
                "street": "Homestreet 123",
                "city": "Someville"
            }
        });
    });
    it("set using dots should work", function () {
        var copy = V.setUsingDotArrayNotation(obj, "address.city", "Otherville");
        assert.deepEqual(copy, {
            "name": "John Doe",
            "address": {
                "street": "Homestreet 123",
                "city": "Otherville"
            }
        });
    });
});
describe("Validations", function () {
    describe("Object field validation", function () {
        var validator = new V.ObjectValidator({
            "id": V.integer,
            "name": function (i) { return V.required(V.str(i)); },
            "age": function (i) { return V.required(V.float(i)); },
        });
        it("should work", function () {
            var obj = {
                id: 123,
                name: "John Doe",
                age: 3.14
            };
            return validator.validateField(obj, "name", "Cameleont").then(function (res) {
                assert.equal(res.isValid, true);
                assert.deepEqual(res.value, {
                    id: 123,
                    name: "Cameleont",
                    age: 3.14
                });
                assert.deepEqual(res.errors, {});
            });
        });
        it("should raise a specific error only", function () {
            var obj = {
                id: 123,
                name: "John Doe",
                age: 0
            };
            return validator.validateField(obj, "name", "").then(function (res) {
                assert.deepEqual(res.errors, { "name": ["This field is required"] });
                assert.equal(res.isValid, false);
                assert.deepEqual(res.value, {
                    id: 123,
                    name: "John Doe",
                    age: 0
                });
            });
        });
        it("should give object back when not validating", function () {
            var obj = { "not a valid": true };
            return validator.validateField(obj, "name", "").then(function (res) {
                assert.equal(res.isValid, false);
                assert.deepEqual(res.value, { "not a valid": true });
                assert.deepEqual(res.errors, { "name": ["This field is required"] });
            });
        });
        var pizzaValidator = new V.ObjectValidator({
            "product": function (i) { return V.required(V.str(i)); },
            "price": function (i, o) { if (o.product != "pizza")
                throw o.product + " is not a pizza"; return 7.95; },
        });
        it("should be able to access object", function () {
            return pizzaValidator.validate({
                "product": "pizza",
                "price": 0
            }).then(function (res) {
                assert.equal(res.isValid, true);
                assert.deepEqual(res.value, {
                    "product": "pizza",
                    "price": 7.95
                });
                assert.deepEqual(res.errors, {});
            });
        });
        it("should be able to raise error by object value", function () {
            return pizzaValidator.validate({
                "product": "Orange",
                "price": 0
            }).then(function (res) {
                assert.equal(res.isValid, false);
                assert.deepEqual(res.value, {
                    "product": "Orange",
                    "price": 0
                });
                assert.deepEqual(res.errors, { "price": ["Orange is not a pizza"] });
            });
        });
    });
    describe("Object validation", function () {
        var validator = new V.ObjectValidator({
            "id": V.integer,
            "name": function (i) { return V.required(V.str(i)); },
            "age": function (i) { return V.required(V.float(i)); },
        });
        it("should work", function () {
            var obj = {
                id: 123,
                name: "John Doe",
                age: 3.14
            };
            return validator.validate(obj).then(function (res) {
                assert.equal(res.isValid, true);
                assert.deepEqual(res.value, obj);
                assert.deepEqual(res.errors, {});
            });
        });
        it("should raise all errors", function () {
            var obj = {
                id: 123,
                name: "",
                age: 0
            };
            return validator.validate(obj).then(function (res) {
                assert.equal(res.isValid, false);
                assert.deepEqual(res.value, obj);
                assert.deepEqual(res.errors, {
                    "age": ["This field is required"],
                    "name": ["This field is required"]
                });
            });
        });
    });
    describe("Nested object validation", function () {
        it("should work with object", function () {
            var validator = new V.ObjectValidator({
                "name": function (i) { return V.required(V.str(i)); },
                "address": {
                    "street": V.str,
                    "city": function (i) { return V.required(V.str(i)); }
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
            }).then(function (res) {
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
        it("should work with validator", function () {
            var validator = new V.ObjectValidator({
                "name": function (i) { return V.required(V.str(i)); },
                "address": new V.ObjectValidator({
                    "street": V.str,
                    "city": function (i) { return V.required(V.str(i)); }
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
            }).then(function (res) {
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
            "name": function (i) { return V.required(V.str(i)); },
            "address": {
                "street": function (i) { return V.required(V.str(i)); },
                "city": function (i) { return V.required(V.str(i)); }
            }
        });
        it("should work with a dot notation", function () {
            var obj = {
                name: "John Doe",
                address: {
                    "street": "Homestreet 123",
                    "city": "Someville"
                }
            };
            return dotValidator.validateField(obj, "address.city", "Otherville").then(function (res) {
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
        it("should raise nested errors with a dot notation", function () {
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
            }).then(function (res) {
                assert.deepEqual(res.errors, {
                    "address.street": ["This field is required"],
                    "address.city": ["This field is required"]
                });
                assert.equal(res.isValid, false);
                assert.deepEqual(res.value, obj);
            });
        });
    });
});
