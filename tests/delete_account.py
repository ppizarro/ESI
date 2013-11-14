from urllib2 import Request, urlopen
request = Request("http://emailserviceinterface.apiary.io/accounts/{id}")
request.get_method = lambda: 'DELETE'
response_body = urlopen(request).read()
print response_body
