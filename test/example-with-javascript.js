var V = require("../index");

// Validation definition
var userValidator = V.validator({
    id : V.integer,
    name : V.required(V.string),
    email : V.string,
    address : {
        city : V.required(V.string),
        address : V.string,
    }
});

// Validation is done like this
userValidator.validate({
    id : 5,
    name : "Jack Doe",
    email : "jack@example.com",
    address: {
        city : "Philly",
        address : "Homestreet 123"
    }
}).then(function(v) {
    // v is validated object
}).catch(function(errs) {
    // errs is object of errors {[name: string] : string[]}
});
