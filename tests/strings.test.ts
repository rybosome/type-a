import { describe, it, expect } from "vitest";

import {
  empty,
  notEmpty,
  whitespace,
  equalTo,
  notEqualTo,
  longerThan,
  shorterThan,
  minLength,
  maxLength,
  length as exactLength,
  lengthBetween,
  validAscii,
  alphanumeric,
  alpha,
  numeric,
  hex,
  base64,
  uuid,
  matching,
  startingWith,
  endingWith,
  containing,
  notContaining,
  slug,
  email,
  url,
  domain,
  ipAddress,
  validJson,
  dateIso,
  lowerCase,
  upperCase,
  titleCase,
  camelCase,
  snakeCase,
  kebabCase,
} from "@src/constraints/string";

describe("String validators", () => {
  it("empty / notEmpty / whitespace", () => {
    expect(empty("")).toBe(true);
    expect(notEmpty("x")).toBe(true);
    expect(whitespace("   \n\t  ")).toBe(true);
  });

  it("equalTo / notEqualTo", () => {
    expect(equalTo("abc")("abc")).toBe(true);
    expect(notEqualTo("abc")("xyz")).toBe(true);
  });

  it("length constraints", () => {
    expect(longerThan(2)("abcd")).toBe(true);
    expect(shorterThan(5)("abcd")).toBe(true);
    expect(minLength(3)("abc")).toBe(true);
    expect(maxLength(4)("abc")).toBe(true);
    expect(exactLength(3)("abc")).toBe(true);
    expect(lengthBetween(2, 4)("abc")).toBe(true);
  });

  it("character set validators", () => {
    expect(validAscii("Hello!")).toBe(true);
    expect(alphanumeric("abc123")).toBe(true);
    expect(alpha("ABCdef")).toBe(true);
    expect(numeric("012345")).toBe(true);
    expect(hex("deadBEEF")).toBe(true);
    expect(base64("SGVsbG8=")).toBe(true);
    expect(uuid("2f1c4fa5-7ef8-4bbc-9bba-4e497c6be995")).toBe(true);
  });

  it("structural validators", () => {
    expect(matching(/^[abc]+$/)("abccba")).toBe(true);
    expect(startingWith("foo")("foobar")).toBe(true);
    expect(endingWith("bar")("foobar")).toBe(true);
    expect(containing("oo")("foobar")).toBe(true);
    expect(notContaining("baz")("foobar")).toBe(true);
    expect(slug("simple-slug-123")).toBe(true);
    expect(email("me@example.com")).toBe(true);
    expect(url("https://example.com")).toBe(true);
    expect(domain("example.com")).toBe(true);
    expect(ipAddress("192.168.0.1")).toBe(true);
    expect(validJson('{"a":1}')).toBe(true);
    expect(dateIso("2023-06-25")).toBe(true);
  });

  it("casing validators", () => {
    expect(lowerCase("hello")).toBe(true);
    expect(upperCase("UPPER")).toBe(true);
    expect(titleCase("Hello World")).toBe(true);
    expect(camelCase("helloWorld")).toBe(true);
    expect(snakeCase("hello_world")).toBe(true);
    expect(kebabCase("hello-world")).toBe(true);
  });
});
