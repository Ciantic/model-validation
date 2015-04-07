/// <reference path="../typings/mocha/mocha.d.ts" />
/// <reference path="../typings/assert/assert.d.ts" />
/// <reference path="../typings/lodash/lodash.d.ts" />
var V = require("../index");
var assert = require("assert");
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
                assert.equal(res.isValid, false);
                assert.deepEqual(res.value, {
                    id: 123,
                    name: "John Doe",
                    age: 0
                });
                assert.deepEqual(res.errors, { "name": ["This field is required"] });
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
        var validator = new V.ObjectValidator({
            "name": function (i) { return V.required(V.str(i)); },
            "address": {
                "street": V.str,
                "city": function (i) { return V.required(V.str(i)); }
            }
        });
        it("should work", function () {
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
        it("should raise nested errors", function () {
            var obj = {
                name: "John Doe",
                address: {
                    "street": "Homestreet 123",
                    "city": "Someville"
                }
            };
            return validator.validateField(obj, "address", {
                "street": "Backalley 321",
                "city": ""
            }).then(function (res) {
                assert.deepEqual(res.errors, { "address.city": ["This field is required"] });
                assert.equal(res.isValid, false);
                assert.deepEqual(res.value, obj);
            });
        });
    });
    describe("Array of objects validation", function () {
        var validator = new V.ArrayValidator({
            "name": function (i) { return V.required(V.str(i)); },
            "age": V.float
        });
        it("should work", function () {
            var objs = [
                {
                    name: "John Doe",
                    age: 57
                }, {
                    name: "Little Doe",
                    age: 13
                }];
            return validator.validate(objs).then(function (res) {
                assert.deepEqual(res.errors, {});
                assert.equal(res.isValid, true);
                assert.deepEqual(res.value, objs);
            });
        });
    });
});
