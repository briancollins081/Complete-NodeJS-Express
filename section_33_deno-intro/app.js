/* const fs = require("fs").promises;

const text =
  "The mode is a sequence of 3 octal numbers. The first/left-most number specifies the permissions for the owner. The second number specifies the permissions for the group. The last/right-most number specifies the permissions for others. For example, with a mode of 0o764, the owner (7) can read/write/execute, the group (6) can read/write and everyone else (4) can read only.";

fs.writeFile("node-message.txt", text).then(() => {
    console.log("Wrote to file!!!");
});
 */

const http = require("http");

const servere = http.createServer((req, res) => {
  res.end("Hello world from Node app!");
});

servere.listen(8000)