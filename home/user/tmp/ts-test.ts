function test<T>() {
  const len = ({} as unknown as T extends string ? {a: 1} : {}).a;
  console.log(len);
}

test<string>();
test<number>();
