"use strict";

var defProp = Object.defineProperty || function(obj, name, desc) {
    // Normal property assignment is the best we can do if
    // Object.defineProperty is not available.
    obj[name] = desc.value;
};

// For functions that will be invoked using .call or .apply, we need to
// define those methods on the function objects themselves, rather than
// inheriting them from Function.prototype, so that a malicious or clumsy
// third party cannot interfere with the functionality of this module by
// redefining Function.prototype.call or .apply.
function makeSafeToCall(fun) {
    defProp(fun, "call", { value: fun.call });
    defProp(fun, "apply", { value: fun.apply });
    return fun;
}

var hasOwn = makeSafeToCall(Object.prototype.hasOwnProperty);
var numToStr = makeSafeToCall(Number.prototype.toString);
var strSlice = makeSafeToCall(String.prototype.slice);

var cloner = function(){};
var create = Object.create || function(prototype, properties) {
    cloner.prototype = prototype || null;
    var obj = new cloner;

    // The properties parameter is unused by this module, but I want this
    // shim to be as complete as possible.
    if (properties)
        for (var name in properties)
            if (hasOwn.call(properties, name))
                defProp(obj, name, properties[name]);

    return obj;
};

var rand = Math.random;
var uniqueKeys = create(null);

function makeUniqueKey() {
    // Collisions are highly unlikely, but this module is in the business
    // of making guarantees rather than safe bets.
    do var uniqueKey = strSlice.call(numToStr.call(rand(), 36), 2);
    while (hasOwn.call(uniqueKeys, uniqueKey));
    return uniqueKeys[uniqueKey] = uniqueKey;
}

// External users might find this function useful, but it is not necessary
// for the typical use of this module.
defProp(exports, "makeUniqueKey", {
    value: makeUniqueKey
});

function makeAccessor(requireAutoForget) {
    var secrets = requireAutoForget ? null : create(null);
    var brand = makeUniqueKey();

    function register(object) {
        var key = makeUniqueKey();
        defProp(object, brand, { value: key });
    }

    function accessor(object) {
        assertSecrets();

        if (!hasOwn.call(object, brand))
            register(object);

        var key = object[brand];
        return secrets[key] || (secrets[key] = create(null));
    }

    function assertSecrets() {
        if (!secrets) {
            throw new Error(
                "attempted to use accessor outside autoForget context"
            );
        }
    }

    accessor.forget = function(object) {
        assertSecrets();
        var key = object[brand];
        if (hasOwn.call(secrets, key)) {
            delete secrets[key];
        } else if (key in secrets) {
            throw new Error(
                "attempted to forget object owned by another " +
                "autoForget context"
            );
        }
    };

    accessor.autoForget = function(callback, context) {
        var keptSecrets = secrets;
        secrets = create(keptSecrets);
        try { return callback.call(context || null) }
        finally { secrets = keptSecrets }
    };

    return accessor;
}

defProp(exports, "makeAccessor", {
    value: makeAccessor
});
