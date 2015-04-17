/// <reference path="../typings/mocha/mocha.d.ts" />
/// <reference path="../typings/assert/assert.d.ts" />
/// <reference path="../typings/lodash/lodash.d.ts" />
var V = require("../index");
var assert = require("assert");
describe("Validations", function () {
    describe("Validation functions", function () {
        it("required", function () {
            assert.equal(V.required("yes"), "yes");
            try {
                V.required("");
                throw "Must not run";
            }
            catch (f) {
                assert.equal(f, "This field is required");
            }
        });
        it("required with function", function () {
            assert.equal(V.required(V.string)("yes"), "yes");
            try {
                V.required(function (i, c) {
                    assert.equal(c, "context");
                    assert.equal(i, "falzy");
                    return "falzy";
                }, "falzy")("falzy", "context");
                throw "Must not run";
            }
            catch (e) {
                assert.equal(e, "This field is required");
            }
        });
        it("string", function () {
            assert.strictEqual(V.string(1.23), "1.23");
        });
        it("integer", function () {
            assert.strictEqual(V.integer(3.14), 3);
            assert.strictEqual(V.integer("3.14"), 3);
            assert.strictEqual(V.integer(undefined), 0);
        });
        it("float", function () {
            assert.strictEqual(V.float(3.14), 3.14);
            assert.strictEqual(V.float("3.14"), 3.14);
            assert.strictEqual(V.float(undefined), 0);
        });
        it("isString", function () {
            assert.strictEqual(V.isString("word"), "word");
            try {
                V.isString(3.14);
                throw "Must not run";
            }
            catch (f) {
                assert.equal(f, "Must be a string");
            }
        });
        it("isInteger", function () {
            assert.strictEqual(V.isInteger(3), 3);
            try {
                V.isInteger(3.14);
                throw "Must not run";
            }
            catch (f) {
                assert.equal(f, "Must be an integer");
            }
        });
        it("isFloat", function () {
            assert.strictEqual(V.isFloat("3.14"), 3.14);
            try {
                V.isFloat("a");
                throw "Must not run";
            }
            catch (f) {
                assert.equal(f, "Must be an decimal number");
            }
        });
        it("min", function () {
            assert.strictEqual(V.min(5, 100), 100);
            assert.strictEqual((V.min(5, V.float))(100), 100);
            assert.strictEqual((V.min(5))(100), 100);
            assert.strictEqual((V.min(5, function (i) {
                return 100;
            }))(null), 100);
            try {
                V.min(5, 4);
                throw "Must not run";
            }
            catch (e) {
                assert.equal(e, "Value must be at least: 5");
            }
            try {
                (V.min(5, V.float))(4);
                throw "Must not run";
            }
            catch (e) {
                assert.equal(e, "Value must be at least: 5");
            }
            try {
                (V.min(5))(4);
                throw "Must not run";
            }
            catch (e) {
                assert.equal(e, "Value must be at least: 5");
            }
        });
        it("max", function () {
            assert.strictEqual(V.max(100, 5), 5);
            assert.strictEqual((V.max(100, V.float))(5), 5);
            assert.strictEqual((V.max(100))(5), 5);
            assert.strictEqual((V.max(100, function (i) {
                return 5;
            }))(null), 5);
            try {
                V.max(5, 10);
                throw "Must not run";
            }
            catch (e) {
                assert.equal(e, "Value must not be greater than: 5");
            }
            try {
                (V.max(5, V.float))(10);
                throw "Must not run";
            }
            catch (e) {
                assert.equal(e, "Value must not be greater than: 5");
            }
            try {
                (V.max(5))(10);
                throw "Must not run";
            }
            catch (e) {
                assert.equal(e, "Value must not be greater than: 5");
            }
        });
        it("between", function () {
            assert.strictEqual(V.between(50, 100, 70), 70);
            assert.strictEqual((V.between(50, 100, V.float))(70), 70);
            assert.strictEqual((V.between(50, 100))(70), 70);
            assert.strictEqual((V.between(50, 100, function (i) {
                return 70;
            }))(null), 70);
            try {
                V.between(50, 100, 10);
                throw "Must not run";
            }
            catch (e) {
                assert.equal(e, "Value must be between 50 and 100");
            }
            try {
                (V.between(50, 100, V.float))(10);
                throw "Must not run";
            }
            catch (e) {
                assert.equal(e, "Value must be between 50 and 100");
            }
            try {
                (V.between(50, 100))(10);
                throw "Must not run";
            }
            catch (e) {
                assert.equal(e, "Value must be between 50 and 100");
            }
        });
    });
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
        it("should allow composability of validators", function () {
            var firstValidator = V.validator({
                'b': V.integer
            });
            var validator = V.validator({
                'a': firstValidator
            });
            assert.equal("first_" + (validator instanceof V.ObjectValidator), "first_true");
            assert.equal("second_" + (validator.fields['a'] instanceof V.ObjectValidator), "second_true");
            assert.equal("third_" + (validator.fields['a'].fields['b'] instanceof V.FuncValidator), "third_true");
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
                "name": V.required(V.string),
                "age": V.required(V.float),
            }).validatePath(obj, "name", "Cameleont").then(function (res) {
                assert.deepEqual(res, {
                    id: 123,
                    name: "Cameleont",
                    age: 3.14
                });
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
                "name": V.required(V.string),
                "age": V.required(V.float),
            }).validatePath(obj, "name", "").catch(function (err) {
                assert.deepEqual(err, { "name": ["This field is required"] });
            });
        });
        it("should be able to access object", function () {
            return V.validator({
                "product": V.required(V.string),
                "price": function (i, o) { if (o.product != "pizza")
                    throw o.product + " is not a pizza"; return 7.95; },
            }).validate({
                "product": "pizza",
                "price": 0
            }).then(function (res) {
                assert.deepEqual(res, {
                    "product": "pizza",
                    "price": 7.95
                });
            });
        });
        it("should be able to raise error by object value", function () {
            return V.validator({
                "product": V.required(V.string),
                "price": function (i, o) { if (o.product != "pizza")
                    throw o.product + " is not a pizza"; return 7.95; },
            }).validate({
                "product": "Orange",
                "price": 0
            }).catch(function (errs) {
                assert.deepEqual(errs, { "price": ["Orange is not a pizza"] });
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
                "name": V.required(V.string),
                "age": V.required(V.float),
            }).validate(obj).then(function (res) {
                assert.deepEqual(res, obj);
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
                "name": V.required(V.string),
                "age": V.required(V.float),
            }).validate(obj).catch(function (errs) {
                assert.deepEqual(errs, {
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
                "name": V.required(V.string),
                "age": V.required(V.float),
            }).validate(obj).then(function (res) {
                assert.deepEqual(res, {
                    id: 5,
                    name: "John Doe",
                    age: 30
                });
            });
        });
        it("should create missing fields", function () {
            var obj = {
                id: 5,
                name: "John Doe",
            };
            return V.validator({
                "id": V.integer,
                "name": V.required(V.string),
                "age": V.float,
            }).validate(obj).then(function (res) {
                assert.deepEqual(res, {
                    id: 5,
                    name: "John Doe",
                    age: 0
                });
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
                "name": V.required(V.string),
                "address": {
                    "street": V.string,
                    "city": V.required(V.string)
                }
            }).validatePath(obj, "address", {
                "street": "Backalley 321",
                "city": "Otherville"
            }).then(function (res) {
                assert.deepEqual(res, {
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
                "name": V.required(V.string),
                "address": {
                    "street": V.required(V.string),
                    "city": V.required(V.string)
                }
            }).validatePath(obj, "address.city", "Otherville").then(function (res) {
                assert.deepEqual(res, {
                    name: "John Doe",
                    address: {
                        "street": "Homestreet 123",
                        "city": "Otherville"
                    }
                });
            });
        });
        it("should work with a dot notation even when zero is key", function () {
            return V.validator({ "0": V.string })
                .validatePath({ "0": "Okay" }, "0", "Something else").then(function (res) {
                assert.deepEqual(res, { "0": "Something else" });
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
                "name": V.required(V.string),
                "address": {
                    "street": V.required(V.string),
                    "city": V.required(V.string)
                }
            }).validatePath(obj, "address", {
                "street": "",
                "city": ""
            }).catch(function (errs) {
                assert.deepEqual(errs, {
                    "address.street": ["This field is required"],
                    "address.city": ["This field is required"]
                });
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
                        "ccc": V.required(V.integer)
                    }
                }
            }).validatePath(obj, "aaa.bbb.ccc", 0).catch(function (errs) {
                assert.deepEqual(errs, {
                    "aaa.bbb.ccc": ["This field is required"],
                });
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
                        "ccc": V.required(V.integer)
                    }
                }
            }).validate(obj).catch(function (errs) {
                assert.deepEqual(errs, {
                    "aaa.bbb.ccc": ["This field is required"],
                });
            });
        });
    });
    describe("Array validation", function () {
        it("of simple functions should work", function () {
            var arr = ["first", "second"];
            return V.validator([V.string]).validate(arr).then(function (val) {
                assert.deepEqual(val, arr);
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
                    "name": function (i) { return V.required(V.string(i)); },
                    "age": V.float
                }]).validate(objs).then(function (val) {
                assert.deepEqual(val, objs);
            });
        });
        it("of simple functios should raise errors", function () {
            var arr = ["", ""];
            return V.validator([function (i) { return V.required(V.string(i)); }]).validate(arr).catch(function (errs) {
                assert.deepEqual(errs, {
                    "[0]": ["This field is required"],
                    "[1]": ["This field is required"]
                });
            });
        });
        it("of arrays should raise errors", function () {
            var arr = [[["", ""]]];
            return V.validator([[[function (i) { return V.required(V.string(i)); }]]])
                .validate(arr).catch(function (errs) {
                assert.deepEqual(errs, {
                    "[0][0][0]": ["This field is required"],
                    "[0][0][1]": ["This field is required"]
                });
            });
        });
    });
    describe("Mishmash of weird things", function () {
        it("should work", function () {
            var thing = { "aaa": [{ "bbb": [{ "ccc": "thingie" }] }] };
            return V.validator({
                "aaa": [{ "bbb": [{ "ccc": function (i) { return V.required(V.string(i)); } }] }]
            }).validate(thing).then(function (val) {
                assert.deepEqual(val, thing);
            });
        });
        it("should raise errors", function () {
            var thing = { "aaa": [{ "bbb": [{ "ccc": "" }] }] };
            return V.validator({
                "aaa": [{ "bbb": [{ "ccc": function (i) { return V.required(V.string(i)); } }] }]
            }).validate(thing).catch(function (errs) {
                assert.deepEqual(errs, {
                    "aaa[0].bbb[0].ccc": ["This field is required"]
                });
            });
        });
    });
});
