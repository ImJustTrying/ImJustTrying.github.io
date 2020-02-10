<?php
require("calculate.php");

function test(string $name, callable $f) {
  echo $name . " ... ";
  try {
    $f();
  } catch (Exception $e) {
    echo "Failed!\n" . $e->getMessage() . "\n";
    return;
  }
  echo "Succeeded!\n";
}

// read_number tests
test("read_number empty string", function() {
  $token = read_number("", 0);
  assert($token->type === NONE);
});

test("read_number bad input", function() {
  $token = read_number("bad input", 0);
  assert($token->type === NONE);

  $token = read_number("0000.", 0);
  assert($token->type === NONE);

  $token = read_number("-.", 0);
  assert($token->type === NONE);
});

test("read_number naturals", function() {
  $token = read_number("0", 0);
  assert($token->type === NUMBER);
  assert($token->token === "0");

  $token = read_number("00000", 0);
  assert($token->type === NUMBER);
  assert($token->token === "0");

  $token = read_number("123456789", 0);
  assert($token->type === NUMBER);
  assert($token->token === "123456789");
});

test("read_number negative integers", function() {
  $token = read_number("-0", 0);
  assert($token->type === NUMBER);
  assert($token->token === "0");

  $token = read_number("-123", 0);
  assert($token->type === NUMBER);
  assert($token->token === "-123");
});

test("read_number reals", function() {
  $token = read_number("-0.00", 0);
  assert($token->type === NUMBER);
  assert($token->token === "0");

  $token = read_number("-1.23", 0);
  assert($token->type === NUMBER);
  assert($token->token === "-1.23");
});


// tokenize tests
test("tokenize empty string", function() {
  $tokens = tokenize("");
  assert(count($tokens) === 0);
});

test("tokenize numbers", function() {
  $tokens = tokenize("1.21");
  assert(count($tokens) === 1);
  assert($tokens[0]->type === NUMBER);
  assert($tokens[0]->token === "1.21");

  $tokens = tokenize("-.24 3.14");
  assert(count($tokens) === 2);
  assert($tokens[0]->type === NUMBER);
  assert($tokens[1]->type === NUMBER);
  assert($tokens[0]->token === "-.24");
  assert($tokens[1]->token === "3.14");
});

test("tokenize operations", function() {
  $tokens = tokenize("+");
  assert(count($tokens) === 1);
  assert($tokens[0]->type === OPERATOR);
  assert($tokens[0]->token === "+");

  $tokens = tokenize("root log arcsin cos");
  assert(count($tokens) === 4);
  for($i = 0; $i < count($tokens); $i += 1) { assert($tokens[$i]->type === OPERATOR); }
  assert($tokens[2]->token === "arcsin");
  assert($tokens[3]->token === "cos");
});

test("tokenize mixed numbers and operators", function() {
  $tokens = tokenize("1 + 2");
  assert(count($tokens) === 3);
  assert($tokens[0]->type == NUMBER);
  assert($tokens[0]->token === "1");
  assert($tokens[1]->type == OPERATOR);
  assert($tokens[1]->token === "+");
  assert($tokens[2]->type == NUMBER);
  assert($tokens[2]->token === "2");
});
?>
