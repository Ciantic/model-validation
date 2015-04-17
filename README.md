# model-validation

Experimental, see test/index.js for specs.

## Example with JavaScript
```javascript
var V = require("model-validation");

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
```

## Example with TypeScript and composition

```typescript
import V = require("model-validation");

interface Address {
    city : string
    address : string
}

var addressValidator = V.validator<Address>({
    city : (i) => V.required(V.string(i)),
    address : V.string,
});

interface User {
    id: number
    name: string
    email: string
    address: Address
}

var userValidator = V.validator<User>({
    id : V.integer,
    name : (i) => V.required(V.string(i)),
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
```
