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
header("Content-Type: application/json; charset=UTF-8");

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


function tokenize(string $s): array {
  $tokens = array();
  for ($i = 0; $i < strlen($s); $i += 1) {
    if (ctype_space($s[$i])) { continue; }
    // For literal values -- possibly multiple values
    if (is_numeric($s[$i])) {
      $tok = new Token();
      $tok->type = "Value";
      $tok->precedence = 0;
      do { $tok->token .= $s[$i]; $i += 1; } 
      while ($i < strlen($s) && is_numeric(substr($s, $i, 1)) || $s[$i] == ".");
      array_push($tokens, $tok);
      $i -= 1;
    }

    // Executes for operators
    else {
      $tok = new Token();
      $tok->type = "Operator";
      
      switch ($s[$i]) {
        case "+":
        case "-": $tok->precedence = 0; $tok->arity = 2; $tok->token = $s[$i]; break;
        case "*":
        case "/": $tok->precedence = 1; $tok->arity = 2; $tok->token = $s[$i]; break;
        case "m":
          $tok->precedence = 1; $tok->arity = 2; $tok->token = substr($s, $i, 3); $i += 2; break;
        case "^": $tok->precedence = 2; $tok->arity = 2; $tok->token = $s[$i]; break;
        // sine, cosine, tangent, logarithm, factorial, root, and inverse trig
        // functions (i.e. arcsin, arccos, arctan)
        case "s": 
        case "c": 
        case "t":
        case "l":
          $tok->precedence = 2; $tok->arity = 2; $tok->token = substr($s, $i, 3); $i += 2; break;
        case "r":
          $tok->precedence = 2; $tok->arity = 2; $tok->token = substr($s, $i, 4); $i += 3; break;
        case "f":
          $tok->precedence = 2; $tok->arity = 1; $tok->token = substr($s, $i, 4); $i += 3; break;
        case "a":
          $tok->precedence = 2; $tok->arity = 1; $tok->token = substr($s, $i, 6); $i += 5; break;
        case "(":
        case ")": $tok->precedence = 3; $tok->arity = 0; $tok->token = $s[$i]; break;
      }
      array_push($tokens, $tok);
    }
  }
  return $tokens;
}

function infix_to_postfix(array $tokens): array {
  $stack = new Stack();
  $ns = array();

  for ($i = 0; $i < count($tokens); $i += 1) {
    if ($tokens[$i]->type == "Value") { array_push($ns, $tokens[$i]); }
    else {
      // echo "Got operator \"" . $tokens[$i]->token . "\"\n";
      if ($stack->size() > 0 && $stack->peek()->token === "(" && $tokens[$i]->token !== ")"
          || $tokens[$i]->token === "(") { 
        $stack->push($tokens[$i]); //echo $stack->size() . "\n";
      }

      // If we get a right parenthesis, pop all operators off the stack until a left one is
      // encountered and pop it off too
      else if ($tokens[$i]->token === ")") {
        while ($stack->size() > 0 && $stack->peek()->token !== "(") {
          // echo "Right paren (". $stack->size() . "): poping " . $stack->peek()->token . "\n";
          array_push($ns, $stack->pop());
        }
        // if ($stack->size() > 0 && $stack->peek()->token === "(") { echo "got left paren after right\n"; }
        if ($stack->size() > 0) { /*echo "popping " . $stack->peek()->token . "\n";*/ $stack->pop(); }
      }

      // Otherwise, we pop operators off until we encounter one with less precedence
      else {
        while ($stack->size() > 0 && $stack->peek()->precedence >= $tokens[$i]->precedence) {
          if ($stack->peek()->token === "(") { break; }
          array_push($ns, $stack->pop());
        }
        $stack->push($tokens[$i]);
      }
    }
  }

  while ($stack->size() > 0) {
    array_push($ns, $stack->pop());
  }
  return $ns;
}


function postfix_to_exptree(array $postfix): ExpTree {
  $i = 0;
  $stack = new Stack();
  while ($i < count($postfix)) {
    if ($postfix[$i]->type === "Value") { $stack->push(new ExpTree($postfix[$i])); }
    else {
      $new_subtree = new ExpTree($postfix[$i]);
      for ($j = 0; $j < $postfix[$i]->arity; $j += 1) {
        array_push($new_subtree->children, $stack->pop());
      }
      $stack->push($new_subtree);
    }
    $i += 1;
  }
  return $stack->pop();
}

function eval_exptree(ExpTree $tree): float {
  // Evaluate all children then return operator applied to all children
  if ($tree->token->type === "Operator") {
    $children = array();
    for ($i = 0; $i < count($tree->children); $i += 1) {
      if ($tree->children[$i] !== null) {
        array_push($children, eval_exptree($tree->children[$i]));
      }
    }
    return eval_operator($tree->token->token, $children);
  } else {
    return doubleval($tree->token->token);
  }
}

// Helper since there is no built-in factorial function in PHP. Note: susceptible to overflow
function fact(int $n): int { $t = 1; for ($i = 2; $i <= $n; $i += 1) { $t *= $i; } return $t; }
function eval_operator(string $op_token, array $operands): float {
  switch ($op_token) {
    case "+": return $operands[0] + $operands[1];
    case "-": return $operands[0] - $operands[1];
    case "*": return $operands[0] * $operands[1];
    case "/": return $operands[0] / $operands[1];
    case "^": return pow($operands[0], $operands[1]);
    case "mod": return fmod($operands[0], $operands[1]);
    case "sin": return sin($operands[0]);
    case "cos": return cos($operands[0]);
    case "tan": return tan($operands[0]);
    case "arcsin": return asin($operands[0]);
    case "arccos": return acos($operands[0]);
    case "arctan": return atan($operands[0]);
    case "root": return pow($operands[0], 1 / $operands[1]);
    case "log": return log($operands[0]) / log($operands[1]);
    case "fact": return doubleval(fact(intval($operands[0])));
  }
}

// Functions for debugging
function get_postorder_string(ExpTree $root) : string {
  $str = "";
  for ($i = 0; $i < count($root->children); $i += 1) {
    if ($root->children[$i] !== null) { $str .= get_postorder_string($root->children[$i]); }
  }
  return $str . $root->token->token . " ";
}

function get_token_string(array $tokens) : string {
  $s = "";
  for ($i = 0; $i < count($tokens); $i += 1) {
    $s .= $tokens[$i]->token . " ";
  }
  return $s . "\n";
}


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
?>
