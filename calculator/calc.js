/*
  Kevin Vicente
  November 2019

  We structure the program as follows: define global constants, variables and structures, then
  define procedures including main(), parse_latex(), btn(), etc. This is structured in a procedural
  manner -- i.e. not object-oriented.
*/


// Types of tokens
const INVALID = -1;
const NUMERICAL = 0;
const OPERATOR = 1;
const FUNCTION = 2;
const PARENTHESIS = 3;
const SEPARATOR = 4;

// math_field for mathquill, input_field for html element
let mq_g, math_field_g, input_field_g, output_field_g;
let deg_rad_g = true; // true for degrees, false for radians
let last_calculated_g, memory_g = NaN, rep_type_g;



class Token {
  constructor(string, type, arity, precedence) {
    this.string = string;
    this.type = type;
    this.arity = arity;
    this.precedence = precedence;
  }
}


class AST {
  // token is of type Token, childen of type [Token]
  constructor(token, children) {
    this.token = token;
    this.children = children;
  }
}


class Stack {
  constructor() {
    // We want these to be private so we use closures to hide them
    let data = [];

    this.is_empty = () => data.length === 0;
    this.peek = () => data[data.length - 1];
    this.push = (e) => data.push(e);
    this.pop = () => data.pop();
  }
}
    

// This is for the loading spinner
document.onreadystatechange = () => {
  let state = document.readyState;
  if (state === "interactive") {
    document.querySelector("#container").style.visibility = "hidden";
  } else if (state === "complete") {
    document.querySelector("#loading").style.visibility = "hidden";
    document.querySelector("#container").style.visibility = "visible";
  }
}



function main() {
  input_field_g = document.querySelector("#text_input");
  output_field_g = document.querySelector("#output");
  mq_g = MathQuill.getInterface(2);
  math_field_g = mq_g.MathField(input_field_g);
  const rep_type_selector = document.querySelector("#rep_type");

  input_field_g.addEventListener("keydown", function() {
    const key_pressed = event.which || event.keyCode // cross-browser nonsense
    if (key_pressed === 13) { // if they press enter, evaluate
      btn("=", false);
    }
  });

  rep_type_selector.addEventListener("change", function() {
    rep_type_g = rep_type_selector.value;
    if (last_calculated_g !== undefined) {
      output_field_g.innerHTML = "= " + get_string_representation(last_calculated_g);
    }
  });

  rep_type_g = rep_type_selector.value;
  math_field_g.focus();
}


// Given the representation type selected by the user, return the string representation of the
// passed in value.
function get_string_representation(value) {
  switch(rep_type_g) {
    case "reg": return value.toString();
    case "exp": return value.toExponential();
    case "base2": return value.toString(2);
    case "base8": return value.toString(8);
    case "base16": return value.toString(16);
  }
}


