var assert = require("assert");
var makeAccessor = require("../private").makeAccessor;
var acc1 = makeAccessor();
var obj = {};
var hasOwn = obj.hasOwnProperty;

acc1(obj).foo = 42;
assert.deepEqual(obj, {});
assert.deepEqual(acc1(obj), { foo: 42 });
assert.deepEqual(acc1(acc1(obj)), {});
assert.deepEqual(acc1(obj), { foo: 42 });
assert.deepEqual(Object.keys(acc1(obj)), ["foo"]);
assert.strictEqual(Object.getOwnPropertyNames(acc1(obj)).length, 2);
assert.strictEqual(Object.getOwnPropertyNames(acc1(acc1(obj))).length, 0);
acc1(obj).bar = "baz";
assert.deepEqual(acc1(obj), { foo: 42, bar: "baz" });
delete acc1(obj).foo;
assert.deepEqual(acc1(obj), { bar: "baz" });

try {
    acc1(42);
    throw new Error("threw wrong error");
} catch (err) {
    assert.ok(err);
}

var acc2 = makeAccessor();
assert.notStrictEqual(acc1, acc2);
assert.notStrictEqual(acc1(obj), acc2(obj));
assert.deepEqual(acc2(obj), {});
assert.strictEqual(Object.getOwnPropertyNames(obj).length, 2);
assert.strictEqual(Object.keys(obj).length, 0);
acc2(obj).bar = "asdf";
assert.deepEqual(acc2(obj), { bar: "asdf" });

acc2.forget(obj);
acc2(obj).bar = "asdf";
var oldSecret = acc2(obj);
assert.strictEqual(oldSecret.bar, "asdf");
acc2.forget(obj);
var newSecret = acc2(obj);
assert.notStrictEqual(oldSecret, newSecret);
assert.ok(hasOwn.call(oldSecret, "bar"));
assert.ok(!hasOwn.call(newSecret, "bar"));
newSecret.bar = "zxcv";
assert.strictEqual(oldSecret.bar, "asdf");
assert.strictEqual(acc2(obj).bar, "zxcv");

var context = {};
acc2.autoForget(function() {
    assert.strictEqual(this, context);
    assert.strictEqual(acc2(obj).bar, "zxcv");

    try {
        acc2.forget(obj);
        throw new Error("threw wrong error");
    } catch (err) {
        assert.strictEqual(
            err.message,
            "attempted to forget object owned by another autoForget context"
        );
    }

    acc2(obj).bar = "uiop";

    var s1 = acc2(context);
    s1.name = "context";
    assert.deepEqual(s1, { name: "context" });

    acc2.forget(context);
    var s2 = acc2(context);
    assert.notStrictEqual(s1, s2);
    assert.deepEqual(s2, {});
    acc2(context).xxx = "yyy";
    assert.strictEqual(s2.xxx, "yyy");

    var obj2 = {};
    acc2.forget(obj2); // No-op.

    acc2.autoForget(function() {
        assert.strictEqual(s2, acc2(context));
        assert.strictEqual(acc2(context).xxx, "yyy");

        acc2.forget(obj2); // No-op.
        acc2(obj2).name = "obj2";
    });

    acc2(obj2).xxx = "zzz";
    assert.strictEqual(acc2(obj2).name, void 0);
    assert.strictEqual(acc2(obj2).xxx, "zzz");
    acc2.forget(obj2);
    assert.strictEqual(acc2(obj2).xxx, void 0);

    assert.strictEqual(acc2(context).xxx, "yyy");
}, context);

assert.deepEqual(acc2(context), {});
assert.strictEqual(acc2(obj).bar, "uiop");

var strictAcc = makeAccessor(true);

try {
    strictAcc(context);
    throw new Error("threw wrong error");
} catch (err) {
    assert.strictEqual(
        err.message,
        "attempted to use accessor outside autoForget context"
    );
}

assert.deepEqual(strictAcc.autoForget(function() {
    return strictAcc(context);
}), {});

var green = "\033[32m";
var reset = "\033[0m";
console.log(green + "ALL PASS" + reset);
