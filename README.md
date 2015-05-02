# model-validation

Experimental, API breaks all the time.

Goal is to create an asynchronous model and data validation framework for immutable models. This means that validators must not mutate the model, or any other inputs they get.

## Example with JavaScript
```javascript
var V = require("model-validation");

// Validation definition
var userValidator = V.object({
    id : V.integer,
    name : V.required(V.string),
    email : V.string,
    address : V.object({
        city : V.required(V.string),
        address : V.string,
    })
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
/// <reference path="node_modules/model-validation/index.d.ts" />
import V = require("model-validation");

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

```
