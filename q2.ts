
const counter = (count: number = 0): [() => number, () => void] => [() => count, () => { count += 1 }];

const [getA, nextA] = counter(1);
console.log(getA()); // 1
nextA();
console.log(getA()); // 2
const [getB, nextB] = counter(10);
nextB();
console.log(getA()); // 2
console.log(getB()); // 11
nextA();
console.log(getA()); // 3
console.log(getB()); // 11

// How to use a test suite if we can only submit one file per question?