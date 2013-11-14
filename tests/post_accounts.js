var request = require("request");
request({
  proxy: process.env.http_proxy,
  url: "http://emailserviceinterface.apiary.io/accounts",
  body: "    {\n        \"name\": \"Teste 1\",\n        \"email_address\": \"teste@example.com\",\n        \"outgoing_server\":\n        {\n            \"server_name\": \"smtp.example.com\",\n            \"username\": \"paulo.pizarro\",\n            \"password\": \"4567\",\n            \"connection_security\": \"SSL/TLS\"\n            \"authentication_method\": \"TLS certificate\"\n        },\n        \"incoming_server\":\n        {\n            \"type\": \"imap\",\n            \"server_name\": \"imap.example.com.br\",\n            \"username\": \"paulo.pizarro\",\n            \"password\": \"4567\",\n            \"connection_security\": \"SSL/TLS\"\n            \"authentication_method\": \"TLS certificate\",\n            \"check_timeout\": \"10\",\n            \"leave_message\": \"true\"\n        }\n    }",
  headers: {"Content-Type": "application/json"},
  method: "POST"
}, function (error, response, body) {
  console.log("Status", response.statusCode);
  console.log("Headers", JSON.stringify(response.headers));
  console.log("Response received", body);
});
