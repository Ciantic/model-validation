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
                V.required((i:any,c:any) => {
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
            assert.strictEqual(V.isInteger("4"), 4);
            try {
                V.isInteger(3.14);
                throw "Must not run";
            } catch (f) {
                assert.equal(f, "Must be an integer");
            }
        });
        
        it("isFloat", () => {
            assert.strictEqual(V.isFloat(123.14), 123.14);
            assert.strictEqual(V.isFloat("123.14"), 123.14);
            try {
                V.isFloat("a");
                throw "Must not run";
            } catch (f) {
                assert.equal(f, "Must be an decimal number");
            }
        });
        
        it("operator", () => {
            // Curry with function
            var op = V.operator((input, arg1) => {
                if (input == arg1) {
                    throw "Failure";
                }
                return input;
            }, (i: any, c?: any) => {
                return i + " " + c;
            }, "fail");
            assert.strictEqual(op("test", "context"), "test context");
            
            // Curried with no value
            var op = V.operator((input, arg1) => {
                if (input == arg1) {
                    throw "Failure";
                }
                return input;
            }, undefined, "fail");
            assert.strictEqual(op("test"), "test");
            try {
                op("fail")
                throw "Must not run"
            } catch (e) {
                assert.equal(e, "Failure");
            }
            
            // Direct value
            var op = V.operator((input, arg1) => {
                return input;
            }, "test");
            assert.strictEqual(op, "test");
        });
        
        it("min", () => {
            assert.strictEqual(V.min(5, 5), 5); // Inclusive
            assert.strictEqual(V.min(5, 100), 100);
            try {
                V.min(5, 4);
                throw "Must not run"
            } catch (e) {
                assert.equal(e, "Value must be equal or greater than: 5");
            }
        });
        
        it("minExclusive", () => {
            assert.strictEqual(V.minExclusive(5, 100), 100);
            try {
                V.minExclusive(5, 5); // Exclusive
                throw "Must not run"
            } catch (e) {
                assert.equal(e, "Value must be greater than: 5");
            }
            try {
                V.minExclusive(5, 4);
                throw "Must not run"
            } catch (e) {
                assert.equal(e, "Value must be greater than: 5");
            }
        });
        
        it("max", () => {
            assert.strictEqual(V.max(5, 5), 5); // Inclusive
            assert.strictEqual(V.max(100, 5), 5);
            try {
                V.max(5, 10);
                throw "Must not run"
            } catch (e) {
                assert.equal(e, "Value must be equal or less than: 5");
            }
        });
        
        it("maxExclusive", () => {
            assert.strictEqual(V.maxExclusive(5, 4), 4);
            try {
                V.maxExclusive(5, 5); // Exclusive
                throw "Must not run"
            } catch (e) {
                assert.equal(e, "Value must be less than: 5");
            }
            try {
                V.maxExclusive(5, 100);
                throw "Must not run"
            } catch (e) {
                assert.equal(e, "Value must be less than: 5");
            }
        });
        
        it("between", () => {
            assert.strictEqual(V.between(50, 100, 50), 50); // Inclusive
            assert.strictEqual(V.between(50, 100, 100), 100); // Inclusive
            assert.strictEqual(V.between(50, 100, 70), 70);
            
            try {
                V.between(50, 100, 10);
                throw "Must not run"
            } catch (e) {
                assert.equal(e, "Value must be between 50 and 100");
            }
            try {
                V.between(50, 100, 150);
                throw "Must not run"
            } catch (e) {
                assert.equal(e, "Value must be between 50 and 100");
            }
        });
        
        it("betweenExclusive", () => {
            assert.strictEqual(V.betweenExclusive(50, 100, 70), 70);
            try {
                V.betweenExclusive(50, 100, 50); // Exclusive
                throw "Must not run"
            } catch (e) {
                assert.equal(e, "Value must exclusively be between 50 and 100");
            }
            try {
                V.betweenExclusive(50, 100, 100); // Exclusive
                throw "Must not run"
            } catch (e) {
                assert.equal(e, "Value must exclusively be between 50 and 100");
            }
            try {
                V.betweenExclusive(50, 100, 10);
                throw "Must not run"
            } catch (e) {
                assert.equal(e, "Value must exclusively be between 50 and 100");
            }
        });
    });
    describe("Function validation", function() {
        it("should work with deferred result", () => {
            return new V.Validators.FuncValidator((i:any) => {
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
            return new V.Validators.FuncValidator((i:any) => {
                var deferred = Q.defer();
                setTimeout(function () {
                    deferred.reject("fail");
                }, 10);
                return deferred.promise;
            }).validate("").catch((res) => {
                assert.deepEqual(res, {"": ["fail"]});
            });
        });
        
        it("should progress with deferred", () => {
            var notifies: string[] = [];
            
            return new V.Validators.FuncValidator((i:any) => {
                var p = Q.defer();
                setTimeout(() => {
                    p.notify("40%");
                }, 10);
                setTimeout(() => {
                    p.notify("70%");
                }, 20);
                setTimeout(() => {
                    p.resolve("final");
                }, 30);
                return p.promise;
            }).validate("")
            .progress(v => {
                notifies.push(v[""]);
            })
            .then((res) => {
                assert.deepEqual(notifies, ["40%", "70%"]);
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
                "price": (i: any, o: any) => { if (o.product != "pizza") throw o.product + " is not a pizza"; return 7.95; },
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
                "price": (i: any, o: any) => { if (o.product != "pizza") throw o.product + " is not a pizza"; return 7.95; },
            }).validate({
                "product" : "Orange",
                "price" : 0
            }).catch((errs) => {
                assert.deepEqual(errs, {"price":["Orange is not a pizza"]});
            });
        });
        
        it("should notify progress by path", () => {
            var notifies: string[] = [];
            return V.object({
                "file": () => {
                    var p = Q.defer();
                    setTimeout(() => {
                        p.notify("40%");
                    }, 10);
                    setTimeout(() => {
                        p.notify("70%");
                    }, 20);
                    setTimeout(() => {
                        p.resolve("final");
                    }, 30);
                    return p.promise;
                }
            }).validate({
                "file" : "upload.zip"
            }).progress((s) => {
                notifies.push(s["file"]);
            }).then(() => {
                //def.resolve("");
                assert.deepEqual(notifies, ["40%", "70%"]);
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
            var obj: any = {
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
        
        it("should create missing fields with wrong input", () => {
            return V.object({
                    "id": V.integer,
                    "name": V.string,
                    "age": V.float,
                }).validate("foo").then((res) => {
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
        
        it("should create nested fields with wrong input", () => {
            return V.object({
                    "id": V.integer,
                    "name": V.string,
                    "address": V.object({
                        "city" : V.string
                    }),
                }).validate("foo").then((res) => {
                    assert.deepEqual(res, {
                        id : 0,
                        name : "",
                        address : {
                            city : ""
                        }
                    });
                });
        });
        
        it("should create nested fields with wrong input", () => {
            return V.object({
                    "id": V.integer,
                    "name": V.string,
                    "address": V.object({
                        "city" : V.string
                    }),
                }).validate({
                    "id" : 5,
                    "name" : "Test",
                    "address" : ""
                }).then((res) => {
                    assert.deepEqual(res, {
                        id : 5,
                        name : "Test",
                        address : {
                            city : ""
                        }
                    });
                });
        });
        
        it("should notify progress by dot notation", () => {
            var notifies: string[] = [];
            return V.object({
                "some" : V.object({
                    "file": () => {
                        var p = Q.defer();
                        setTimeout(() => {
                            p.notify("40%");
                        }, 10);
                        setTimeout(() => {
                            p.notify("70%");
                        }, 20);
                        setTimeout(() => {
                            p.resolve("final");
                        }, 30);
                        return p.promise;
                    }
                })
            }).validate({
                "some" : {
                    'file' : "upload.zip"
                }
            }).progress((s) => {
                notifies.push(s["some.file"]);
            }).then(() => {
                assert.deepEqual(notifies, ["40%", "70%"]);
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
                "name": (i: any) => V.required(V.string(i)),
                "age": V.float
            })).validate(objs).then((val) => {
                assert.deepEqual(val, objs);
            });
        });
        
        it("should create missing fields with wrong input", () => {
            return V.array(V.string).validate(<any> "foo")
                .then((res) => {
                    assert.deepEqual(res, []);
                });
        });
        
        it("should notify progress by path", () => {
            var notifies: string[] = [];
            return V.array(() => {
                    var p = Q.defer();
                    setTimeout(() => {
                        p.notify("40%");
                    }, 10);
                    setTimeout(() => {
                        p.notify("70%");
                    }, 20);
                    setTimeout(() => {
                        p.resolve("final");
                    }, 30);
                    return p.promise;
                })
            .validate(["test"]).progress((s) => {
                notifies.push(s["[0]"]);
            }).then(() => {
                assert.deepEqual(notifies, ["40%", "70%"]);
            });
        });
        
        it("of simple functios should raise errors", function() {
            var arr = ["", ""];

            return V.array((i: any) => V.required(V.string(i))).validate(arr).catch((errs) => {
                assert.deepEqual(errs, {
                    "[0]" : ["This field is required"],
                    "[1]" : ["This field is required"]
                });
            });
        });
        
        it("of arrays should raise errors", function() {
            var arr = [[["", ""]]];

            return V.array(V.array(V.array((i: any) => V.required(V.string(i)))))
                .validate(arr).catch((errs) => {
                    assert.deepEqual(errs, {
                        "[0][0][0]" : ["This field is required"],
                        "[0][0][1]" : ["This field is required"]
                    });
                });
        });
        
        it("of arrays should notify progress by path", () => {
            var notifies: string[] = [];
            return V.array(V.array(() => {
                    var p = Q.defer();
                    setTimeout(() => {
                        p.notify("40%");
                    }, 10);
                    setTimeout(() => {
                        p.notify("70%");
                    }, 20);
                    setTimeout(() => {
                        p.resolve("final");
                    }, 30);
                    return p.promise;
                }))
            .validate([["test"]]).progress((s) => {
                notifies.push(s["[0][0]"]);
            }).then(() => {
                assert.deepEqual(notifies, ["40%", "70%"]);
            });
        });
    })
    
    describe("Mishmash of weird things", function() {
        it("should work", function() {
            var thing = {"aaa" : [{"bbb" : [{"ccc" : "thingie"}]}]};

            return  V.object({
                "aaa" : V.array(V.object({
                    "bbb" : V.array(V.object({
                        "ccc" : (i: any) => V.required(V.string(i))
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
                        "ccc" : (i: any) => V.required(V.string(i))
                    }))
                }))
            }).validate(thing).catch((errs) => {
                assert.deepEqual(errs, {
                    "aaa[0].bbb[0].ccc" : ["This field is required"]
                });
            });
        });
        
        it("should notify progress", () => {
            var thing = {"aaa" : [{"bbb" : [{"ccc" : ""}]}]};
            var notifies: string[] = [];
            
            return V.object({
                "aaa" : V.array(V.object({
                    "bbb" : V.array(V.object({
                        "ccc" : () => {
                            var p = Q.defer();
                            setTimeout(() => {
                                p.notify("40%");
                            }, 10);
                            setTimeout(() => {
                                p.notify("70%");
                            }, 20);
                            setTimeout(() => {
                                p.resolve("final");
                            }, 30);
                            return p.promise;
                        }
                    }))
                }))
            })
            .validate(thing).progress((s) => {
                notifies.push(s["aaa[0].bbb[0].ccc"]);
            }).then(() => {
                assert.deepEqual(notifies, ["40%", "70%"]);
            });
        });
    })
});
