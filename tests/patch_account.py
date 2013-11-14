
from urllib2 import Request, urlopen
from json import dumps
values = dumps({
    "outgoing_server":
    {
        "password": "1234"
    }
})
headers = {"Content-Type": "application/json"}
request = Request("http://emailserviceinterface.apiary.io/accounts/{id}", data=values, headers=headers)
request.get_method = lambda: 'PATCH'
response_body = urlopen(request).read()
print response_body
