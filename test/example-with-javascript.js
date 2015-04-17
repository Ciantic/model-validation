var V = require("../index");

// Validation definition
var userValidator = V.validator({
    id : V.integer,
    name : function(i) { return V.required(V.string(i)); },
    email : V.string,
    address : {
        city : function(i) { return V.required(V.string(i)); },
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
