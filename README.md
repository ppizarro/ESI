ESI
===

Email Service Interface (ESI) is a email infrastructure service

The API REST documentation is here: [ESI API][1].

[1]: http://docs.emailserviceinterface.apiary.io

# How do I test this?

run `npm test`.

# How do I run this?

First, this has a `package.json`, so you'll need to run `npm install` in the
directory. Once you've done that, to get started _and_ see audit logs on your
terminal, run it like this:

    $ node main.js 2>&1 | bunyan

If you want to see all the built in restify tracing:

    $ node main.js -vv 2>&1 | bunyan

By default, this program writes to a directory in `/tmp`, but you can override
with a `-d` option.  Additionally, by default it does not require
authentication, but you can require that with:

    $ node main.js -u admin -z secret 2>&1 | bunyan

Lastly, re: the `2>&1 | bunyan` bit.  In production, you assuredly would *not*
want to pipe to the [bunyan](https://github.com/trentm/node-bunyan) CLI, but
rather capture the audit records in their raw form, so they would be easy to
post process and perform analytics on.  Like all UNIX programs should, this
example writes "informational" messages to `stderr`, and `audit` records to
stdout.  It's up to you to redirect them as appropriate.


# Some sample curl requests

Let's get the full magilla (i.e., with auth) running:

    $ node main.js -u admin -z secret 2>&1 | bunyan

Also, before we go any further, install the
[json](https://github.com/trentm/json) tool as all the examples below use that.

## List Routes

    $ curl -isS http://127.0.0.1:8080 | json
    HTTP/1.1 200 OK
    Content-Type: application/json
    Content-Length: 127
    Date: Sat, 29 Dec 2012 23:05:05 GMT
    Connection: keep-alive

    [
      "GET     /",
      "POST    /todo",
      "GET     /todo",
      "DELETE  /todo",
      "PUT     /todo/:name",
      "GET     /todo/:name",
      "DELETE  /todo/:name"
    ]


## List Accounts (empty)

    $ curl -isS http://127.0.0.1:8080/accounts | json
    HTTP/1.1 200 OK
    Content-Type: application/json
    Content-Length: 2
    Date: Sat, 29 Dec 2012 23:07:05 GMT
    Connection: keep-alive

    []


## Create Account

    $ curl -isS http://127.0.0.1:8080/accounts -X POST -d name=demo -d task="buy milk"
    HTTP/1.1 201 Created
    Content-Type: application/json
    Content-Length: 8
    Date: Sat, 29 Dec 2012 23:08:04 GMT
    Connection: keep-alive

    buy milk

## List

    $ curl -isS http://127.0.0.1:8080/accounts | json
    HTTP/1.1 200 OK
    Content-Type: application/json
    Content-Length: 8
    Date: Sat, 29 Dec 2012 23:09:45 GMT
    Connection: keep-alive

    [
      "demo"
    ]


## Get Account

Note here our server was setup to use streaming, and we explicitly opted for
JSON:

    $ curl -isS http://127.0.0.1:8080/accounts/demo | json
    HTTP/1.1 200 OK
    Content-Type: application/json
    Date: Sat, 29 Dec 2012 23:11:19 GMT
    Connection: keep-alive
    Transfer-Encoding: chunked

    {
      "name": "demo",
      "task": "buy milk"
    }


## Delete Account

    $ curl -isS -X DELETE http://127.0.0.1:8080/accounts/demo
    HTTP/1.1 204 No Content
    Date: Sat, 29 Dec 2012 23:15:50 GMT
    Connection: keep-alive

## Delete All

    $ curl -isS -X DELETE http://127.0.0.1:8080/accounts
    HTTP/1.1 204 No Content
    Date: Sat, 29 Dec 2012 23:15:50 GMT
    Connection: keep-alive
