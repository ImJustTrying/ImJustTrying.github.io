<?php
/*
  Kevin Vicente
  October 2019

  This is a program that will interface with a browser frontend via ajax. The program takes in a
  mathematical expression and evaluates it. We do so in the following manner:

  1) First, take our string and tokenize it -- i.e. seperate it into seperate pieces. Our tokens
  will have a type (Value or Operator) and a string representing the token (e.g. '+', '2').

  2) Next, we transform our tokenized string from an infix expression (where operators are written
  between operands -- e.g. "2 + 3" or "5 ^ 8") to a postfix expression (where operators are written
  after operands -- e.g. "2 3 +" or "5 8 ^").
 
  3) Afterwards, we transform the postfix expression into an expression tree, which we can use to
  evaluate our expression easily and reliably. The following are examples of expression trees.
     +                  *
    / \               /   \
   2   3             +      -
                    / \    / \
                   24 82  1   8

*/

declare(strict_types=1);
//header("Content-Type: application/json; charset=UTF-8");
define("NONE", 0);
define("NUMBER", 1);
define("OPERATOR", 2);

// First, declare classes
class JSON {
  public $value;
  public $error = "";
  public $debug = "";
}

class Token {
  public $token;
  public $type;
  public $precedence;
  public $arity;

  function __construct(string $tok_str, int $tok_type) {
    $this->type = $tok_type;
    $this->token = $tok_str;
  }

  function __toString() { return $this->token; }
}

class Stack {
  private $elems = array();

  function push($element) { array_push($this->elems, $element); }
  function pop() { return array_pop($this->elems); }
  function size(): int { return count($this->elems); }
  function peek() {
    if (count($this->elems) > 0) {
      return $this->elems[count($this->elems) - 1];
    } else {
      return null;
    }
  }
}

class ExpTree {
  public $token;
  public $children = array();

  function __construct($token) { $this->token = $token; }
}

// We read a number from a given string, starting at a given index. We want to parse any real
// number, optionally starting with a negative symbol, and including a decimal point: [-]0-9[.0-9]
function read_number(string $s, int $start): Token {
  $dot_found = false;
  $nonzero = false;
  $i = 0;
  if ($start >= strlen($s) || strlen($s) == 0) { return new Token("None", NONE); }

  // loop through, reading each character and checking if they are numeric, or if it is a "."
  // also keep in mind if we have seen the "." already
  for ($i = $start; $i < strlen($s); $i += 1) {
    // Only if we find a character that is numeric and not zero, we can say the number is nonzero
    if (!$nonzero && is_numeric($s[$i]) && $s[$i] != "0") { $nonzero = true; }
    if ($s[$i] === "-" && $i !== $start) { return new Token("None", NONE); }
    if ($s[$i] === ".") {
      if ($dot_found) { return new Token("None", NONE); }
      else { $dot_found = true; continue; }
    }

    // If we find an invalid character, we just stop parsing there and return whatever we found
    if (!is_numeric($s[$i]) && $s[$i] != "." && $s[$i] != "-") {
      return new Token(substr($s, $start, ($i - $start)), NUMBER);
    }
  }

  // If dot is the last character, it is not a valid number
  if ($s[$i-1] == ".") { return new Token("None", NONE); }

  $token = null;
  // If the number is just zero, return a single character string of zero
  if (!$nonzero) { $token = new Token("0", NUMBER); }
  else { $token = new Token(substr($s, $start, ($i - $start)), NUMBER); }
  $token->precedence = 0; $token->arity = 0;
  return $token;
}

