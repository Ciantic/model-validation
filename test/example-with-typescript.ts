import V = require("../index");

interface Address {
    city : string
    address : string
}

var addressValidator = V.object<Address>({
    city : V.required(V.string),
    address : V.string,
});

interface User {
    id: number
    name: string
    email: string
    address: Address
}

var userValidator = V.object<User>({
    id : V.integer,
    name : V.required(V.string),
    email : V.string,
    address : addressValidator
});

userValidator.validate({
    id : 5,
    name : "Jack Doe",
    email : "jack@example.com",
    address: {
        city : "Philly",
        address : "Homestreet 123"
    }
}).then((v) => {
    // v is validated object
}).catch((errs) => {
    // errs is object of errors {[name: string] : string[]}
});
