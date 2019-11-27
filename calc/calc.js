/*
  Kevin Vicente
  November 2019

  This is the javascript accompanying the calculator html & css.
  This handles parsing latex into infix strings, sending queries to the server and some mathquill
  stuff. 
*/

// math_field for mathquill, input_field for html element
var mq, math_field, input_field, output_field;
var deg_rad = true; // true for degrees, false for radians


// This is for the loading spinner
document.onreadystatechange = () => {
  let state = document.readyState;
  if (state === "interactive") {
    document.getElementById("container").style.visibility = "hidden";
  } else if (state === "complete") {
    document.getElementById("loading").style.visibility = "hidden";
    document.getElementById("container").style.visibility = "visible";
  }
}

function main() {
  input_field = document.querySelector("#text_input");
  output_field = document.querySelector("#output");
  mq = MathQuill.getInterface(2);
  math_field = mq.MathField(input_field);
}

// Called when one of the buttons is pressed
// str is the string to write to the input
// simulate_typing is a boolean saying whether the input should be written directly (false) or if
// it should simulate a person typing the string (true)

function btn(str, simulate_typing) {
  switch (str) {
    case "=":
      // We need to parse our latex string into an infix string, and send it to the server for
      // evlaulation
      let l = math_field.latex();
      let parsed_input = parse_latex(l, 0, l.length);
      console.log("raw latex: " + l);
      console.log("parsed: " + parsed_input);
      document.getElementById("ajax_loading").style.visibility = "visible";
      query_server(parsed_input);
      break;
    case "deg_rad":
      deg_rad = !deg_rad;
      document.querySelector("#deg_rad").innerHTML = (deg_rad) ? "Deg" : "Rad";
      break;
    case "back":
      math_field.keystroke("Backspace");
      break;
    case "\\sqrt ":
      math_field.typedText(str);
      math_field.keystroke("Backspace");
      break;
    case "\\sqrt[y]{}":
      math_field.write(str);
      // Note: the W3 standard says the keystroke for the left arrow is ArrowLeft, but mathquill 
      // uses Left -- may change in a future version
      math_field.keystroke("Left Left Backspace");
      break;

    case "log_2":
    case "log_e":
    case "log_{10}":
    case "sin^{-1}":
    case "cos^{-1}":
    case "tan^{-1}":
      math_field.write(str);
      math_field.typedText("(");
      break;
    case "C":
      output_field.innerHTML = "= ";
    case "CE":
      math_field.select();
      math_field.keystroke("Backspace");
      break;
    case "ms":
    case "mr":
    case "mc": break;
    default:
      if (simulate_typing){ math_field.typedText(str); }
      else { math_field.write(str); }
  }
  math_field.focus();
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
  if (first_bracket_index < 0 || first_bracket_index >= str.length) { return undefined; }
  let character = "";
  let balance = 0;
  switch (str[first_bracket_index]) {
    case "{": character = "}"; break;
    case "(": character = ")"; break;
    case "[": character = "]"; break;
    case "<": character = ">"; break;
    default: return undefined;
  }

  for (let i = first_bracket_index + 1; i < str.length; i++) {
    if (str[i] === str[first_bracket_index]) { balance += 1; continue; }
    else if (str[i] == character) {
      if (balance > 0) { balance -= 1; continue; }
      else { return i; }
    } 
  }
}



async function query_server(exp) {
  const user_params = { query: exp, deg_rad: deg_rad, debug: true };
  const http_params = {
    method: "POST",
    headers: {
      "Accept": "application/json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify(user_params)
  }

  fetch("calculate.php", http_params)
  .then(response => response.json())
  .then(function(json) {
    console.log(json);
    output_field.innerHTML = "= " + json.value;
    document.getElementById("ajax_loading").style.visibility = "hidden";
  }).catch(function(error) {
    output_field.innerHTML = "Syntax error!";
    console.log(error.toString());
    document.getElementById("ajax_loading").style.visibility = "hidden";
  });
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
    console.log(parsed);
    if (latex[i] === " ") { console.log("space"); i += 1; continue; }
    if (latex[i] === "-" || latex[i] === "." || is_numeric(latex[i])) {
      console.log("num");
      let n = read_real_number(latex, i);
      if (n === "") { console.log("reading number"); return undefined; }
      parsed += n;
      i += n.length;
    } else if (latex[i] === "e") { parsed += "e"; i += 1; }
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
      if (latex[i+1] === "p" ) { parsed += "pi"; i += 3; } // pi
      // multiplication = "\cdot"
      else if (latex[i+1] === "c") { console.log("mult"); parsed += "*"; i += 5; }
      else if (latex[i+1] === "m") { console.log("mod"); parsed += "mod"; i += 4; }
      else if (latex[i+1] === "s" && latex[i+2] === "q") { // root = "\sqrt"
        console.log("square root");
        i += 5;
        let n = "2";
        if (latex[i] === "[") { // If not 2nd root, read the number to get n
          let j = find_corresponding_bracket(latex, i);
          n = parse_latex(latex, i + 1, j);
          console.log("read n: " + n);
          if (n === undefined || n.length === 0) { console.log("root n"); return undefined; }
          i = j + 1;
        }
        let j = find_corresponding_bracket(latex, i);
        let r = parse_latex(latex, i + 1, j);
        if (r === undefined || r.length === 0) { console.log("root r"); return undefined; }
        parsed += "root(" + n + "," + r + ")";
        i = j + 1;
      }

      // For whatever reason, mathquill uses "\left(" and "\right)" instead of just "(" and ")"
      else if (latex[i+1] === "l") {
        console.log("left paren");
        parsed += "("; i += 6; paren_balance += 1;
      } else if (latex[i+1] === "r") {
        console.log("right paren");
        if (paren_balance === 0) { console.log("right parens"); return undefined; }
        parsed += ")"; i += 7; paren_balance -= 1;
      }

      // Fractions = "\frac{1}{2}"
      else if (latex[i+1] === "f") {
        console.log("fraction");
        i += 5;
        let j = find_corresponding_bracket(latex, i);
        let n = parse_latex(latex, i + 1, j);
        if (n === undefined || n.length === 0) { console.log("frac n"); return undefined; }
        i = j + 1;

        j = find_corresponding_bracket(latex, i);
        let d = parse_latex(latex, i + 1, j);
        if (d === undefined || d.length === 0) { console.log("frac d"); return undefined; }
        i = j + 1;
        parsed += "(" + n + ")/(" + d + ")";
      }

      // Trig functions -- note that we don't read the value in the parentheses, we let our method
      // do that for us (since we already have code to do this in the procedure)
      else if (latex[i+1] === "s" || latex[i+1] === "c" || latex[i+1] === "t") {
        console.log("trig");
        if (latex[i+4] === "^") { // need to write inverse trig function
          parsed += "arc" + latex.substring(i+1, i+4);
          i += 9;
        } else {
          parsed += latex.substring(i+1, i+4);
          i += 4;
        }
      }
    }

    else { console.log("default"); return undefined; }
  }

  if (paren_balance === 0) {
    const e = "2.71828183";
    const pi = "3.14159265";
    // replace occurrances of "e" and "pi" with their literal values
    parsed = parsed.replace(/e/g, e);
    parsed = parsed.replace(/pi/g, pi);
    return parsed;
  }
  else { console.log("unbalanced parens"); return undefined; }
}
