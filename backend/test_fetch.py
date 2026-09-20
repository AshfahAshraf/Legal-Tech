import urllib.request, urllib.error
try:
  res = urllib.request.urlopen('http://127.0.0.1:8000/finance/invoices')
  print(res.read().decode('utf-8'))
except urllib.error.HTTPError as e:
  print('Error', e.code, e.read().decode('utf-8'))
except Exception as e:
  print(e)
