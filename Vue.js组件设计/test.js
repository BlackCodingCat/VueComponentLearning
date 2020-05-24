console.log(['event'].concat({
    a: '111',
    b: '222'
}));

function test(num,options) {
    console.log(num);
    console.log(options.a);
}

// test.apply(this, [5]);
test.apply(this, [5, {a: 'xxxxxxxx', b: 'ssssssss'}]);