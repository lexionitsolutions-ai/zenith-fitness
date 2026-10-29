"""Download original payment brand assets into the local public directory."""
import pathlib
import re
import urllib.request

destination = pathlib.Path('public/brand/payments')
destination.mkdir(parents=True, exist_ok=True)

def fetch(url):
    request = urllib.request.Request(url, headers={'User-Agent': 'Mozilla/5.0'})
    with urllib.request.urlopen(request, timeout=30) as response:
        return response.read()

google_url = 'https://www.gstatic.com/instantbuy/svg/light_gpay.svg'
(destination / 'google-pay.svg').write_bytes(fetch(google_url))

phonepe_page = fetch('https://www.phonepe.com/press/').decode('utf-8')
logos = re.findall(r'(?:src|href)=[\"\']([^\"\']*phonepe-logo[^\"\']*\.svg)[\"\']', phonepe_page, re.I)
print('PhonePe assets:', list(dict.fromkeys(logos)))
if not logos:
    raise RuntimeError('Official PhonePe logo was not found.')
from urllib.parse import urljoin
phonepe_url = urljoin('https://www.phonepe.com/', logos[0])
(destination / 'phonepe.svg').write_bytes(fetch(phonepe_url))

paytm_url = 'https://pwebassets.paytm.com/commonwebassets/paytmweb/header/images/logo.svg'
(destination / 'paytm.svg').write_bytes(fetch(paytm_url))
print('Saved payment brand assets.')
