var request = require("request");
request({
  proxy: process.env.http_proxy,
  url: "http://emailserviceinterface.apiary.io/accounts",
  method: "GET"
}, function (error, response, body) {
  console.log("Status", response.statusCode);
  console.log("Headers", JSON.stringify(response.headers));
  console.log("Response received", body);
});