// Called when one of the buttons is pressed
// str is the string to write to the input
// simulate_typing is a boolean saying whether the input should be written directly (false) or if
// it should simulate a person typing the string (true)
function btn(str, simulate_typing) {
  switch (str) {
    case "=": {
      // We need to parse our latex string into an infix string, and send it to the server for
      // evlaulation
      const latex = math_field_g.latex();
      const parsed_input = parse_latex(latex, 0, latex.length);
      console.debug("raw latex: " + latex);
      console.debug("parsed: " + parsed_input);
      if (parsed_input === undefined) {
        output_field_g.innerHTML = "Syntax error";
        break;
      }

      const tokens = tokenize(parsed_input);
      if (tokens === undefined) {
        output_field_g.innerHTML = "Syntax error";
        break;
      }

      const ast = infix_to_ast(tokens);
      console.debug("tokenized:", tokens);
      console.debug("AST: ", ast);

      last_calculated_g = evaluate_ast(ast);
      // Truncate to zero when the floating point error is small enough
      if (last_calculated_g < Number.EPSILON) { value = 0; }
      output_field_g.innerHTML = "= " + get_string_representation(last_calculated_g);

      // Now we need to upadate the history window
      const history_container = document.querySelector("#history_container");
      let latex_history = history_container.getElementsByClassName("history_box_latex");
      let value_history = history_container.getElementsByClassName("history_box_value");
      // Remove the top row
      latex_history[0].remove();
      value_history[0].remove();

      // create new elements, set the classes and the inner HTML, and add them to the container
      let latex_history_element = document.createElement("span");
      latex_history_element.className = "history_box_latex";
      latex_history_element.addEventListener("click", function() {
        math_field_g.write(latex_math_field.latex());
        math_field_g.focus();
      });
      let latex_math_field = mq_g.StaticMath(latex_history_element); // create a static math field
      latex_math_field.latex(latex); // give the field it's latex source to render
      history_container.append(latex_history_element); // append the element to the container
      latex_math_field.reflow(); // recompute dimensions of rendered text

      let value_history_element = document.createElement("span");
      value_history_element.className = "history_box_value";
      value_history_element.innerHTML = last_calculated_g;
      value_history_element.addEventListener("click", function() {
        math_field_g.write(value_history_element.innerHTML);
        math_field_g.focus();
      });
      history_container.append(value_history_element);
    } break;


    case "deg_rad":
      deg_rad_g = !deg_rad_g;
      document.querySelector("#deg_rad").innerHTML = (deg_rad_g) ? "Deg" : "Rad";
      break;
    case "back":
      math_field_g.keystroke("Backspace");
      break;
    case "\\sqrt ":
      math_field_g.typedText(str);
      math_field_g.keystroke("Backspace");
      break;
    case "\\sqrt[y]{}":
      math_field_g.write(str);
      // Note: the W3 standard says the keystroke for the left arrow is ArrowLeft, but mathquill 
      // uses Left -- may change in a future version
      math_field_g.keystroke("Left Left Backspace");
      break;

    case "log_2":
    case "log_e":
    case "log_{10}":
    case "sin^{-1}":
    case "cos^{-1}":
    case "tan^{-1}":
      math_field_g.write(str);
      math_field_g.typedText("(");
      break;
    case "C":
      output_field_g.innerHTML = "= ";
    case "CE":
      math_field_g.select();
      math_field_g.keystroke("Backspace");
      break;

    case "ms":
      memory_g = last_calculated_g;
      if (memory_g != NaN) { output_field_g.innerHTML = "Value \"" + memory_g + "\" stored!"; }
      break;
    case "mr": if (memory_g != NaN) { math_field_g.write(memory_g); } break;
    case "mc": memory_g = NaN; break;
    default:
      if (simulate_typing){ math_field_g.typedText(str); }
      else { math_field_g.write(str); }
  }
  math_field_g.focus();
}


function is_numeric(str) {
  return !isNaN(parseFloat(str)) && isFinite(str);
}


function read_real_number(str, start_index) {
  let num = "";
  let i = start_index;
  let decimal_found = false;
  if (i < str.length && str[i] === "-") { num += "-"; i += 1; }
  while (i < str.length) {
    if (is_numeric(str[i])) { num += str[i]; i += 1; }
    else if (str[i] === "." && !decimal_found) { decimal_found = true; i += 1; num += "."; }
    else { break; }
  }
  return num;
}


// returns index of corresponding bracket to the one at the first index -- note this first bracket
// must be an opening bracket. e.g. find_corresponding_bracket("{{}{}}", 0) = 5
function find_corresponding_bracket(str, first_bracket_index) {
  if (first_bracket_index < 0 || first_bracket_index >= str.length) { return -1; }
  let character = "";
  let balance = 0;
  switch (str[first_bracket_index]) {
    case "{": character = "}"; break;
    case "(": character = ")"; break;
    case "[": character = "]"; break;
    case "<": character = ">"; break;
    default: return -1;
  }

  for (let i = first_bracket_index + 1; i < str.length; i++) {
    if (str[i] === str[first_bracket_index]) { balance += 1; continue; }
    else if (str[i] == character) {
      if (balance > 0) { balance -= 1; continue; }
      else { return i; }
    } 
  }
  return -1;
}



/*
 * This procedure will take in a latex string and build a new string that is a traditional infix
 * expression. For instance given "sin^{-1}\left(180\right)" it will return "arcsin(180)".
 */

