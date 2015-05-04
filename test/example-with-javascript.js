var V = require("../index");

// Validation definition
var userValidator = V.object({
    id : V.integer,
    name : V.required(V.string),
    email : V.string,
    address : V.object({
        city : V.required(V.string),
        street : V.string,
    })
});

// Validation is done like this
userValidator.validate({
    id : 5,
    name : "Jack Doe",
    email : "jack@example.com",
    address: {
        city : "Philly",
        street : "Homestreet 123"
    }
}).then(function(v) {
    // v is validated object
}).catch(function(errs) {
    // errs is object of errors {[name: string] : string[]}
});
