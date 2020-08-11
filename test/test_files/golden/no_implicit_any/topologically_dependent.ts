let x = '';
// typescript-flag-upgrade automated fix: --noImplicitAny
let y: number | string;

y = 0;
y = x;

foo(x);
bar(y);

// typescript-flag-upgrade automated fix: --noImplicitAny
function foo(z: number | string) {
  z = y;
}

// typescript-flag-upgrade automated fix: --noImplicitAny
function bar(w: number | string) {}