function parse_latex(latex, start_index, end_index) {
  let parsed = "";
  let i = start_index;
  let paren_balance = 0;

  while (i < latex.length && i < end_index) {
    if (latex[i] === " ") { i += 1; continue; }
    if (latex[i] === "-" || latex[i] === "." || is_numeric(latex[i])) {
      console.debug("num");
      let n = read_real_number(latex, i);
      if (n === "") { console.debug("reading number"); return undefined; }
      if (n[0] === "-" && is_numeric(parsed[parsed.length - 1]) || parsed[parsed.length - 1] === ")") {
        parsed += "+(" + n + ")";
      } else {
        parsed += n;
      }
      i += n.length;
    }
    
    else if (latex[i] === "e") { parsed += "e"; i += 1; }
    else if (latex[i] === "+") { parsed += "+"; i += 1; }

    else if (latex[i] === "^") {
      parsed += "^";
      if (latex[i+1] !== "{") { parsed += latex[i+1]; i += 2; }
      // Power = "x^{y}"
      else {
        let j = find_corresponding_bracket(latex, i+1);
        let p = parse_latex(latex, i + 2, j);
        parsed += "(" + p + ")";
        i = j + 1;
      }
    }

    // When we find a backslash it can be either pi, the multiplication symbol, root, parentheses, 
    // fractions or modulo
    else if (latex[i] === "\\") {
      if (latex.substring(i+1, i+3) === "pi" ) {
        parsed += "pi";
        i += 3;
      }

      // multiplication = "\cdot"
      else if (latex.substring(i+1, i+5) === "cdot") {
        console.debug("mult");
        parsed += "*";
        i += 5;
      } else if (latex.substring(i+1, i+4) === "mod") {
        console.debug("mod");
        parsed += "mod";
        i += 4;
      } else if (latex.substring(i+1, i+4) === "sqrt") {
        // root = "\sqrt"
        console.debug("square root");
        i += 5;
        let n = "2";
        if (latex[i] === "[") { // If not 2nd root, read the number to get n
          let j = find_corresponding_bracket(latex, i);
          n = parse_latex(latex, i + 1, j);
          console.debug("read n: " + n);
          if (n === undefined || n.length === 0) { console.debug("root n"); return undefined; }
          i = j + 1;
        }
        let j = find_corresponding_bracket(latex, i);
        let r = parse_latex(latex, i + 1, j);
        if (r === undefined || r.length === 0) { console.debug("root r"); return undefined; }
        parsed += "root(" + n + "," + r + ")";
        i = j + 1;
      }

      // Logarithms
      else if (latex.substring(i+1, i+4) === "log") {
        i += 5;
        let j = 0;
        let base = "";
        let val = "";

        if (latex[i] != "{") { base = latex[i]; i += 1}
        else {
          j = find_corresponding_bracket(latex, i);
          base = parse_latex(latex, i + 1, j);
          if (base == undefined) { console.debug("log b"); return undefined; }
          i = j + 1;
        }

        if (latex.substring(i, i+5) === "\\left") {
          i += 5;
          j = find_corresponding_bracket(latex, i);
          if (val == undefined) { console.debug("log v"); return undefined; }
          // Minus 6 since we need to account for the right paren being "\right)" instead of ")"
          val = parse_latex(latex, i + 1, j - 6);
          i = j + 1;
        } else { return undefined; }
        parsed += "log(" + base + "," + val + ")";
      } 

      // For whatever reason, mathquill uses "\left(" and "\right)" instead of just "(" and ")"
      else if (latex.substring(i+1, i+5) === "left") {
        console.debug("left paren");
        parsed += "("; i += 6; paren_balance += 1;
      } else if (latex.substring(i+1, i+6) === "right") {
        console.debug("right paren");
        if (paren_balance === 0) { console.debug("right parens"); return undefined; }
        parsed += ")"; i += 7; paren_balance -= 1;
      }

      // Fractions = "\frac{1}{2}"
      else if (latex.substring(i+1, i+5) === "frac") {
        console.debug("fraction");
        i += 5;
        let j = find_corresponding_bracket(latex, i);
        let n = parse_latex(latex, i + 1, j);
        if (n === undefined || n.length === 0) { console.debug("frac n"); return undefined; }
        i = j + 1;

        j = find_corresponding_bracket(latex, i);
        let d = parse_latex(latex, i + 1, j);
        if (d === undefined || d.length === 0) { console.debug("frac d"); return undefined; }
        i = j + 1;
        parsed += "(" + n + ")/(" + d + ")";
      }

      // Trig functions -- note that we don't read the value in the parentheses, we let our method
      // do that for us (since we already have code to do this in the procedure)
      else if (latex.substring(i+1, i+4) === "sin" || latex.substring(i+1, i+4) === "cos" ||
               latex.substring(i+1, i+4) === "tan") {
        console.debug("trig");
        if (latex.substring(i+4, i+9) === "^{-1}") { // need to write inverse trig function
          parsed += "arc" + latex.substring(i+1, i+4);
          i += 9;
        } else {
          parsed += latex.substring(i+1, i+4);
          i += 4;
        }
      }
    }

    else { console.debug("default"); return undefined; }
  }

  if (paren_balance === 0) {
    const e = "2.718281828459045";
    const pi = "3.141592653589793";
    parsed = parsed.replace(/e/g, e);
    parsed = parsed.replace(/pi/g, pi);
    return parsed;
  } else {
    console.debug("unbalanced parens");
    return undefined;
  }
}


