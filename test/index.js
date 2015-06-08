/// <reference path="../typings/mocha/mocha.d.ts" />
/// <reference path="../typings/chai/chai.d.ts" />
/// <reference path="../typings/lodash/lodash.d.ts" />
/// <reference path="../typings/source-map-support/source-map-support.d.ts" />
var source_map_support_1 = require('source-map-support');
var V = require('../index');
var Q = require('q');
var chai_1 = require('chai');
source_map_support_1.install();
describe("Validations", function () {
    describe("Validation functions", function () {
        it("required", function () {
            chai_1.assert.equal(V.required("yes"), "yes");
            try {
                V.required("");
                throw "Must not run";
            }
            catch (f) {
                chai_1.assert.equal(f, "This field is required");
            }
        });
        it("required with function", function () {
            chai_1.assert.equal(V.required(V.string)("yes"), "yes");
            try {
                V.required(function (i, c) {
                    chai_1.assert.equal(c, "context");
                    chai_1.assert.equal(i, "falzy");
                    return "falzy";
                }, "falzy")("falzy", "context");
                throw "Must not run";
            }
            catch (e) {
                chai_1.assert.equal(e, "This field is required");
            }
        });
        it("string", function () {
            chai_1.assert.strictEqual(V.string(1.23), "1.23");
            chai_1.assert.strictEqual(V.string(undefined), "");
        });
        it("integer", function () {
            chai_1.assert.strictEqual(V.integer(3.14), 3);
            chai_1.assert.strictEqual(V.integer("3.14"), 3);
            chai_1.assert.strictEqual(V.integer(undefined), 0);
        });
        it("float", function () {
            chai_1.assert.strictEqual(V.float(3.14), 3.14);
            chai_1.assert.strictEqual(V.float("3.14"), 3.14);
            chai_1.assert.strictEqual(V.float(undefined), 0);
        });
        it("isString", function () {
            chai_1.assert.strictEqual(V.isString("word"), "word");
            try {
                V.isString(3.14);
                throw "Must not run";
            }
            catch (f) {
                chai_1.assert.equal(f, "Must be a string");
            }
        });
        it("isInteger", function () {
            chai_1.assert.strictEqual(V.isInteger(3), 3);
            chai_1.assert.strictEqual(V.isInteger("4"), 4);
            try {
                V.isInteger(3.14);
                throw "Must not run";
            }
            catch (f) {
                chai_1.assert.equal(f, "Must be an integer");
            }
        });
        it("isFloat", function () {
            chai_1.assert.strictEqual(V.isFloat(123.14), 123.14);
            chai_1.assert.strictEqual(V.isFloat("123.14"), 123.14);
            try {
                V.isFloat("a");
                throw "Must not run";
            }
            catch (f) {
                chai_1.assert.equal(f, "Must be an decimal number");
            }
        });
        it("operator", function () {
            var op = V.operator(function (input, arg1) {
                if (input == arg1) {
                    throw "Failure";
                }
                return input;
            }, function (i, c) {
                return i + " " + c;
            }, "fail");
            chai_1.assert.strictEqual(op("test", "context"), "test context");
            var op = V.operator(function (input, arg1) {
                if (input == arg1) {
                    throw "Failure";
                }
                return input;
            }, undefined, "fail");
            chai_1.assert.strictEqual(op("test"), "test");
            try {
                op("fail");
                throw "Must not run";
            }
            catch (e) {
                chai_1.assert.equal(e, "Failure");
            }
            var op = V.operator(function (input, arg1) {
                return input;
            }, "test");
            chai_1.assert.strictEqual(op, "test");
        });
        it("min", function () {
            chai_1.assert.strictEqual(V.min(5, 5), 5);
            chai_1.assert.strictEqual(V.min(5, 100), 100);
            try {
                V.min(5, 4);
                throw "Must not run";
            }
            catch (e) {
                chai_1.assert.equal(e, "Value must be equal or greater than: 5");
            }
        });
        it("minExclusive", function () {
            chai_1.assert.strictEqual(V.minExclusive(5, 100), 100);
            try {
                V.minExclusive(5, 5);
                throw "Must not run";
            }
            catch (e) {
                chai_1.assert.equal(e, "Value must be greater than: 5");
            }
            try {
                V.minExclusive(5, 4);
                throw "Must not run";
            }
            catch (e) {
                chai_1.assert.equal(e, "Value must be greater than: 5");
            }
        });
        it("max", function () {
            chai_1.assert.strictEqual(V.max(5, 5), 5);
            chai_1.assert.strictEqual(V.max(100, 5), 5);
            try {
                V.max(5, 10);
                throw "Must not run";
            }
            catch (e) {
                chai_1.assert.equal(e, "Value must be equal or less than: 5");
            }
        });
        it("maxExclusive", function () {
            chai_1.assert.strictEqual(V.maxExclusive(5, 4), 4);
            try {
                V.maxExclusive(5, 5);
                throw "Must not run";
            }
            catch (e) {
                chai_1.assert.equal(e, "Value must be less than: 5");
            }
            try {
                V.maxExclusive(5, 100);
                throw "Must not run";
            }
            catch (e) {
                chai_1.assert.equal(e, "Value must be less than: 5");
            }
        });
        it("between", function () {
            chai_1.assert.strictEqual(V.between(50, 100, 50), 50);
            chai_1.assert.strictEqual(V.between(50, 100, 100), 100);
            chai_1.assert.strictEqual(V.between(50, 100, 70), 70);
            try {
                V.between(50, 100, 10);
                throw "Must not run";
            }
            catch (e) {
                chai_1.assert.equal(e, "Value must be between 50 and 100");
            }
            try {
                V.between(50, 100, 150);
                throw "Must not run";
            }
            catch (e) {
                chai_1.assert.equal(e, "Value must be between 50 and 100");
            }
        });
        it("betweenExclusive", function () {
            chai_1.assert.strictEqual(V.betweenExclusive(50, 100, 70), 70);
            try {
                V.betweenExclusive(50, 100, 50);
                throw "Must not run";
            }
            catch (e) {
                chai_1.assert.equal(e, "Value must exclusively be between 50 and 100");
            }
            try {
                V.betweenExclusive(50, 100, 100);
                throw "Must not run";
            }
            catch (e) {
                chai_1.assert.equal(e, "Value must exclusively be between 50 and 100");
            }
            try {
                V.betweenExclusive(50, 100, 10);
                throw "Must not run";
            }
            catch (e) {
                chai_1.assert.equal(e, "Value must exclusively be between 50 and 100");
            }
        });
    });
    describe("Function validation", function () {
        it("should work with deferred result", function () {
            return V.func(function (i) {
                var deferred = Q.defer();
                setTimeout(function () {
                    deferred.resolve("done");
                }, 10);
                return deferred.promise;
            }).validate("").then(function (res) {
                chai_1.assert.equal(res, "done");
            });
        });
        it("should fail with deferred error", function () {
            return V.func(function (i) {
                var deferred = Q.defer();
                setTimeout(function () {
                    deferred.reject("fail");
                }, 10);
                return deferred.promise;
            }).validate("").catch(function (res) {
                chai_1.assert.deepEqual(res, { "": ["fail"] });
            });
        });
        it("should progress with deferred", function () {
            var notifies = [];
            return V.func(function (i) {
                var p = Q.defer();
                setTimeout(function () {
                    p.notify("40%");
                }, 10);
                setTimeout(function () {
                    p.notify("70%");
                }, 20);
                setTimeout(function () {
                    p.resolve("final");
                }, 30);
                return p.promise;
            }).validate("")
                .progress(function (v) {
                notifies.push(v[""]);
            })
                .then(function (res) {
                chai_1.assert.deepEqual(notifies, ["40%", "70%"]);
            });
        });
    });
    describe("Object path validation", function () {
        it("should work", function () {
            var obj = {
                id: 123,
                name: "John Doe",
                age: 3.14
            };
            return V.object({
                "id": V.integer,
                "name": V.required(V.string),
                "age": V.required(V.float),
            }).validatePath("name", obj, "Cameleont").then(function (res) {
                chai_1.assert.deepEqual(res, {
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
            return V.object({
                "id": V.integer,
                "name": V.required(V.string),
                "age": V.required(V.float),
            }).validatePath("name", obj, "").catch(function (err) {
                chai_1.assert.deepEqual(err, { "name": ["This field is required"] });
            });
        });
        it("should be able to access object", function () {
            return V.object({
                "product": V.required(V.string),
                "price": function (i, o) { if (o.product != "pizza")
                    throw o.product + " is not a pizza"; return 7.95; },
            }).validate({
                "product": "pizza",
                "price": 0
            }).then(function (res) {
                chai_1.assert.deepEqual(res, {
                    "product": "pizza",
                    "price": 7.95
                });
            });
        });
        it("should be able to raise error by object value", function () {
            return V.object({
                "product": V.required(V.string),
                "price": function (i, o) { if (o.product != "pizza")
                    throw o.product + " is not a pizza"; return 7.95; },
            }).validate({
                "product": "Orange",
                "price": 0
            }).catch(function (errs) {
                chai_1.assert.deepEqual(errs, { "price": ["Orange is not a pizza"] });
            });
        });
        it("should notify progress by path", function () {
            var notifies = [];
            return V.object({
                "file": function () {
                    var p = Q.defer();
                    setTimeout(function () {
                        p.notify("40%");
                    }, 10);
                    setTimeout(function () {
                        p.notify("70%");
                    }, 20);
                    setTimeout(function () {
                        p.resolve("final");
                    }, 30);
                    return p.promise;
                }
            }).validate({
                "file": "upload.zip"
            }).progress(function (s) {
                notifies.push(s["file"]);
            }).then(function () {
                chai_1.assert.deepEqual(notifies, ["40%", "70%"]);
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
            return V.object({
                "id": V.integer,
                "name": V.required(V.string),
                "age": V.required(V.float),
            }).validate(obj).then(function (res) {
                chai_1.assert.deepEqual(res, obj);
            });
        });
        it("should raise all errors", function () {
            var obj = {
                id: 123,
                name: "",
                age: 0
            };
            return V.object({
                "id": V.integer,
                "name": V.required(V.string),
                "age": V.required(V.float),
            }).validate(obj).catch(function (errs) {
                chai_1.assert.deepEqual(errs, {
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
            return V.object({
                "id": V.integer,
                "name": V.required(V.string),
                "age": V.required(V.float),
            }).validate(obj).then(function (res) {
                chai_1.assert.deepEqual(res, {
                    id: 5,
                    name: "John Doe",
                    age: 30
                });
            });
        });
        it("should create missing fields", function () {
            var obj = {
                id: undefined
            };
            return V.object({
                "id": V.integer,
                "name": V.string,
                "age": V.float,
            }).validate(obj).then(function (res) {
                chai_1.assert.deepEqual(res, {
                    id: 0,
                    name: "",
                    age: 0
                });
            });
        });
        it("should create missing fields with wrong input", function () {
            return V.object({
                "id": V.integer,
                "name": V.string,
                "age": V.float,
            }).validate("foo").then(function (res) {
                chai_1.assert.deepEqual(res, {
                    id: 0,
                    name: "",
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
            return V.object({
                "name": V.required(V.string),
                "address": V.object({
                    "street": V.string,
                    "city": V.required(V.string)
                })
            }).validatePath("address", obj, {
                "street": "Backalley 321",
                "city": "Otherville"
            }).then(function (res) {
                chai_1.assert.deepEqual(res, {
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
            return V.object({
                "name": V.required(V.string),
                "address": V.object({
                    "street": V.required(V.string),
                    "city": V.required(V.string)
                })
            }).validatePath("address.city", obj, "Otherville").then(function (res) {
                chai_1.assert.deepEqual(res, {
                    name: "John Doe",
                    address: {
                        "street": "Homestreet 123",
                        "city": "Otherville"
                    }
                });
            });
        });
        it("should work with a dot notation even when zero is key", function () {
            return V.object({ "0": V.string })
                .validatePath("0", { "0": "Okay" }, "Something else").then(function (res) {
                chai_1.assert.deepEqual(res, { "0": "Something else" });
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
            return V.object({
                "name": V.required(V.string),
                "address": V.object({
                    "street": V.required(V.string),
                    "city": V.required(V.string)
                })
            }).validatePath("address", obj, {
                "street": "",
                "city": ""
            }).catch(function (errs) {
                chai_1.assert.deepEqual(errs, {
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
            return V.object({
                "aaa": V.object({
                    "bbb": V.object({
                        "ccc": V.required(V.integer)
                    })
                })
            }).validatePath("aaa.bbb.ccc", obj, 0).catch(function (errs) {
                chai_1.assert.deepEqual(errs, {
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
            return V.object({
                "aaa": V.object({
                    "bbb": V.object({
                        "ccc": V.required(V.integer)
                    })
                })
            }).validate(obj).catch(function (errs) {
                chai_1.assert.deepEqual(errs, {
                    "aaa.bbb.ccc": ["This field is required"],
                });
            });
        });
        it("should create nested fields with wrong input", function () {
            return V.object({
                "id": V.integer,
                "name": V.string,
                "address": V.object({
                    "city": V.string
                }),
            }).validate("foo").then(function (res) {
                chai_1.assert.deepEqual(res, {
                    id: 0,
                    name: "",
                    address: {
                        city: ""
                    }
                });
            });
        });
        it("should create nested fields with wrong input", function () {
            return V.object({
                "id": V.integer,
                "name": V.string,
                "address": V.object({
                    "city": V.string
                }),
            }).validate({
                "id": 5,
                "name": "Test",
                "address": ""
            }).then(function (res) {
                chai_1.assert.deepEqual(res, {
                    id: 5,
                    name: "Test",
                    address: {
                        city: ""
                    }
                });
            });
        });
        it("should notify progress by dot notation", function () {
            var notifies = [];
            return V.object({
                "some": V.object({
                    "file": function () {
                        var p = Q.defer();
                        setTimeout(function () {
                            p.notify("40%");
                        }, 10);
                        setTimeout(function () {
                            p.notify("70%");
                        }, 20);
                        setTimeout(function () {
                            p.resolve("final");
                        }, 30);
                        return p.promise;
                    }
                })
            }).validate({
                "some": {
                    'file': "upload.zip"
                }
            }).progress(function (s) {
                notifies.push(s["some.file"]);
            }).then(function () {
                chai_1.assert.deepEqual(notifies, ["40%", "70%"]);
            });
        });
    });
    describe("Array validation", function () {
        it("of simple functions should work", function () {
            var arr = ["first", "second"];
            return V.array(V.string).validate(arr).then(function (val) {
                chai_1.assert.deepEqual(val, arr);
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
            return V.array(V.object({
                "name": function (i) { return V.required(V.string(i)); },
                "age": V.float
            })).validate(objs).then(function (val) {
                chai_1.assert.deepEqual(val, objs);
            });
        });
        it("should create missing fields with wrong input", function () {
            return V.array(V.string).validate("foo")
                .then(function (res) {
                chai_1.assert.deepEqual(res, []);
            });
        });
        it("should notify progress by path", function () {
            var notifies = [];
            return V.array(function () {
                var p = Q.defer();
                setTimeout(function () {
                    p.notify("40%");
                }, 10);
                setTimeout(function () {
                    p.notify("70%");
                }, 20);
                setTimeout(function () {
                    p.resolve("final");
                }, 30);
                return p.promise;
            })
                .validate(["test"]).progress(function (s) {
                notifies.push(s["[0]"]);
            }).then(function () {
                chai_1.assert.deepEqual(notifies, ["40%", "70%"]);
            });
        });
        it("of simple functios should raise errors", function () {
            var arr = ["", ""];
            return V.array(function (i) { return V.required(V.string(i)); }).validate(arr).catch(function (errs) {
                chai_1.assert.deepEqual(errs, {
                    "[0]": ["This field is required"],
                    "[1]": ["This field is required"]
                });
            });
        });
        it("of arrays should raise errors", function () {
            var arr = [[["", ""]]];
            return V.array(V.array(V.array(function (i) { return V.required(V.string(i)); })))
                .validate(arr).catch(function (errs) {
                chai_1.assert.deepEqual(errs, {
                    "[0][0][0]": ["This field is required"],
                    "[0][0][1]": ["This field is required"]
                });
            });
        });
        it("of arrays should notify progress by path", function () {
            var notifies = [];
            return V.array(V.array(function () {
                var p = Q.defer();
                setTimeout(function () {
                    p.notify("40%");
                }, 10);
                setTimeout(function () {
                    p.notify("70%");
                }, 20);
                setTimeout(function () {
                    p.resolve("final");
                }, 30);
                return p.promise;
            }))
                .validate([["test"]]).progress(function (s) {
                notifies.push(s["[0][0]"]);
            }).then(function () {
                chai_1.assert.deepEqual(notifies, ["40%", "70%"]);
            });
        });
    });
    describe("Mishmash of weird things", function () {
        it("should work", function () {
            var thing = { "aaa": [{ "bbb": [{ "ccc": "thingie" }] }] };
            return V.object({
                "aaa": V.array(V.object({
                    "bbb": V.array(V.object({
                        "ccc": function (i) { return V.required(V.string(i)); }
                    }))
                }))
            }).validate(thing).then(function (val) {
                chai_1.assert.deepEqual(val, thing);
            });
        });
        it("should raise errors", function () {
            var thing = { "aaa": [{ "bbb": [{ "ccc": "" }] }] };
            return V.object({
                "aaa": V.array(V.object({
                    "bbb": V.array(V.object({
                        "ccc": function (i) { return V.required(V.string(i)); }
                    }))
                }))
            }).validate(thing).catch(function (errs) {
                chai_1.assert.deepEqual(errs, {
                    "aaa[0].bbb[0].ccc": ["This field is required"]
                });
            });
        });
        it("should notify progress", function () {
            var thing = { "aaa": [{ "bbb": [{ "ccc": "" }] }] };
            var notifies = [];
            return V.object({
                "aaa": V.array(V.object({
                    "bbb": V.array(V.object({
                        "ccc": function () {
                            var p = Q.defer();
                            setTimeout(function () {
                                p.notify("40%");
                            }, 10);
                            setTimeout(function () {
                                p.notify("70%");
                            }, 20);
                            setTimeout(function () {
                                p.resolve("final");
                            }, 30);
                            return p.promise;
                        }
                    }))
                }))
            })
                .validate(thing).progress(function (s) {
                notifies.push(s["aaa[0].bbb[0].ccc"]);
            }).then(function () {
                chai_1.assert.deepEqual(notifies, ["40%", "70%"]);
            });
        });
    });
});
//# sourceMappingURL=index.js.map