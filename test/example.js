var V = require("../index");
var addressValidator = V.validator({
    city: function (i) { return V.required(V.string(i)); },
    address: V.string,
});
var userValidator = V.validator({
    id: V.integer,
    name: function (i) { return V.required(V.string(i)); },
    email: V.string,
    address: addressValidator
});
userValidator.validate({
    id: 5,
    name: "Jack Doe",
    email: "jack@example.com",
    address: {
        city: "Philly",
        address: "Homestreet 123"
    }
}).then(function (v) {
}).catch(function (errs) {
});
