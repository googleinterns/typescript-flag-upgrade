let x = '';
// Fix: let y: number | string;
let y;

y = 0;
y = x;

foo(x);
bar(y);

// Fix: function foo(z: number | string) {
function foo(z) {
  z = y;
}

// Fix: function bar(w: string) {}
function bar(w) {}
