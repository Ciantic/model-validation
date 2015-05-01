var V = require("../index");
var addressValidator = V.object({
    city: V.required(V.string),
    address: V.string,
});
var userValidator = V.object({
    id: V.integer,
    name: V.required(V.string),
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
//# sourceMappingURL=example-with-typescript.js.map