// Takes an infix string and returns a token stream (i.e. list of tokens) of operators and values.
// We assume all of the input is valid.
function tokenize(parsed_latex) {
  let i = 0;
  let stream = [];

  while (i < parsed_latex.length) {
    if (parsed_latex[i] === "." || is_numeric(parsed_latex[i])) {
      let r = read_real_number(parsed_latex, i);
      stream.push(new Token(r, NUMERICAL, 0, 0));
      i += r.length;
    } else {
      let arity = 2;
      let str = "";
      let type = OPERATOR;
      let precedence = 3;

      switch (parsed_latex[i]) {
        case "+":
          str = parsed_latex[i];
          precedence = 0;
          break;
        case "*":
        case "/":
          str = parsed_latex[i];
          precedence = 1;
          break;
        case "^":
          str = parsed_latex[i];
          precedence = 2;
          break;
        case "-":
          arity = 1;
          str = parsed_latex[i];
          break;
        case "r": // root
          str = parsed_latex.substring(i, i+4);
          break;
        case "l": // log
          str = parsed_latex.substring(i, i+3);
          break;
        case "a": // inverse trig
          arity = 1;
          str = parsed_latex.substring(i, i+6);
          break;
        case "s": // trig
        case "c":
        case "t":
          arity = 1;
          str = parsed_latex.substring(i, i+3);
          break;
        case "m": // modulo
          arity = 2;
          str = parsed_latex.substring(i, i+3);
          precedence = 1;
          break;
        case "(":
        case ")":
          str = parsed_latex[i];
          type = PARENTHESIS;
          precedence = -1;
          break;
        case ",":
          str = parsed_latex[i];
          type = SEPARATOR;
          precedence = -1;
          break;
        default:
          return undefined;
      }
      stream.push(new Token(str, type, arity, precedence));
      i += str.length;
    }
  }
  return stream;
}



// Takes a stream of tokens in infix order, and returns an abstract syntax tree.
// This is an implementation of the shunting yard algorithm by Dijkstra.
function infix_to_ast(infix) {
  let operator_stack = new Stack();
  let node_stack = new Stack();

  for (let i = 0; i < infix.length; i += 1) {
    switch(infix[i].type) {
      case NUMERICAL: {
        node_stack.push(new AST(infix[i], []));
      } break;

      case OPERATOR:
      case FUNCTION: {
        while (!operator_stack.is_empty() && operator_stack.peek().precedence > infix[i].precedence) {
          let operands = [];
          const operator = operator_stack.pop();
          for (let _ = 0; _ < operator.arity; _ += 1) {
            // unshift pushes to the front of the array
            operands.unshift(node_stack.pop());
          }
          node_stack.push(new AST(operator, operands));
        }
        operator_stack.push(infix[i]);
      } break;

      case PARENTHESIS: {
        if (infix[i].string === "(") {
          operator_stack.push(infix[i]);
        } else {
          while (!operator_stack.is_empty() && operator_stack.peek().string !== "(") {
            let operands = [];
            const operator = operator_stack.pop();
            for (let _ = 0; _ < operator.arity; _ += 1) {
              operands.unshift(node_stack.pop());
            }
            node_stack.push(new AST(operator, operands));
          }
          operator_stack.pop();
        }
      } break;
    }
  }

  while (!operator_stack.is_empty()) {
    const operator = operator_stack.pop();
    let operands = [];
    for (let _ = 0; _ < operator.arity; _ += 1) {
      operands.unshift(node_stack.pop());
    }
    node_stack.push(new AST(operator, operands));
  }

  return node_stack.pop();
}



function evaluate_ast(ast) {
  if (ast.children.length === 0) {
    return parseFloat(ast.token.string);
  }

  let evaluated = ast.children.map(evaluate_ast);
  switch (ast.token.string) {
    case "+": return evaluated[0] + evaluated[1];
    case "*": return evaluated[0] * evaluated[1];
    case "/": return evaluated[0] / evaluated[1];
    case "^": return Math.pow(evaluated[0], evaluated[1]);
    case "-": return -evaluated[0];
    case "log": return Math.log(evaluated[1]) / Math.log(evaluated[0]);
    case "root": return Math.pow(evaluated[1], 1 / evaluated[0]);
    case "sin": return (deg_rad_g) ? Math.sin(evaluated[0] * Math.PI / 180) : Math.sin(evaluated[0]);
    case "cos": return (deg_rad_g) ? Math.cos(evaluated[0] * Math.PI / 180) : Math.cos(evaluated[0]);
    case "tan": return (deg_rad_g) ? Math.tan(evaluated[0] * Math.PI / 180) : Math.tan(evaluated[0]);
    case "arcsin": return (deg_rad_g) ? Math.asin(evaluated[0] * Math.PI / 180) : Math.asin(evaluated[0]);
    case "arccos": return (deg_rad_g) ? Math.acos(evaluated[0] * Math.PI / 180) : Math.acos(evaluated[0]);
    case "arctan": return (deg_rad_g) ? Math.atan(evaluated[0] * Math.PI / 180) : Math.atan(evaluated[0]);
  }
}
