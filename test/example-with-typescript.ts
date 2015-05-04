import * as V from '../index';

interface Address {
    city : string
    street : string
}

var addressValidator = V.object<Address>({
    city : V.required(V.string),
    street : V.string,
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
        street : "Homestreet 123"
    }
}).then((v) => {
    // v is validated object
}).catch((errs) => {
    // errs is object of errors {[name: string] : string[]}
});