function tokenize (string $exp): array {
  $tokens = array();
  for ($i = 0; $i < strlen($exp); $i += 1) {
    if ($exp[$i] == " ") { continue; }

    // If it is a numeric value, parse with read_number and continue
    if (is_numeric($exp[$i]) || $exp[$i] === "." || $exp[$i] === "-") {
      $numeric_token = read_number($exp, $i);
      array_push($tokens, $numeric_token);
      $i += strlen($numeric_token->token);
      if (end($tokens)->type == NONE) { throw new Exception("Invalid syntax at " . $i); }
    }

    else {
      // We need to check for each type of operator, which we can't do autonomously so we use a
      // switch to check all of them manually
      $c = $exp[$i];
      $t = new Token("", OPERATOR);

      switch($c) {
        case "+": // addition
          $t->token = $c; $t->precedence = 0; $t->arity = 2; break;
        case "*": // multiplication
        case "/": // division
        case "%": // modulo
          $t->token = $c; $t->precedence = 1; $t->arity = 2; break;
        case "^": // exponent
          $t->token = $c; $t->precedence = 2; $t->arity = 2; break;
        case "r": // root
          $t->token = substr($exp, $i, 4); $i += 3; $t->precedence = 2; $t->arity = 2; break;
        case "l": // logarithm
          $t->token = substr($exp, $i, 3); $i += 2; $t->precedence = 2; $t->arity = 2; break;
        case "s": // sine
        case "c": // cosine
        case "t": // tangent
          $t->token = substr($exp, $i, 3); $i += 2; $t->precedence = 2; $t->arity = 1; break;
        case "a": // inverse trigonometric functions
          $t->token = substr($exp, $i, 6); $i += 5; $t->precedence = 2; $t->arity = 1; break;
        case ")":
        case "(":
          $t->token = $c; $t->precendence = 3; $t->arity = 0; break;
        default: throw new Exception("Invalid operator at " . $i);
      }
      array_push($tokens, $t);
    }
  }
  return $tokens;
}

// Check for function operators (e.g. sin, cos, root, log, tan)
function is_function($token) {
  return $token !== null && $token->type === OPERATOR && strlen($token->token) > 1;
}

// An implementation of the shunting-yard algorithm
function infix_to_postfix(array $tokens) {
  $stack = new Stack();
  $postfix = array();

  for ($i = 0; $i < count($tokens); $i += 1) {
    $token = $tokens[$i];
    if ($token->type === NONE) { break; }
    if ($token->type === NUMBER) { array_push($postfix, $token); }
    else if ($token->type === OPERATOR) {
      if ($token->token === "(" || is_function($token)) { $stack->push($token); }

      else {
        $top = $stack->peek();
        // We assume our operators are all left-associative
        while($top !== null && $top->type === OPERATOR
              && $top->precedence >= $token->precedence 
              || is_function($top)
              && $top->token !== "(") {
          array_push($postfix, $stack->pop());
          $top = $stack->peek();
        }
        $stack->push($token);

        if ($token->token === ")") {
          $top = $stack->peek();
          while($stack->size() >= 0 && $top->token !== "(") {
            array_push($postfix, $stack->pop());
            $top = $stack->peek();
          }
          if ($stack->size() === 0) {
            throw new Exception("Mismatched parenthesis at token " . $i);
          }
          if ($top->token === "(") { $stack->pop(); }
        }
      }
    }
  }

  // If there are operators left, pop them all and 
  while($stack->size() > 0) {
    $top = $stack->pop();
    if ($top->token === "(" || $top->token === ")") {
      throw new Exception("Mismatched parenthesis at token " . $i);
    }
    array_push($postfix, $top);
  }
  return $postfix;
}

/*
// Main
$query = "";
$debug = false;
$deg_rad = true; // true for degrees, false for radians
$json_output = new JSON();

if (isset($_SERVER["REQUEST_METHOD"]) && $_SERVER["REQUEST_METHOD"] == "POST") {
  // This will get the body contents of the POST request -- can't use $_POST here (not a form)
  $json_input = json_decode(file_get_contents("php://input"));
  $debug = $json_input->debug;
  if ($debug) { $json_output->debug = json_encode($json_input); }
  $query = $json_input->query;
  $deg_rad = $json_input->deg_rad;
} else if ($argc == 2 || $argc == 3) {
  $query = $argv[1];
  if ($argc == 3) { $debug = boolval($argv[2]); }
} else {
  echo "Invalid number of arguments. Usage: calc expression [debug_flag]\n";
  exit(1);
}

$tokens = tokenize($query);
$postfix = infix_to_postfix($tokens);
$tree = postfix_to_exptree($postfix);
$json_output->value = eval_exptree($tree);

if ($debug) {
  $str = "\nOriginal string: " . $query . "\n";
  $str .= "Tokenized string: " . get_token_string($tokens);
  $str .= "Postfix string: " . get_token_string($postfix);
  $str .= "Post-order traversal: " . get_postorder_string($tree) . "\n";
  $json_output->debug .= $str;
}

echo json_encode($json_output);
*/
?>
