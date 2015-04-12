/// <reference path="../typings/mocha/mocha.d.ts" />
/// <reference path="../typings/assert/assert.d.ts" />
/// <reference path="../typings/lodash/lodash.d.ts" />
var V = require("../index");
var assert = require("assert");
describe("Validations", function () {
    describe("Validator creation", function () {
        it("should create object validators", function () {
            var validator = V.validator({
                'a': V.integer
            });
            assert.equal(validator instanceof V.ObjectValidator, true);
            assert.equal(validator.fields['a'] instanceof V.FuncValidator, true);
        });
        it("should create nested object validators", function () {
            var validator = V.validator({
                'a': {
                    'b': V.integer
                }
            });
            assert.equal(validator instanceof V.ObjectValidator, true);
            assert.equal(validator.fields['a'].fields['b'] instanceof V.FuncValidator, true);
        });
        it("should create function validators", function () {
            var validator = V.validator(V.integer);
            assert.equal(validator instanceof V.FuncValidator, true);
        });
        it("should create array validators", function () {
            var validator = V.validator([V.integer]);
            assert.equal(validator instanceof V.ArrayValidator, true);
            assert.equal(validator.validator instanceof V.FuncValidator, true);
        });
    });
    describe("Object path validation", function () {
        it("should work", function () {
            var obj = {
                id: 123,
                name: "John Doe",
                age: 3.14
            };
            return V.validator({
                "id": V.integer,
                "name": function (i) { return V.required(V.str(i)); },
                "age": function (i) { return V.required(V.float(i)); },
            }).validatePath(obj, "name", "Cameleont").then(function (res) {
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
            return V.validator({
                "id": V.integer,
                "name": function (i) { return V.required(V.str(i)); },
                "age": function (i) { return V.required(V.float(i)); },
            }).validatePath(obj, "name", "").then(function (res) {
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
            return V.validator({
                "id": V.integer,
                "name": function (i) { return V.required(V.str(i)); },
                "age": function (i) { return V.required(V.float(i)); },
            }).validatePath(obj, "name", "").then(function (res) {
                assert.equal(res.isValid, false);
                assert.deepEqual(res.value, { "not a valid": true });
                assert.deepEqual(res.errors, { "name": ["This field is required"] });
            });
        });
        it("should be able to access object", function () {
            return V.validator({
                "product": function (i) { return V.required(V.str(i)); },
                "price": function (i, o) { if (o.product != "pizza")
                    throw o.product + " is not a pizza"; return 7.95; },
            }).validate({
                "product": "pizza",
                "price": 0
            }).then(function (res) {
                assert.deepEqual(res.errors, {});
                assert.equal(res.isValid, true);
                assert.deepEqual(res.value, {
                    "product": "pizza",
                    "price": 7.95
                });
            });
        });
        it("should be able to raise error by object value", function () {
            return V.validator({
                "product": function (i) { return V.required(V.str(i)); },
                "price": function (i, o) { if (o.product != "pizza")
                    throw o.product + " is not a pizza"; return 7.95; },
            }).validate({
                "product": "Orange",
                "price": 0
            }).then(function (res) {
                assert.deepEqual(res.errors, { "price": ["Orange is not a pizza"] });
                assert.equal(res.isValid, false);
                assert.deepEqual(res.value, {
                    "product": "Orange",
                    "price": 0
                });
            });
        });
    });
    describe("Object validation", function () {
        it("should work", function () {
            var obj = {
                id: 123,
                name: "John Doe",
                age: 3.14
            };
            return V.validator({
                "id": V.integer,
                "name": function (i) { return V.required(V.str(i)); },
                "age": function (i) { return V.required(V.float(i)); },
            }).validate(obj).then(function (res) {
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
            return V.validator({
                "id": V.integer,
                "name": function (i) { return V.required(V.str(i)); },
                "age": function (i) { return V.required(V.float(i)); },
            }).validate(obj).then(function (res) {
                assert.equal(res.isValid, false);
                assert.deepEqual(res.value, obj);
                assert.deepEqual(res.errors, {
                    "age": ["This field is required"],
                    "name": ["This field is required"]
                });
            });
        });
        it("should omit extra fields", function () {
            var obj = {
                id: 5,
                name: "John Doe",
                age: 30,
                occupation: "Magician"
            };
            return V.validator({
                "id": V.integer,
                "name": function (i) { return V.required(V.str(i)); },
                "age": function (i) { return V.required(V.float(i)); },
            }).validate(obj).then(function (res) {
                assert.equal(res.isValid, true);
                assert.deepEqual(res.value, {
                    id: 5,
                    name: "John Doe",
                    age: 30
                });
                assert.deepEqual(res.errors, {});
            });
        });
        it("should create missing fields", function () {
            var obj = {
                id: 5,
                name: "John Doe",
            };
            return V.validator({
                "id": V.integer,
                "name": function (i) { return V.required(V.str(i)); },
                "age": function (i) { return V.float(i); },
            }).validate(obj).then(function (res) {
                assert.equal(res.isValid, true);
                assert.deepEqual(res.value, {
                    id: 5,
                    name: "John Doe",
                    age: 0
                });
                assert.deepEqual(res.errors, {});
            });
        });
    });
    describe("Nested object validation", function () {
        it("should work with object", function () {
            var obj = {
                name: "John Doe",
                address: {
                    "street": "Homestreet 123",
                    "city": "Someville"
                }
            };
            return V.validator({
                "name": function (i) { return V.required(V.str(i)); },
                "address": {
                    "street": V.str,
                    "city": function (i) { return V.required(V.str(i)); }
                }
            }).validatePath(obj, "address", {
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
        it("should work with a dot notation", function () {
            var obj = {
                name: "John Doe",
                address: {
                    "street": "Homestreet 123",
                    "city": "Someville"
                }
            };
            return V.validator({
                "name": function (i) { return V.required(V.str(i)); },
                "address": {
                    "street": function (i) { return V.required(V.str(i)); },
                    "city": function (i) { return V.required(V.str(i)); }
                }
            }).validatePath(obj, "address.city", "Otherville").then(function (res) {
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
        it("should work with a dot notation even when zero is key", function () {
            return V.validator({ "0": V.str }).validatePath({ "0": "Okay" }, "0", "Something else").then(function (res) {
                assert.deepEqual(res.errors, {});
                assert.equal(res.isValid, true);
                assert.deepEqual(res.value, { "0": "Something else" });
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
            return V.validator({
                "name": function (i) { return V.required(V.str(i)); },
                "address": {
                    "street": function (i) { return V.required(V.str(i)); },
                    "city": function (i) { return V.required(V.str(i)); }
                }
            }).validatePath(obj, "address", {
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
        it("should raise really nested errors with a dot notation", function () {
            var obj = {
                "aaa": {
                    "bbb": {
                        "ccc": 15
                    }
                }
            };
            return V.validator({
                "aaa": {
                    "bbb": {
                        "ccc": function (i) { return V.required(V.integer(i)); }
                    }
                }
            }).validatePath(obj, "aaa.bbb.ccc", 0).then(function (res) {
                assert.deepEqual(res.errors, {
                    "aaa.bbb.ccc": ["This field is required"],
                });
                assert.equal(res.isValid, false);
                assert.deepEqual(res.value, obj);
            });
        });
        it("should raise really nested errors with a dot notation when object validating", function () {
            var obj = {
                "aaa": {
                    "bbb": {
                        "ccc": 0
                    }
                }
            };
            return V.validator({
                "aaa": {
                    "bbb": {
                        "ccc": function (i) { return V.required(V.integer(i)); }
                    }
                }
            }).validate(obj).then(function (res) {
                assert.deepEqual(res.errors, {
                    "aaa.bbb.ccc": ["This field is required"],
                });
                assert.equal(res.isValid, false);
                assert.deepEqual(res.value, obj);
            });
        });
    });
    describe("Array validation", function () {
        it("of simple functions should work", function () {
            var arr = ["first", "second"];
            return V.validator([V.str]).validate(arr).then(function (res) {
                assert.deepEqual(res.errors, {});
                assert.equal(res.isValid, true);
                assert.deepEqual(res.value, arr);
            });
        });
        it("of objects validation should work", function () {
            var objs = [
                {
                    name: "John Doe",
                    age: 57
                }, {
                    name: "Little Doe",
                    age: 13
                }];
            return V.validator([{
                    "name": function (i) { return V.required(V.str(i)); },
                    "age": V.float
                }]).validate(objs).then(function (res) {
                assert.deepEqual(res.errors, {});
                assert.equal(res.isValid, true);
                assert.deepEqual(res.value, objs);
            });
        });
        it("of simple functios should raise errors", function () {
            var arr = ["", ""];
            return V.validator([function (i) { return V.required(V.str(i)); }]).validate(arr).then(function (res) {
                assert.deepEqual(res.errors, { "[0]": ["This field is required"], "[1]": ["This field is required"] });
                assert.equal(res.isValid, false);
                assert.deepEqual(res.value, arr);
            });
        });
        it("of arrays should raise errors", function () {
            var arr = [[["", ""]]];
            return V.validator([[[function (i) { return V.required(V.str(i)); }]]])
                .validate(arr).then(function (res) {
                assert.deepEqual(res.errors, {
                    "[0][0][0]": ["This field is required"],
                    "[0][0][1]": ["This field is required"]
                });
                assert.equal(res.isValid, false);
                assert.deepEqual(res.value, arr);
            });
        });
    });
    describe("Mishmash of weird things", function () {
        it("should work", function () {
            var thing = { "aaa": [{ "bbb": [{ "ccc": "thingie" }] }] };
            return V.validator({
                "aaa": [{ "bbb": [{ "ccc": function (i) { return V.required(V.str(i)); } }] }]
            }).validate(thing).then(function (res) {
                assert.deepEqual(res.errors, {});
                assert.equal(res.isValid, true);
                assert.deepEqual(res.value, thing);
            });
        });
        it("should raise errors", function () {
            var thing = { "aaa": [{ "bbb": [{ "ccc": "" }] }] };
            return V.validator({
                "aaa": [{ "bbb": [{ "ccc": function (i) { return V.required(V.str(i)); } }] }]
            }).validate(thing).then(function (res) {
                assert.deepEqual(res.errors, {
                    "aaa[0].bbb[0].ccc": ["This field is required"]
                });
                assert.equal(res.isValid, false);
                assert.deepEqual(res.value, thing);
            });
        });
    });
});
